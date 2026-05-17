"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GitBranch, Loader2, Send, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { createSharedGoal } from "@/actions/goals/create-shared-goal";
import { SharedGoalBadge } from "@/components/goals/shared-goal-badge";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createSharedGoalSchema,
  MIN_SHARED_GOAL_WEIGHTAGE,
  type CreateSharedGoalInput,
} from "@/lib/validations/shared-goal";
import type {
  SharedGoalEmployeeOption,
  SharedGoalPrimaryOption,
} from "@/lib/goals/shared-goal-types";

type SharedGoalDialogProps = {
  primaryGoals: SharedGoalPrimaryOption[];
  employees: SharedGoalEmployeeOption[];
  scope: "admin" | "manager";
};

const measurementLabels = {
  MAX: "Maximize",
  MIN: "Minimize",
  TIMELINE: "Timeline",
  ZERO: "Zero target",
} as const;

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
      <span className="text-destructive"> *</span>
    </label>
  );
}

function getDefaultValues(
  primaryGoals: SharedGoalPrimaryOption[],
): CreateSharedGoalInput {
  return {
    parentGoalId: primaryGoals[0]?.id ?? "",
    employeeIds: [],
    weightage: MIN_SHARED_GOAL_WEIGHTAGE,
  };
}

export function SharedGoalDialog({
  primaryGoals,
  employees,
  scope,
}: SharedGoalDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const hasPrimaryGoals = primaryGoals.length > 0;
  const hasEmployees = employees.length > 0;
  const form = useForm<CreateSharedGoalInput>({
    resolver: zodResolver(createSharedGoalSchema),
    defaultValues: getDefaultValues(primaryGoals),
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
  // React Hook Form owns field subscriptions; keep the required watch local.
  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedPrimaryGoalId = watch("parentGoalId");
  const selectedEmployeeIds = watch("employeeIds") ?? [];
  const selectedWeightage = watch("weightage");
  const selectedPrimaryGoal = primaryGoals.find(
    (goal) => goal.id === selectedPrimaryGoalId,
  );
  const assignedEmployeeIds = useMemo(
    () => new Set(selectedPrimaryGoal?.assignedEmployeeIds ?? []),
    [selectedPrimaryGoal],
  );
  const selectedCount = selectedEmployeeIds.length;
  const disabledReason =
    !hasPrimaryGoals || !hasEmployees
      ? scope === "manager"
        ? "Approved team KPIs and active direct reports are required."
        : "Approved KPIs and active employees are required."
      : null;

  useEffect(() => {
    setNeedsConfirmation(false);
  }, [selectedPrimaryGoalId, selectedCount, selectedWeightage]);

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setNeedsConfirmation(false);
      reset(getDefaultValues(primaryGoals));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!needsConfirmation) {
      setNeedsConfirmation(true);
      return;
    }

    const result = await createSharedGoal(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          const message = messages?.[0];

          if (message) {
            setError(field as FieldPath<CreateSharedGoalInput>, { message });
          }
        }
      }

      toast.error("Shared goal was not propagated", {
        description: result.message,
      });
      setNeedsConfirmation(false);
      return;
    }

    toast.success("Shared goal propagated", {
      description: result.message,
    });
    setOpen(false);
    setNeedsConfirmation(false);
    reset(getDefaultValues(primaryGoals));
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <GitBranch className="size-4" aria-hidden="true" />
          Propagate KPI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b p-5 pr-12">
          <DialogTitle>Propagate shared goal</DialogTitle>
          <DialogDescription>
            Create linked goals for selected employees while the primary owner
            remains the source of achievement progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid min-h-0">
          <div className="grid max-h-[68vh] gap-5 overflow-y-auto p-5">
            {disabledReason ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                {disabledReason}
              </div>
            ) : null}

            <section className="grid gap-3">
              <FieldLabel htmlFor="parentGoalId">Primary KPI</FieldLabel>
              <select
                id="parentGoalId"
                disabled={isSubmitting || !hasPrimaryGoals}
                aria-invalid={Boolean(errors.parentGoalId)}
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
                {...register("parentGoalId")}
              >
                <option value="">Select approved primary KPI</option>
                {primaryGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title} - {goal.ownerName}
                  </option>
                ))}
              </select>
              <FieldError message={errors.parentGoalId?.message} />

              {selectedPrimaryGoal ? (
                <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SharedGoalBadge kind="primary" />
                      <p className="truncate text-sm font-medium">
                        {selectedPrimaryGoal.title}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedPrimaryGoal.ownerName} -{" "}
                      {selectedPrimaryGoal.ownerMeta}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md border bg-background px-2 py-1">
                      {measurementLabels[selectedPrimaryGoal.measurementType]}
                    </span>
                    <span className="rounded-md border bg-background px-2 py-1">
                      {selectedPrimaryGoal.progressLabel}
                    </span>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_10rem] sm:items-end">
                <div>
                  <FieldLabel htmlFor="employeeIds">Recipients</FieldLabel>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedCount} employee{selectedCount === 1 ? "" : "s"}{" "}
                    selected
                  </p>
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="weightage">Weightage</FieldLabel>
                  <div className="relative">
                    <Input
                      id="weightage"
                      type="number"
                      min={MIN_SHARED_GOAL_WEIGHTAGE}
                      max={100}
                      step={1}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.weightage)}
                      className="pr-8"
                      {...register("weightage", { valueAsNumber: true })}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>
              <FieldError message={errors.employeeIds?.message} />
              <FieldError message={errors.weightage?.message} />

              <div className="grid gap-2 rounded-lg border">
                {employees.length === 0 ? (
                  <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                    <UsersRound className="size-5" aria-hidden="true" />
                    No eligible employees available.
                  </div>
                ) : (
                  employees.map((employee) => {
                    const isPrimaryOwner =
                      employee.id === selectedPrimaryGoal?.ownerId;
                    const isAlreadyAssigned = assignedEmployeeIds.has(employee.id);
                    const isOverWeightage =
                      employee.remainingWeightage < Number(selectedWeightage);
                    const disabled =
                      isSubmitting ||
                      !selectedPrimaryGoal ||
                      isPrimaryOwner ||
                      isAlreadyAssigned ||
                      isOverWeightage;

                    return (
                      <label
                        key={employee.id}
                        className={cn(
                          "grid cursor-pointer gap-3 border-b p-3 last:border-b-0 sm:grid-cols-[auto_1fr_auto] sm:items-center",
                          disabled && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <input
                          type="checkbox"
                          value={employee.id}
                          disabled={disabled}
                          className="mt-1 size-4 rounded border-input sm:mt-0"
                          {...register("employeeIds")}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {employee.name}
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {employee.title ?? employee.email}
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {employee.department ?? "No department"}
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:justify-end">
                          {isAlreadyAssigned ? (
                            <SharedGoalBadge kind="synced" />
                          ) : isPrimaryOwner ? (
                            <SharedGoalBadge kind="primary" />
                          ) : isOverWeightage ? (
                            <span className="rounded-md border bg-background px-2 py-1">
                              {employee.remainingWeightage}% available
                            </span>
                          ) : (
                            <span className="rounded-md border bg-background px-2 py-1">
                              {employee.remainingWeightage}% available
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </section>

            {needsConfirmation ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex flex-wrap items-center gap-2">
                  <SharedGoalBadge kind="restricted" />
                  <span className="font-medium">
                    Confirm {selectedCount} linked assignment
                    {selectedCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-2 leading-6">
                  Title, target, and achievement progress will stay locked to
                  the primary KPI. Recipients receive only a weightage control.
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter className="m-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || Boolean(disabledReason)}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : needsConfirmation ? (
                <Send className="size-4" aria-hidden="true" />
              ) : (
                <GitBranch className="size-4" aria-hidden="true" />
              )}
              {needsConfirmation ? "Confirm propagation" : "Review propagation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
