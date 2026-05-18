"use client";

type GoalMeasurementType = "MIN" | "MAX" | "TIMELINE" | "ZERO";
import { useFormContext, Controller } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  goalMeasurementTypeOptions,
  goalPriorityOptions,
  type CreateGoalInput,
} from "@/lib/validations/goal";
import { cn } from "@/lib/utils";

type GoalFormFieldsProps = {
  disabled?: boolean;
};

const measurementLabels = {
  MIN: "Minimize",
  MAX: "Maximize",
  TIMELINE: "Timeline",
  ZERO: "Zero tolerance",
} satisfies Record<GoalMeasurementType, string>;

const measurementHints = {
  MIN: "Use when lower is better, such as cycle time or defects.",
  MAX: "Use when higher is better, such as adoption, revenue, or coverage.",
  TIMELINE: "Use when the outcome is delivery by a specific date.",
  ZERO: "Use when the expected target is zero incidents or zero defects.",
} satisfies Record<GoalMeasurementType, string>;

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

export function GoalFormFields({ disabled = false }: GoalFormFieldsProps) {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = useFormContext<CreateGoalInput>();
  const measurementType = watch("measurementType");
  const isTimelineGoal = measurementType === "TIMELINE";
  const isZeroGoal = measurementType === "ZERO";

  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Goal definition</h2>
          <p className="text-sm text-muted-foreground">
            Capture the business outcome, ownership context, and strategic area.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:gap-4">
          <FieldShell className="md:col-span-2">
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              placeholder="Increase enterprise dashboard adoption"
              disabled={disabled}
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
            <FieldError message={errors.title?.message} />
          </FieldShell>

          <FieldShell>
            <FieldLabel htmlFor="thrustArea">Thrust area</FieldLabel>
            <Input
              id="thrustArea"
              placeholder="Customer Value & Adoption"
              disabled={disabled}
              aria-invalid={Boolean(errors.thrustArea)}
              {...register("thrustArea")}
            />
            <FieldError message={errors.thrustArea?.message} />
          </FieldShell>

          <FieldShell>
            <FieldLabel htmlFor="dueDate">Due date</FieldLabel>
            <Input
              id="dueDate"
              type="date"
              disabled={disabled}
              aria-invalid={Boolean(errors.dueDate)}
              {...register("dueDate")}
            />
            <FieldError message={errors.dueDate?.message} />
          </FieldShell>

          <FieldShell className="md:col-span-2">
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <textarea
              id="description"
              placeholder="Describe the KPI outcome, scope, and expected enterprise impact."
              disabled={disabled}
              aria-invalid={Boolean(errors.description)}
              className={cn(
                "min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30",
              )}
              {...register("description")}
            />
            <FieldError message={errors.description?.message} />
          </FieldShell>
        </div>
      </section>

      <Separator />

      <section className="grid gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Measurement model</h2>
          <p className="text-sm text-muted-foreground">
            Define how progress will be measured during quarterly updates.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr] lg:gap-4">
          <FieldShell>
            <FieldLabel htmlFor="measurementType">Measurement type</FieldLabel>
            <Controller
              control={control}
              name="measurementType"
              render={({ field }) => (
                <Select
                  disabled={disabled}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger
                    id="measurementType"
                    aria-invalid={Boolean(errors.measurementType)}
                    className={errors.measurementType ? "border-destructive ring-3 ring-destructive/20" : ""}
                  >
                    <SelectValue placeholder="Select measurement type" />
                  </SelectTrigger>
                  <SelectContent>
                    {goalMeasurementTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {measurementLabels[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              {measurementHints[measurementType]}
            </p>
            <FieldError message={errors.measurementType?.message} />
          </FieldShell>

          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-md">
                {measurementLabels[measurementType]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Quarterly updates derive live progress.
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:gap-4">
          <FieldShell>
            <FieldLabel htmlFor="startValue" required={!isTimelineGoal}>
              Start value
            </FieldLabel>
            <Input
              id="startValue"
              inputMode="decimal"
              placeholder={isTimelineGoal ? "Optional" : "48"}
              disabled={disabled || isTimelineGoal}
              aria-invalid={Boolean(errors.startValue)}
              {...register("startValue")}
            />
            <FieldError message={errors.startValue?.message} />
          </FieldShell>

          <FieldShell>
            <FieldLabel
              htmlFor="targetValue"
              required={!isTimelineGoal && !isZeroGoal}
            >
              Target value
            </FieldLabel>
            <Input
              id="targetValue"
              inputMode="decimal"
              placeholder={isZeroGoal ? "0" : isTimelineGoal ? "Optional" : "78"}
              disabled={disabled || isTimelineGoal}
              aria-invalid={Boolean(errors.targetValue)}
              {...register("targetValue")}
            />
            <FieldError message={errors.targetValue?.message} />
          </FieldShell>
        </div>
      </section>

      <Separator />

      <section className="grid gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Planning controls</h2>
          <p className="text-sm text-muted-foreground">
            Weightage and priority help managers review focus and balance.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:gap-4">
          <FieldShell>
            <FieldLabel htmlFor="weightage">Weightage</FieldLabel>
            <div className="relative">
              <Input
                id="weightage"
                type="number"
                min={10}
                max={100}
                step={1}
                disabled={disabled}
                aria-invalid={Boolean(errors.weightage)}
                className="pr-8"
                {...register("weightage", { valueAsNumber: true })}
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum 10%. Combined goals cannot exceed 100%.
            </p>
            <FieldError message={errors.weightage?.message} />
          </FieldShell>

          <FieldShell>
            <FieldLabel htmlFor="priority">Priority</FieldLabel>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select
                  disabled={disabled}
                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                  value={field.value?.toString() ?? ""}
                >
                  <SelectTrigger
                    id="priority"
                    aria-invalid={Boolean(errors.priority)}
                    className={errors.priority ? "border-destructive ring-3 ring-destructive/20" : ""}
                  >
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {goalPriorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.value} - {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.priority?.message} />
          </FieldShell>
        </div>
      </section>
    </div>
  );
}
