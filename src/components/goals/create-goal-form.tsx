"use client";

import { zodResolver } from "@hookform/resolvers/zod";
type GoalMeasurementType = "MIN" | "MAX" | "TIMELINE" | "ZERO";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { createGoal } from "@/actions/goals/create-goal";
import { GoalFormFields } from "@/components/goals/goal-form-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createGoalSchema,
  type CreateGoalInput,
} from "@/lib/validations/goal";

const defaultValues = {
  title: "",
  thrustArea: "",
  description: "",
  measurementType: "MAX",
  startValue: "",
  targetValue: "",
  weightage: 10,
  priority: 3,
  dueDate: "",
} satisfies CreateGoalInput;

export function CreateGoalForm() {
  const router = useRouter();
  const form = useForm<CreateGoalInput>({
    resolver: zodResolver(createGoalSchema),
    defaultValues,
    mode: "onBlur",
  });

  const {
    formState: { isSubmitting },
    handleSubmit,
    reset,
    setError,
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    const result = await createGoal(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          const message = messages?.[0];

          if (message) {
            setError(field as FieldPath<CreateGoalInput>, { message });
          }
        }
      }

      toast.error("Goal was not created", {
        description: result.message,
      });
      return;
    }

    toast.success("Goal saved as draft", {
      description: "Your manager can review it after submission.",
    });
    reset(defaultValues);
    router.refresh();
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="w-full">
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <CardTitle>Create goal</CardTitle>
            <CardDescription>
              Draft a measurable quarterly goal for the active review cycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <GoalFormFields disabled={isSubmitting} />
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Goals save as drafts and can be submitted for approval later.
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
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save draft
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </FormProvider>
  );
}
