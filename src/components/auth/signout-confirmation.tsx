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
      className="h-10 w-full gap-2 sm:h-9 sm:w-auto"
    >
      <LogOut className="size-4 sm:size-3.5" aria-hidden="true" />
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

      <DialogContent className="sm:max-w-md gap-5 p-5 sm:p-6">
        <DialogHeader className="gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-slate-950 text-slate-50">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-lg sm:text-base">Sign out of AtomQuest?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Your current {workspaceLabel.toLowerCase()} session will end and
              you will return to the public platform page.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/30 px-4 py-3.5 text-sm">
          <p className="truncate font-medium">{userLabel ?? "AtomQuest user"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{workspaceLabel}</p>
        </div>

        <DialogFooter className="gap-2.5 sm:gap-2">
          <form action={action} className="contents">
            <ConfirmSignoutButton />
          </form>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-10 w-full sm:h-9 sm:w-auto">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
