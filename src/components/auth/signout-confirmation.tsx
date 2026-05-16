"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { LogOut, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SignoutConfirmationProps = {
  action: (formData: FormData) => Promise<void>;
  userLabel?: string | null;
  workspaceLabel: string;
};

function ConfirmSignoutButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending}
      className="gap-1.5"
    >
      <LogOut className="size-3.5" aria-hidden="true" />
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}

export function SignoutConfirmation({
  action,
  userLabel,
  workspaceLabel,
}: SignoutConfirmationProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <LogOut className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Sign out</span>
          <span className="sm:hidden">Exit</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-slate-50">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <DialogTitle>Sign out of AtomQuest?</DialogTitle>
            <DialogDescription className="leading-6">
              Your current {workspaceLabel.toLowerCase()} session will end and
              you will return to the public platform page.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{userLabel ?? "AtomQuest user"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{workspaceLabel}</p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <form action={action}>
            <ConfirmSignoutButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
