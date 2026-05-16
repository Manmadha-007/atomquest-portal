"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { approveGoal } from "@/actions/goals/approve-goal";
import { rejectGoal } from "@/actions/goals/reject-goal";
import { ApprovalCommentForm } from "@/components/goals/approval-comment-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type {
  ApprovalCommentInput,
  GoalApprovalActionResult,
  RejectionCommentInput,
} from "@/lib/goals/approval-workflow";

type GoalApprovalDialogProps = {
  goal: {
    id: string;
    title: string;
    employeeName: string;
  };
  mode: "approve" | "reject";
  children?: React.ReactNode;
};

export function GoalApprovalDialog({
  goal,
  mode,
  children,
}: GoalApprovalDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const isRejecting = mode === "reject";

  const action = isRejecting
    ? (values: ApprovalCommentInput | RejectionCommentInput) =>
        rejectGoal(values as RejectionCommentInput)
    : (values: ApprovalCommentInput | RejectionCommentInput) =>
        approveGoal(values as ApprovalCommentInput);

  function handleResult(result: GoalApprovalActionResult) {
    if (!result.ok) {
      toast.error(isRejecting ? "Goal was not rejected" : "Goal was not approved", {
        description: result.message,
      });
      return;
    }

    toast.success(isRejecting ? "Goal rejected" : "Goal approved", {
      description: result.message,
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant={isRejecting ? "outline" : "default"}>
            {isRejecting ? "Reject" : "Approve"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isRejecting ? "Reject submitted goal" : "Approve submitted goal"}
          </DialogTitle>
          <DialogDescription>
            {goal.employeeName} submitted &quot;{goal.title}&quot; for manager
            review.
          </DialogDescription>
        </DialogHeader>
        <ApprovalCommentForm
          key={`${mode}-${goal.id}-${open}`}
          goalId={goal.id}
          mode={mode}
          onSubmit={action}
          onSuccess={handleResult}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
