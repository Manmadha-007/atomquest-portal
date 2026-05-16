"use client";

import { Lock, Loader2, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { toggleGoalLock } from "@/actions/admin/toggle-goal-lock";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type GoalLockDialogProps = {
  goal: {
    id: string;
    title: string;
    ownerName: string;
    locked: boolean;
  };
};

export function GoalLockDialog({ goal }: GoalLockDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const nextLockedState = !goal.locked;

  async function handleSubmit() {
    setIsPending(true);
    const result = await toggleGoalLock({
      goalId: goal.id,
      locked: nextLockedState,
      reason,
    });
    setIsPending(false);

    if (!result.ok) {
      toast.error("Goal lock was not updated", {
        description: result.message,
      });
      return;
    }

    toast.success(nextLockedState ? "Goal locked" : "Goal unlocked", {
      description: result.message,
    });
    setReason("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={goal.locked ? "outline" : "default"} size="sm">
          {goal.locked ? (
            <Unlock className="size-3.5" aria-hidden="true" />
          ) : (
            <Lock className="size-3.5" aria-hidden="true" />
          )}
          {goal.locked ? "Unlock" : "Lock"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal.locked ? "Unlock goal" : "Lock goal"}</DialogTitle>
          <DialogDescription>
            {goal.ownerName} owns &quot;{goal.title}&quot;. This action is
            recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor={`goal-lock-reason-${goal.id}`} className="text-sm font-medium">
              Governance reason
            </label>
            <textarea
              id={`goal-lock-reason-${goal.id}`}
              rows={4}
              maxLength={500}
              disabled={isPending}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Optional context for auditors and future admins."
              className={cn(
                "min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
            <p className="text-xs text-muted-foreground">
              Locking prevents employee edits by moving the goal to locked
              status. Unlocking returns it to approved status.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={goal.locked ? "outline" : "default"}
              disabled={isPending}
              onClick={handleSubmit}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : goal.locked ? (
                <Unlock className="size-4" aria-hidden="true" />
              ) : (
                <Lock className="size-4" aria-hidden="true" />
              )}
              {goal.locked ? "Unlock goal" : "Lock goal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
