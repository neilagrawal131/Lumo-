import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users, UserPlus, Check, X, Loader2, Layers, GraduationCap, Mail } from "lucide-react";
import {
  socialOverview, sendFriendRequest, respondFriendRequest, removeFriend,
} from "@/lib/friends.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/friends")({
  component: FriendsPage,
});

function FriendsPage() {
  const queryClient = useQueryClient();
  const overview = useServerFn(socialOverview);
  const sendReq = useServerFn(sendFriendRequest);
  const respond = useServerFn(respondFriendRequest);
  const remove = useServerFn(removeFriend);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["social"], queryFn: async () => overview({}) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["social"] });

  async function add() {
    if (!email.trim()) return;
    setSending(true);
    try {
      await sendReq({ data: { email: email.trim() } });
      toast.success("Friend request sent!");
      setEmail("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send request");
    } finally {
      setSending(false);
    }
  }

  async function act(id: string, fn: () => Promise<unknown>, msg: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(msg);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const friends = data?.friends ?? [];
  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];
  const shared = data?.sharedWithMe ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold"><Users className="h-7 w-7 text-primary" /> Friends</h1>
        <p className="mt-1 text-muted-foreground">Add friends and share study sets with each other — free for everyone.</p>
      </div>

      {/* Add friend */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold"><UserPlus className="h-5 w-5 text-primary" /> Add a friend</h2>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="friend@email.com" className="pl-9"
            />
          </div>
          <Button variant="hero" onClick={add} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">They need an Etude account with that email.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Incoming requests */}
          {incoming.length > 0 && (
            <Section title={`Friend requests (${incoming.length})`}>
              {incoming.map((u) => (
                <Row key={u.friendshipId} name={u.name} email={u.email}>
                  <Button size="sm" variant="hero" disabled={busy === u.friendshipId} onClick={() => act(u.friendshipId, () => respond({ data: { friendshipId: u.friendshipId, accept: true } }), "Friend added!")}>
                    <Check className="h-4 w-4" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === u.friendshipId} onClick={() => act(u.friendshipId, () => respond({ data: { friendshipId: u.friendshipId, accept: false } }), "Request declined")}>
                    <X className="h-4 w-4" />
                  </Button>
                </Row>
              ))}
            </Section>
          )}

          {/* Shared with me */}
          <Section title="Shared with you" empty={shared.length === 0 ? "No study sets shared with you yet." : undefined}>
            {shared.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium"><Layers className="h-4 w-4 text-primary" /> {s.title}</div>
                  <div className="text-xs text-muted-foreground">from {s.ownerName} · {s.cardCount} cards</div>
                </div>
                <Button asChild size="sm" variant="soft"><Link to="/study/$setId" params={{ setId: s.id }}><GraduationCap className="h-4 w-4" /> Study</Link></Button>
              </div>
            ))}
          </Section>

          {/* Friends list */}
          <Section title={`Your friends (${friends.length})`} empty={friends.length === 0 ? "No friends yet — add someone above!" : undefined}>
            {friends.map((u) => (
              <Row key={u.friendshipId} name={u.name} email={u.email} sub={`Level ${u.level} · ${u.xp} XP`}>
                <Button size="sm" variant="ghost" disabled={busy === u.friendshipId} onClick={() => act(u.friendshipId, () => remove({ data: { friendshipId: u.friendshipId } }), "Friend removed")}>
                  Remove
                </Button>
              </Row>
            ))}
          </Section>

          {/* Outgoing */}
          {outgoing.length > 0 && (
            <Section title="Pending (sent)">
              {outgoing.map((u) => (
                <Row key={u.friendshipId} name={u.name} email={u.email} sub="Waiting to be accepted">
                  <Button size="sm" variant="ghost" disabled={busy === u.friendshipId} onClick={() => act(u.friendshipId, () => remove({ data: { friendshipId: u.friendshipId } }), "Request cancelled")}>
                    Cancel
                  </Button>
                </Row>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty?: string; children?: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {empty ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

function Row({ name, email, sub, children }: { name: string | null; email: string | null; sub?: string; children?: React.ReactNode }) {
  const initial = (name ?? email ?? "?")[0]?.toUpperCase();
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-primary-foreground">{initial}</span>
        <div className="min-w-0">
          <div className="truncate font-medium">{name ?? email ?? "Etude user"}</div>
          <div className="truncate text-xs text-muted-foreground">{sub ?? email}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
