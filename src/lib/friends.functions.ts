import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string; claims: Record<string, unknown> };

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function areFriends(db: any, a: string, b: string): Promise<boolean> {
  const { data } = await db
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`);
  return !!(data && data.length);
}

// ---------- Overview: friends, requests, and sets shared with me ----------
export const socialOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = (context as Ctx).userId;
    const db = await adminDb();

    const { data: rows } = await db.from("friendships").select("*").or(`requester_id.eq.${me},addressee_id.eq.${me}`);
    const { data: shares } = await db.from("set_shares").select("id, set_id, owner_id").eq("shared_with_id", me);

    const otherIds = new Set<string>();
    for (const r of rows ?? []) otherIds.add(r.requester_id === me ? r.addressee_id : r.requester_id);
    for (const s of shares ?? []) otherIds.add(s.owner_id);

    const ids = [...otherIds, me];
    const { data: authList } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailMap = new Map((authList?.users ?? []).map((u: any) => [u.id, u.email]));
    const { data: profs } = await db.from("profiles").select("id, display_name, xp, level").in("id", ids.length ? ids : [me]);
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const info = (id: string) => ({
      id,
      email: (emailMap.get(id) as string) ?? null,
      name: (profMap.get(id) as any)?.display_name ?? null,
      xp: (profMap.get(id) as any)?.xp ?? 0,
      level: (profMap.get(id) as any)?.level ?? 1,
    });

    const friends: any[] = [];
    const incoming: any[] = [];
    const outgoing: any[] = [];
    for (const r of rows ?? []) {
      const otherId = r.requester_id === me ? r.addressee_id : r.requester_id;
      const u = { friendshipId: r.id, ...info(otherId) };
      if (r.status === "accepted") friends.push(u);
      else if (r.addressee_id === me) incoming.push(u);
      else outgoing.push(u);
    }

    let sharedWithMe: any[] = [];
    const setIds = (shares ?? []).map((s: any) => s.set_id);
    if (setIds.length) {
      const { data: sets } = await db
        .from("flashcard_sets")
        .select("id, title, subject, difficulty, user_id, flashcards(count)")
        .in("id", setIds);
      sharedWithMe = (sets ?? []).map((s: any) => ({
        id: s.id,
        title: s.title,
        subject: s.subject,
        difficulty: s.difficulty,
        ownerName: (profMap.get(s.user_id) as any)?.display_name ?? (emailMap.get(s.user_id) as string) ?? "A friend",
        cardCount: s.flashcards?.[0]?.count ?? 0,
      }));
    }

    return { friends, incoming, outgoing, sharedWithMe };
  });

// ---------- Send a friend request by email ----------
export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = (context as Ctx).userId;
    const db = await adminDb();
    const email = data.email.trim().toLowerCase();

    const { data: authList } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const target = (authList?.users ?? []).find((u: any) => (u.email ?? "").toLowerCase() === email);
    if (!target) throw new Error("No Etude account uses that email.");
    if (target.id === me) throw new Error("You can't add yourself.");

    const { data: existing } = await db
      .from("friendships")
      .select("id, status")
      .or(`and(requester_id.eq.${me},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${me})`);
    if (existing && existing.length) {
      throw new Error(existing[0].status === "accepted" ? "You're already friends." : "There's already a pending request.");
    }

    await db.from("friendships").insert({ requester_id: me, addressee_id: target.id, status: "pending" });
    return { ok: true };
  });

// ---------- Accept / decline a request ----------
export const respondFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ friendshipId: z.string().uuid(), accept: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = (context as Ctx).userId;
    const db = await adminDb();
    const { data: row } = await db.from("friendships").select("id, addressee_id").eq("id", data.friendshipId).maybeSingle();
    if (!row || row.addressee_id !== me) throw new Error("Request not found.");
    if (data.accept) await db.from("friendships").update({ status: "accepted" }).eq("id", data.friendshipId);
    else await db.from("friendships").delete().eq("id", data.friendshipId);
    return { ok: true };
  });

// ---------- Remove a friend / cancel a request ----------
export const removeFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ friendshipId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = (context as Ctx).userId;
    const db = await adminDb();
    const { data: row } = await db.from("friendships").select("id, requester_id, addressee_id").eq("id", data.friendshipId).maybeSingle();
    if (!row || (row.requester_id !== me && row.addressee_id !== me)) throw new Error("Not found.");
    await db.from("friendships").delete().eq("id", data.friendshipId);
    return { ok: true };
  });

// ---------- Share / unshare a set with a friend ----------
export const shareSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ setId: z.string().uuid(), friendUserId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = (context as Ctx).userId;
    const db = await adminDb();
    const { data: set } = await db.from("flashcard_sets").select("id, user_id").eq("id", data.setId).maybeSingle();
    if (!set || set.user_id !== me) throw new Error("Set not found.");
    if (!(await areFriends(db, me, data.friendUserId))) throw new Error("You can only share with friends.");
    await db.from("set_shares").upsert(
      { set_id: data.setId, owner_id: me, shared_with_id: data.friendUserId },
      { onConflict: "set_id,shared_with_id" },
    );
    return { ok: true };
  });

export const unshareSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ setId: z.string().uuid(), friendUserId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = (context as Ctx).userId;
    const db = await adminDb();
    await db.from("set_shares").delete().eq("set_id", data.setId).eq("owner_id", me).eq("shared_with_id", data.friendUserId);
    return { ok: true };
  });

// ---------- Who a set is shared with (for the editor) ----------
export const listSetShares = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ setId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const me = (context as Ctx).userId;
    const db = await adminDb();
    const { data: set } = await db.from("flashcard_sets").select("user_id").eq("id", data.setId).maybeSingle();
    if (!set || set.user_id !== me) throw new Error("Not found.");
    const { data: shares } = await db.from("set_shares").select("shared_with_id").eq("set_id", data.setId);
    return { sharedWith: (shares ?? []).map((s: any) => s.shared_with_id as string) };
  });
