"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";

import type {
  ApprovalCommentInput,
  GoalApprovalActionResult,
  RejectionCommentInput,
} from "@/lib/goals/approval-workflow";
import {
  approvalCommentSchema,
  rejectionCommentSchema,
} from "@/lib/goals/approval-workflow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ApprovalCommentFormProps = {
  goalId: string;
  mode: "approve" | "reject";
  onSubmit: (
    values: ApprovalCommentInput | RejectionCommentInput,
  ) => Promise<GoalApprovalActionResult>;
  onSuccess: (result: GoalApprovalActionResult) => void;
  onCancel: () => void;
};

type ApprovalFormValues = {
  goalId: string;
  comments: string;
};

export function ApprovalCommentForm({
  goalId,
  mode,
  onSubmit,
  onSuccess,
  onCancel,
}: ApprovalCommentFormProps) {
  const isRejecting = mode === "reject";
  const form = useForm<ApprovalFormValues>({
    resolver: zodResolver(
      isRejecting ? rejectionCommentSchema : approvalCommentSchema,
    ) as Resolver<ApprovalFormValues>,
    defaultValues: {
      goalId,
      comments: "",
    },
    mode: "onBlur",
  });

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = form;

  const submitLabel = isRejecting ? "Reject goal" : "Approve goal";

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        const result = await onSubmit(values);

        if (!result.ok) {
          if (result.fieldErrors?.comments?.[0]) {
            setError("comments", {
              message: result.fieldErrors.comments[0],
            });
          }

          if (result.fieldErrors?.goalId?.[0]) {
            setError("goalId", {
              message: result.fieldErrors.goalId[0],
            });
          }

          onSuccess(result);
          return;
        }

        onSuccess(result);
      })}
    >
      <input type="hidden" {...register("goalId")} />
      <div className="space-y-2">
        <label
          htmlFor={`${mode}-comments-${goalId}`}
          className="text-sm font-medium"
        >
          Manager comments {isRejecting ? "" : "(optional)"}
        </label>
        <textarea
          id={`${mode}-comments-${goalId}`}
          rows={5}
          disabled={isSubmitting}
          placeholder={
            isRejecting
              ? "Explain what needs to change before this goal can be approved."
              : "Add context for the approval record."
          }
          className={cn(
            "flex min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            errors.comments &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
          )}
          {...register("comments")}
        />
        {errors.comments?.message ? (
          <p className="text-xs text-destructive">{errors.comments.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {isRejecting
              ? "This note is visible in the audit trail and should be specific."
              : "Optional notes help future reviewers understand the decision."}
          </p>
        )}
      </div>

      {errors.goalId?.message ? (
        <p className="text-xs text-destructive">{errors.goalId.message}</p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant={isRejecting ? "destructive" : "default"}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : isRejecting ? (
            <XCircle className="size-4" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
