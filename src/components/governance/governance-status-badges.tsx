import { Badge } from "@/components/ui/badge";
import {
  formatGovernanceEnum,
  getEscalationStatusTone,
  getExecutionStatusTone,
} from "@/features/escalation/ui/view-models";
import { cn } from "@/lib/utils";

export function EscalationStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md", getEscalationStatusTone(status))}
    >
      {formatGovernanceEnum(status)}
    </Badge>
  );
}

export function ExecutionStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md", getExecutionStatusTone(status))}
    >
      {formatGovernanceEnum(status)}
    </Badge>
  );
}
