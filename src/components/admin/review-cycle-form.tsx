"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { QuarterlyStatus } from "@prisma/client";
import { Loader2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, type FieldPath, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { createReviewCycle } from "@/actions/admin/create-review-cycle";
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
import { cn } from "@/lib/utils";
import {
  reviewCycleSchema,
  reviewCycleStatusOptions,
  type ReviewCycleInput,
} from "@/lib/validations/review-cycle";

const statusLabels = {
  [QuarterlyStatus.NOT_STARTED]: "Not started",
  [QuarterlyStatus.ON_TRACK]: "On track",
  [QuarterlyStatus.COMPLETED]: "Completed",
  [QuarterlyStatus.DELAYED]: "Delayed",
} satisfies Record<QuarterlyStatus, string>;

const defaultValues = {
  name: "",
  year: new Date().getFullYear(),
  quarter: 1,
  status: QuarterlyStatus.NOT_STARTED,
  startDate: "",
  endDate: "",
  submissionDeadline: "",
  lockDate: "",
  activate: false,
} satisfies ReviewCycleInput;

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

export function ReviewCycleForm() {
  const router = useRouter();
  const form = useForm<ReviewCycleInput>({
    resolver: zodResolver(reviewCycleSchema) as Resolver<ReviewCycleInput>,
    defaultValues,
    mode: "onBlur",
  });

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    const result = await createReviewCycle(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          const message = messages?.[0];

          if (message) {
            setError(field as FieldPath<ReviewCycleInput>, { message });
          }
        }
      }

      toast.error("Review cycle was not created", {
        description: result.message,
      });
      return;
    }

    toast.success("Review cycle created", {
      description: result.message,
    });
    reset(defaultValues);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="w-full">
      <Card className="rounded-lg">
        <CardHeader className="border-b">
          <CardTitle>Create review cycle</CardTitle>
          <CardDescription>
            Define a governed quarterly window for goals, approvals, and
            updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell className="md:col-span-2">
              <FieldLabel htmlFor="name">Cycle name</FieldLabel>
              <Input
                id="name"
                placeholder="FY26 Q3 Performance Cycle"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </FieldShell>

            <FieldShell>
              <FieldLabel htmlFor="year">Year</FieldLabel>
              <Input
                id="year"
                type="number"
                min={2020}
                max={2100}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.year)}
                {...register("year", { valueAsNumber: true })}
              />
              <FieldError message={errors.year?.message} />
            </FieldShell>

            <FieldShell>
              <FieldLabel htmlFor="quarter">Quarter</FieldLabel>
              <select
                id="quarter"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.quarter)}
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
                {...register("quarter", { valueAsNumber: true })}
              >
                {[1, 2, 3, 4].map((quarter) => (
                  <option key={quarter} value={quarter}>
                    Q{quarter}
                  </option>
                ))}
              </select>
              <FieldError message={errors.quarter?.message} />
            </FieldShell>

            <FieldShell>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <select
                id="status"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.status)}
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
                {...register("status")}
              >
                {reviewCycleStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
              <FieldError message={errors.status?.message} />
            </FieldShell>

            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              <input
                id="activate"
                type="checkbox"
                disabled={isSubmitting}
                className="size-4 rounded border-input"
                {...register("activate")}
              />
              <label htmlFor="activate" className="text-sm font-medium">
                Activate after creation
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell>
              <FieldLabel htmlFor="startDate">Start date</FieldLabel>
              <Input
                id="startDate"
                type="date"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.startDate)}
                {...register("startDate")}
              />
              <FieldError message={errors.startDate?.message} />
            </FieldShell>

            <FieldShell>
              <FieldLabel htmlFor="endDate">End date</FieldLabel>
              <Input
                id="endDate"
                type="date"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.endDate)}
                {...register("endDate")}
              />
              <FieldError message={errors.endDate?.message} />
            </FieldShell>

            <FieldShell>
              <FieldLabel htmlFor="submissionDeadline" required={false}>
                Submission deadline
              </FieldLabel>
              <Input
                id="submissionDeadline"
                type="date"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.submissionDeadline)}
                {...register("submissionDeadline")}
              />
              <FieldError message={errors.submissionDeadline?.message} />
            </FieldShell>

            <FieldShell>
              <FieldLabel htmlFor="lockDate" required={false}>
                Lock date
              </FieldLabel>
              <Input
                id="lockDate"
                type="date"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.lockDate)}
                {...register("lockDate")}
              />
              <FieldError message={errors.lockDate?.message} />
            </FieldShell>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Activating a cycle deactivates any other active cycle.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => reset(defaultValues)}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <PlusCircle className="size-4" aria-hidden="true" />
              )}
              Create cycle
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
