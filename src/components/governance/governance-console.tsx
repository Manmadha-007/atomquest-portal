"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileClock,
  Gauge,
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
  XCircle,
} from "lucide-react";

import { GovernanceBarList } from "@/components/governance/governance-bar-list";
import { GovernanceMetricCard } from "@/components/governance/governance-metric-card";
import {
  EscalationStatusBadge,
  ExecutionStatusBadge,
} from "@/components/governance/governance-status-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useGovernanceConsoleActions,
  useRoleAwareGovernanceConsoleData,
} from "@/features/escalation/ui/hooks";
import type {
  EscalationResponseDto,
  GovernanceConsoleRole,
} from "@/features/escalation/ui/types";
import {
  buildGovernanceMetricCards,
  formatGovernanceDateTime,
  formatGovernanceEnum,
  formatGovernanceNumber,
  formatGovernanceRatio,
  formatHours,
  getEscalationLevelLabel,
  getEscalationTypeLabel,
  getGovernanceCapabilities,
  getGovernanceConsoleEyebrow,
  getGovernanceConsoleSubtitle,
  getOldestOpenDescription,
} from "@/features/escalation/ui/view-models";

type GovernanceConsoleProps = {
  role: GovernanceConsoleRole;
};

type LifecycleDialogState =
  | {
      action: "RESOLVE" | "DISMISS";
      escalation: EscalationResponseDto;
    }
  | null;

function LoadingState() {
  return (
    <div className="grid gap-4">
      <div className="h-40 animate-pulse rounded-lg border bg-muted/40" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ConsoleHero({
  role,
  onRefresh,
  onRunCycle,
  isMutating,
}: {
  role: GovernanceConsoleRole;
  onRefresh: () => void;
  onRunCycle: (dryRun: boolean) => void;
  isMutating: boolean;
}) {
  const capabilities = getGovernanceCapabilities(role);

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {getGovernanceConsoleEyebrow(role)}
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Governance operational console
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {getGovernanceConsoleSubtitle(role)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={isMutating}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
          {capabilities.canRunEscalationCycle ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onRunCycle(true)}
                disabled={isMutating}
              >
                <Play className="size-4" aria-hidden="true" />
                Dry run
              </Button>
              <Button
                type="button"
                onClick={() => onRunCycle(false)}
                disabled={isMutating}
              >
                <Play className="size-4" aria-hidden="true" />
                Run cycle
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function OverviewPanel({
  data,
}: {
  data: NonNullable<ReturnType<typeof useRoleAwareGovernanceConsoleData>["data"]>;
}) {
  const metricCards = buildGovernanceMetricCards(data);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => (
          <GovernanceMetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <CardTitle>Escalation distribution</CardTitle>
            <CardDescription>
              Current governance exposure by type and level.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 pt-1">
            <GovernanceBarList
              emptyMessage="No escalation distribution is available."
              items={data.overview.byType.map((item, index) => ({
                id: item.escalationType,
                label: getEscalationTypeLabel(item.escalationType),
                value: item.count,
                helper: `${item.openCount} open, ${item.resolvedCount} resolved`,
                tone:
                  index === 0
                    ? "bg-sky-500"
                    : index === 1
                      ? "bg-emerald-500"
                      : "bg-amber-500",
              }))}
            />
            <GovernanceBarList
              emptyMessage="No escalation levels are available."
              items={data.overview.byLevel.map((item, index) => ({
                id: item.escalationLevel,
                label: getEscalationLevelLabel(item.escalationLevel),
                value: item.count,
                helper: `${item.openCount} open at this governance level`,
                tone:
                  index === 0
                    ? "bg-blue-500"
                    : index === 1
                      ? "bg-violet-500"
                      : "bg-red-500",
              }))}
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <CardTitle>Lifecycle posture</CardTitle>
            <CardDescription>
              Aging and closure signals from the analytics API.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Mean closure
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {formatHours(data.lifecycle.meanClosureHours)}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Oldest open
                </p>
                <p className="mt-2 text-sm font-medium leading-5">
                  {getOldestOpenDescription(data)}
                </p>
              </div>
            </div>
            <GovernanceBarList
              emptyMessage="No unresolved aging exposure is present."
              items={data.lifecycle.openEscalationAging.map((item, index) => ({
                id: item.bucket,
                label: item.label,
                value: item.count,
                tone:
                  index < 2
                    ? "bg-emerald-500"
                    : index === 2
                      ? "bg-amber-500"
                      : "bg-red-500",
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EscalationsPanel({
  data,
  role,
  onLifecycleAction,
}: {
  data: NonNullable<ReturnType<typeof useRoleAwareGovernanceConsoleData>["data"]>;
  role: GovernanceConsoleRole;
  onLifecycleAction: (state: LifecycleDialogState) => void;
}) {
  const capabilities = getGovernanceCapabilities(role);
  const escalations = data.escalations.escalations;

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle>Escalation management</CardTitle>
        <CardDescription>
          Lifecycle status, ownership, target context, and governed closure actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1">
        {escalations.length === 0 ? (
          <EmptyState message="No escalations are visible in your governance scope." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escalation</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Triggered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {escalations.map((escalation) => (
                <TableRow key={escalation.id}>
                  <TableCell className="min-w-72 whitespace-normal">
                    <div className="grid gap-1">
                      <p className="font-medium">
                        {getEscalationTypeLabel(escalation.escalationType)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getEscalationLevelLabel(escalation.escalationLevel)} -{" "}
                        {escalation.targetGoal?.title ?? "Cycle-level governance"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="grid gap-1">
                      <span className="font-medium">{escalation.employee.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Manager: {escalation.manager?.name ?? "Unassigned"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <EscalationStatusBadge status={escalation.status} />
                  </TableCell>
                  <TableCell>
                    {formatGovernanceDateTime(escalation.triggeredAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {escalation.status === "OPEN" ? (
                      <div className="flex justify-end gap-2">
                        {capabilities.canResolveEscalations ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onLifecycleAction({
                                action: "RESOLVE",
                                escalation,
                              })
                            }
                          >
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                            Resolve
                          </Button>
                        ) : null}
                        {capabilities.canDismissEscalations ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              onLifecycleAction({
                                action: "DISMISS",
                                escalation,
                              })
                            }
                          >
                            <XCircle className="size-3.5" aria-hidden="true" />
                            Dismiss
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Closed
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ExecutionsPanel({
  data,
}: {
  data: NonNullable<ReturnType<typeof useRoleAwareGovernanceConsoleData>["data"]>;
}) {
  const executions = data.executionHealth.recentExecutions;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total executions
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatGovernanceNumber(data.executionHealth.totalExecutions)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Failure ratio
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatGovernanceRatio(data.executionHealth.failureRatio)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Overlap skips
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatGovernanceNumber(data.executionHealth.schedulerOverlapSkippedCount)}
          </p>
        </div>
      </div>
      <Card className="rounded-lg">
        <CardHeader className="border-b">
          <CardTitle>Recent execution history</CardTitle>
          <CardDescription>
            Execution audit summaries from the canonical invocation boundary.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          {executions.length === 0 ? (
            <EmptyState message="No execution history is available for this window." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Logs</TableHead>
                  <TableHead>Notifications</TableHead>
                  <TableHead>Failures</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution) => (
                  <TableRow key={execution.executionId}>
                    <TableCell>
                      <ExecutionStatusBadge status={execution.status} />
                    </TableCell>
                    <TableCell>{formatGovernanceEnum(execution.triggerSource)}</TableCell>
                    <TableCell>
                      {formatGovernanceDateTime(execution.startedAt)}
                    </TableCell>
                    <TableCell>{execution.logsCreated}</TableCell>
                    <TableCell>
                      {execution.notificationsDelivered}/
                      {execution.notificationsAttempted}
                    </TableCell>
                    <TableCell>{execution.failures}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SchedulerPanel({
  data,
  role,
  isMutating,
  onStart,
  onStop,
}: {
  data: NonNullable<ReturnType<typeof useRoleAwareGovernanceConsoleData>["data"]>;
  role: GovernanceConsoleRole;
  isMutating: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const capabilities = getGovernanceCapabilities(role);
  const scheduler = data.scheduler.state;

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle>Scheduler operational control</CardTitle>
        <CardDescription>
          Single-runtime scheduler state and guard visibility from the governance API.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 pt-1">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              State
            </p>
            <p className="mt-2 font-semibold">
              {scheduler?.isStarted ? "Running" : "Stopped"}
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Interval
            </p>
            <p className="mt-2 font-semibold">
              {scheduler ? `${Math.round(scheduler.intervalMs / 60000)} min` : "Not registered"}
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Completed
            </p>
            <p className="mt-2 font-semibold">
              {formatGovernanceNumber(scheduler?.completedCount ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Last execution
            </p>
            <p className="mt-2 truncate font-semibold">
              {scheduler?.lastExecutionId ?? "None"}
            </p>
          </div>
        </div>
        {capabilities.canControlScheduler ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onStart} disabled={isMutating}>
              <Play className="size-4" aria-hidden="true" />
              Start scheduler
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onStop}
              disabled={isMutating}
            >
              <Square className="size-4" aria-hidden="true" />
              Stop scheduler
            </Button>
          </div>
        ) : (
          <EmptyState message="Scheduler controls are restricted to administrators." />
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsPanel({
  data,
}: {
  data: NonNullable<ReturnType<typeof useRoleAwareGovernanceConsoleData>["data"]>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-lg">
        <CardHeader className="border-b">
          <CardTitle>Department accountability</CardTitle>
          <CardDescription>
            Escalation concentration by department.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <GovernanceBarList
            emptyMessage="No department accountability metrics are available."
            items={data.accountability.escalationsByDepartment.map((item) => ({
              id: item.department,
              label: item.department,
              value: item.totalEscalations,
              helper: `${item.openEscalations} open, ${item.resolvedEscalations} resolved`,
              tone: item.openEscalations > 0 ? "bg-amber-500" : "bg-emerald-500",
            }))}
          />
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader className="border-b">
          <CardTitle>Resolution ownership</CardTitle>
          <CardDescription>
            Closure accountability by governance actor.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <GovernanceBarList
            emptyMessage="No resolution ownership metrics are available."
            items={data.accountability.resolutionOwnership.map((item) => ({
              id: item.userId,
              label: item.userName,
              value: item.totalClosedCount,
              helper: `${item.resolvedCount} resolved, ${item.dismissedCount} dismissed`,
              tone: "bg-sky-500",
            }))}
          />
        </CardContent>
      </Card>

      <Card className="rounded-lg lg:col-span-2">
        <CardHeader className="border-b">
          <CardTitle>Repeat escalation hotspots</CardTitle>
          <CardDescription>
            Recurrent governance contexts that may need operational review.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          {data.accountability.repeatEscalationHotspots.length === 0 ? (
            <EmptyState message="No repeat escalation hotspots are present in this window." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Context</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Occurrences</TableHead>
                  <TableHead>Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.accountability.repeatEscalationHotspots.map((item) => (
                  <TableRow
                    key={`${item.escalationType}-${item.employeeId}-${item.targetGoalId ?? "cycle"}`}
                  >
                    <TableCell>{getEscalationTypeLabel(item.escalationType)}</TableCell>
                    <TableCell>{item.employeeName}</TableCell>
                    <TableCell>{item.managerName ?? "Unassigned"}</TableCell>
                    <TableCell>{item.occurrenceCount}</TableCell>
                    <TableCell>{item.openCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LifecycleActionDialog({
  state,
  isMutating,
  onClose,
  onSubmit,
}: {
  state: LifecycleDialogState;
  isMutating: boolean;
  onClose: () => void;
  onSubmit: (input: {
    action: "RESOLVE" | "DISMISS";
    escalationId: string;
    reason: string;
    notes: string | null;
  }) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!state) {
      return;
    }

    await onSubmit({
      action: state.action,
      escalationId: state.escalation.id,
      reason,
      notes,
    });
    setReason("");
    setNotes("");
    onClose();
  }

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={(open) => {
        if (!open) {
          setReason("");
          setNotes("");
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {state?.action === "DISMISS" ? "Dismiss escalation" : "Resolve escalation"}
            </DialogTitle>
            <DialogDescription>
              {state?.escalation
                ? `${getEscalationTypeLabel(state.escalation.escalationType)} for ${state.escalation.employee.name}.`
                : "Record governed closure metadata."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="governance-reason">
              Reason
            </label>
            <Input
              id="governance-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              maxLength={500}
              placeholder={
                state?.action === "DISMISS"
                  ? "Approved exception window."
                  : "Manager completed governance follow-up."
              }
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="governance-notes">
              Notes
            </label>
            <textarea
              id="governance-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              rows={4}
              className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Optional governance-readable context."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating}>
              {state?.action === "DISMISS" ? "Dismiss" : "Resolve"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GovernanceConsole({ role }: GovernanceConsoleProps) {
  const capabilities = useMemo(() => getGovernanceCapabilities(role), [role]);
  const consoleState = useRoleAwareGovernanceConsoleData({
    includeScheduler: capabilities.canControlScheduler,
  });
  const actions = useGovernanceConsoleActions({
    reload: consoleState.reload,
  });
  const [dialogState, setDialogState] = useState<LifecycleDialogState>(null);

  async function handleLifecycleSubmit(input: {
    action: "RESOLVE" | "DISMISS";
    escalationId: string;
    reason: string;
    notes: string | null;
  }) {
    if (input.action === "DISMISS") {
      await actions.dismissEscalation(input);
      return;
    }

    await actions.resolveEscalation(input);
  }

  if (consoleState.isLoading && !consoleState.data) {
    return <LoadingState />;
  }

  if (consoleState.error || !consoleState.data) {
    return (
      <div className="grid gap-4">
        <ConsoleHero
          role={role}
          onRefresh={() => void consoleState.reload()}
          onRunCycle={(dryRun) => void actions.runCycle(dryRun)}
          isMutating={actions.isMutating}
        />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {consoleState.error ?? "Governance console data could not be loaded."}
        </div>
      </div>
    );
  }

  const data = consoleState.data;

  return (
    <div className="grid gap-5">
      <ConsoleHero
        role={role}
        onRefresh={() => void consoleState.reload()}
        onRunCycle={(dryRun) => void actions.runCycle(dryRun)}
        isMutating={actions.isMutating}
      />

      {actions.actionMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {actions.actionMessage}
        </div>
      ) : null}

      {actions.actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {actions.actionError}
        </div>
      ) : null}

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto" variant="line">
          <TabsTrigger value="overview">
            <Gauge className="size-4" aria-hidden="true" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="escalations">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Escalations
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="size-4" aria-hidden="true" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="executions">
            <Activity className="size-4" aria-hidden="true" />
            Executions
          </TabsTrigger>
          <TabsTrigger value="scheduler">
            <FileClock className="size-4" aria-hidden="true" />
            Scheduler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewPanel data={data} />
        </TabsContent>
        <TabsContent value="escalations">
          <EscalationsPanel
            data={data}
            role={role}
            onLifecycleAction={setDialogState}
          />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsPanel data={data} />
        </TabsContent>
        <TabsContent value="executions">
          <ExecutionsPanel data={data} />
        </TabsContent>
        <TabsContent value="scheduler">
          <SchedulerPanel
            data={data}
            role={role}
            isMutating={actions.isMutating}
            onStart={() => void actions.startScheduler()}
            onStop={() => void actions.stopScheduler()}
          />
        </TabsContent>
      </Tabs>

      <LifecycleActionDialog
        state={dialogState}
        isMutating={actions.isMutating}
        onClose={() => setDialogState(null)}
        onSubmit={handleLifecycleSubmit}
      />
    </div>
  );
}
