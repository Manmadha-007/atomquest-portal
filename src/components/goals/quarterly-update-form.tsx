"use client";

import { zodResolver } from "@hookform/resolvers/zod";
type GoalMeasurementType = "MIN" | "MAX" | "TIMELINE" | "ZERO";
type QuarterlyStatus = "NOT_STARTED" | "ON_TRACK" | "COMPLETED" | "DELAYED";
import { ClipboardList, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm, Controller, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { createQuarterlyUpdate } from "@/actions/goals/create-quarterly-update";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  quarterlyStatusOptions,
  quarterlyUpdateSchema,
  type QuarterlyUpdateInput,
} from "@/lib/validations/quarterly-update";

export type QuarterlyUpdateGoalOption = {
  id: string;
  title: string;
  measurementType: GoalMeasurementType;
  unit: string | null;
  currentProgressLabel: string;
  hasCurrentQuarterUpdate: boolean;
};

type QuarterlyUpdateFormProps = {
  goals: QuarterlyUpdateGoalOption[];
  reviewCycleLabel: string;
};

const measurementLabels = {
  MIN: "Minimize",
  MAX: "Maximize",
  TIMELINE: "Timeline",
  ZERO: "Zero target",
} satisfies Record<GoalMeasurementType, string>;

const quarterlyStatusLabels = {
  NOT_STARTED: "Not started",
  ON_TRACK: "On track",
  COMPLETED: "Completed",
  DELAYED: "Delayed",
} satisfies Record<QuarterlyStatus, string>;

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

function FieldLabel({
  htmlFor,
  children,
  required = true,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

function FieldShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-2", className)}>{children}</div>;
}

function getDefaultValues(goalId: string): QuarterlyUpdateInput {
  return {
    goalId,
    achievementValue: "",
    quarterlyStatus: "ON_TRACK",
    accomplishmentSummary: "",
    blockerCommentary: "",
    notes: "",
  };
}

export function QuarterlyUpdateForm({
  goals,
  reviewCycleLabel,
}: QuarterlyUpdateFormProps) {
  const router = useRouter();
  const firstAvailableGoal = useMemo(
    () => goals.find((goal) => !goal.hasCurrentQuarterUpdate),
    [goals],
  );
  const availableGoalCount = goals.filter(
    (goal) => !goal.hasCurrentQuarterUpdate,
  ).length;

  const form = useForm<QuarterlyUpdateInput>({
    resolver: zodResolver(quarterlyUpdateSchema),
    defaultValues: getDefaultValues(firstAvailableGoal?.id ?? ""),
    mode: "onBlur",
  });

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    watch,
  } = form;
  // React Hook Form owns field subscriptions; keep this local to the form UI.
  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedGoalId = watch("goalId");
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId);
  const isTimelineGoal =
    selectedGoal?.measurementType === "TIMELINE";
  const hasAvailableGoals = availableGoalCount > 0;

  const onSubmit = handleSubmit(async (values) => {
    const result = await createQuarterlyUpdate(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          const message = messages?.[0];

          if (message) {
            setError(field as FieldPath<QuarterlyUpdateInput>, { message });
          }
        }
      }

      toast.error("Quarterly update was not submitted", {
        description: result.message,
      });
      return;
    }

    toast.success("Quarterly update submitted", {
      description: "Your progress snapshot is now part of the goal history.",
    });
    reset(getDefaultValues(firstAvailableGoal?.id ?? ""));
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="w-full">
      <Card className="rounded-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Submit quarterly update</CardTitle>
              <CardDescription>
                Capture current achievement and execution health for{" "}
                {reviewCycleLabel}.
              </CardDescription>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
              <ClipboardList className="size-3.5" aria-hidden="true" />
              {availableGoalCount} goal{availableGoalCount === 1 ? "" : "s"}{" "}
              open
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 pt-5">
          {!hasAvailableGoals ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              All approved goals already have an update recorded for the active
              quarter.
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <FieldShell>
              <FieldLabel htmlFor="goalId">Approved goal</FieldLabel>
              <Controller
                control={form.control}
                name="goalId"
                render={({ field }) => (
                  <Select
                    disabled={isSubmitting || !hasAvailableGoals}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger
                      id="goalId"
                      aria-invalid={Boolean(errors.goalId)}
                      className={errors.goalId ? "border-destructive ring-3 ring-destructive/20" : ""}
                    >
                      <SelectValue placeholder="Select approved goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((goal) => (
                        <SelectItem
                          key={goal.id}
                          value={goal.id}
                          disabled={goal.hasCurrentQuarterUpdate}
                        >
                          {goal.title}
                          {goal.hasCurrentQuarterUpdate ? " (updated)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.goalId?.message} />
            </FieldShell>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Measurement
              </p>
              <p className="mt-1 text-sm font-medium">
                {selectedGoal
                  ? measurementLabels[selectedGoal.measurementType]
                  : "Select a goal"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedGoal?.currentProgressLabel ?? "Progress appears here."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell>
              <FieldLabel htmlFor="achievementValue">
                Current achievement value
              </FieldLabel>
              <Input
                id="achievementValue"
                inputMode="decimal"
                placeholder={isTimelineGoal ? "65" : "78"}
                disabled={isSubmitting || !hasAvailableGoals}
                aria-invalid={Boolean(errors.achievementValue)}
                {...register("achievementValue")}
              />
              <p className="text-xs text-muted-foreground">
                {isTimelineGoal
                  ? "Use a completion percentage for timeline goals."
                  : selectedGoal?.unit ?? "Enter the current measured value."}
              </p>
              <FieldError message={errors.achievementValue?.message} />
            </FieldShell>

            <FieldShell>
              <FieldLabel htmlFor="quarterlyStatus">
                Quarterly status
              </FieldLabel>
              <Controller
                control={form.control}
                name="quarterlyStatus"
                render={({ field }) => (
                  <Select
                    disabled={isSubmitting || !hasAvailableGoals}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger
                      id="quarterlyStatus"
                      aria-invalid={Boolean(errors.quarterlyStatus)}
                      className={errors.quarterlyStatus ? "border-destructive ring-3 ring-destructive/20" : ""}
                    >
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {quarterlyStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {quarterlyStatusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.quarterlyStatus?.message} />
            </FieldShell>
          </div>

          <div className="grid gap-4">
            <FieldShell>
              <FieldLabel htmlFor="accomplishmentSummary">
                Accomplishment summary
              </FieldLabel>
              <textarea
                id="accomplishmentSummary"
                rows={4}
                disabled={isSubmitting || !hasAvailableGoals}
                aria-invalid={Boolean(errors.accomplishmentSummary)}
                placeholder="Summarize measurable progress, shipped work, or customer impact."
                className={cn(
                  "min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                  errors.accomplishmentSummary &&
                    "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                )}
                {...register("accomplishmentSummary")}
              />
              <FieldError message={errors.accomplishmentSummary?.message} />
            </FieldShell>

            <FieldShell>
              <FieldLabel htmlFor="blockerCommentary">
                Blockers and risks
              </FieldLabel>
              <textarea
                id="blockerCommentary"
                rows={3}
                disabled={isSubmitting || !hasAvailableGoals}
                aria-invalid={Boolean(errors.blockerCommentary)}
                placeholder="List risks, dependencies, or state that there are no blockers."
                className={cn(
                  "min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                  errors.blockerCommentary &&
                    "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                )}
                {...register("blockerCommentary")}
              />
              <FieldError message={errors.blockerCommentary?.message} />
            </FieldShell>

            <FieldShell>
              <FieldLabel htmlFor="notes" required={false}>
                Notes
              </FieldLabel>
              <textarea
                id="notes"
                rows={3}
                disabled={isSubmitting || !hasAvailableGoals}
                aria-invalid={Boolean(errors.notes)}
                placeholder="Optional context for future review."
                className={cn(
                  "min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                  errors.notes &&
                    "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                )}
                {...register("notes")}
              />
              <FieldError message={errors.notes?.message} />
            </FieldShell>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            One update is recorded per approved goal in the active quarter.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => reset(getDefaultValues(firstAvailableGoal?.id ?? ""))}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !hasAvailableGoals}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              Submit update
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
