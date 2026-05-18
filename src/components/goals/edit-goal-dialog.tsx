"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, FormProvider, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { updateGoal } from "@/actions/goals/update-goal";
import { GoalFormFields } from "@/components/goals/goal-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateGoalSchema,
  type UpdateGoalInput,
} from "@/lib/validations/goal";

export type EditableGoalData = {
  id: string;
  title: string;
  description: string | null;
  thrustArea: string;
  measurementType: "MIN" | "MAX" | "TIMELINE" | "ZERO";
  startValue: string;
  targetValue: string;
  weightage: number;
  priority: number;
  dueDate: string;
  rejectionComment: string | null;
};

type EditGoalDialogProps = {
  goal: EditableGoalData;
};

export function EditGoalDialog({ goal }: EditGoalDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<UpdateGoalInput>({
    resolver: zodResolver(updateGoalSchema),
    defaultValues: {
      goalId: goal.id,
      title: goal.title,
      thrustArea: goal.thrustArea,
      description: goal.description || "",
      measurementType: goal.measurementType,
      startValue: goal.startValue,
      targetValue: goal.targetValue,
      weightage: goal.weightage,
      priority: goal.priority,
      dueDate: goal.dueDate,
    },
    mode: "onBlur",
  });

  const {
    formState: { isSubmitting },
    handleSubmit,
    setError,
    reset,
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    const result = await updateGoal(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          const message = messages?.[0];
          if (message) {
            setError(field as FieldPath<UpdateGoalInput>, { message });
          }
        }
      }

      toast.error("Goal was not updated", {
        description: result.message,
      });
      return;
    }

    toast.success("Goal updated", {
      description: "Changes saved. Submit when ready for review.",
    });
    setOpen(false);
    router.refresh();
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      // Reset form to latest values when opening
      reset({
        goalId: goal.id,
        title: goal.title,
        thrustArea: goal.thrustArea,
        description: goal.description || "",
        measurementType: goal.measurementType,
        startValue: goal.startValue,
        targetValue: goal.targetValue,
        weightage: goal.weightage,
        priority: goal.priority,
        dueDate: goal.dueDate,
      });
    }
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Revise ${goal.title}`}
          className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Revise
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revise goal</DialogTitle>
          <DialogDescription>
            Update the goal based on manager feedback, then submit for review.
          </DialogDescription>
        </DialogHeader>
        {goal.rejectionComment ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-900 dark:bg-rose-950/30">
            <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
              Manager feedback:{" "}
              <span className="font-normal">{goal.rejectionComment}</span>
            </p>
          </div>
        ) : null}
        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="grid gap-5">
            <GoalFormFields disabled={isSubmitting} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
