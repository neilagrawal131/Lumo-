import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Share2, Loader2, Check, Users, UserPlus } from "lucide-react";
import { socialOverview, listSetShares, shareSet, unshareSet } from "@/lib/friends.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

type Friend = { id: string; name: string | null; email: string | null };

// Share button + friend-picker dialog. Reuses the existing sharing server
// functions; data only loads when the dialog is opened.
export function ShareSetDialog({ setId, setTitle }: { setId: string; setTitle: string }) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const social = useServerFn(socialOverview);
  const listShares = useServerFn(listSetShares);
  const doShare = useServerFn(shareSet);
  const doUnshare = useServerFn(unshareSet);

  const { data: overview, isLoading: loadingFriends } = useQuery({
    queryKey: ["social"],
    queryFn: async () => social({}),
    enabled: open,
  });

  const { data: sharesData, isLoading: loadingShares, refetch } = useQuery({
    queryKey: ["set-shares", setId],
    queryFn: async () => listShares({ data: { setId } }),
    enabled: open,
  });

  const friends: Friend[] = overview?.friends ?? [];
  const sharedWith = new Set(sharesData?.sharedWith ?? []);

  async function toggle(friendUserId: string, currentlyShared: boolean) {
    setBusyId(friendUserId);
    try {
      if (currentlyShared) await doUnshare({ data: { setId, friendUserId } });
      else await doShare({ data: { setId, friendUserId } });
      await refetch();
      toast.success(currentlyShared ? "Unshared" : "Shared with your friend");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update sharing");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Share with friends">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Share this set
          </DialogTitle>
          <DialogDescription className="line-clamp-1">{setTitle}</DialogDescription>
        </DialogHeader>

        {loadingFriends || loadingShares ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <UserPlus className="mx-auto h-7 w-7 text-muted-foreground opacity-60" />
            <p className="mt-2 text-sm text-muted-foreground">
              Add a friend first, then you can share sets with them.
            </p>
            <Button asChild variant="hero" size="sm" className="mt-4" onClick={() => setOpen(false)}>
              <Link to="/friends">
                <UserPlus className="h-4 w-4" /> Go to Friends
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {friends.map((f) => {
                const isShared = sharedWith.has(f.id);
                return (
                  <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                    <span className="truncate text-sm font-medium">{f.name ?? f.email ?? "Friend"}</span>
                    <Button
                      variant={isShared ? "soft" : "outline"}
                      size="sm"
                      disabled={busyId === f.id}
                      onClick={() => toggle(f.id, isShared)}
                    >
                      {busyId === f.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isShared ? (
                        <><Check className="h-4 w-4" /> Shared</>
                      ) : (
                        "Share"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Friends you share with can study this set — they can't edit or delete it.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
