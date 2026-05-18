-- CreateEnum
CREATE TYPE "EscalationType" AS ENUM ('GOAL_NOT_SUBMITTED', 'APPROVAL_PENDING_TOO_LONG', 'CHECKIN_MISSED');

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "EscalationRule" (
    "id" UUID NOT NULL,
    "type" "EscalationType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "thresholdDays" SMALLINT NOT NULL,
    "escalationLevel" "EscalationLevel" NOT NULL,
    "targetRole" "UserRole",
    "reviewCycleId" UUID,
    "departmentScope" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationLog" (
    "id" UUID NOT NULL,
    "escalationRuleId" UUID NOT NULL,
    "escalationType" "EscalationType" NOT NULL,
    "escalationLevel" "EscalationLevel" NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "employeeId" UUID NOT NULL,
    "managerId" UUID,
    "targetGoalId" UUID,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EscalationRule_type_isActive_idx" ON "EscalationRule"("type", "isActive");

-- CreateIndex
CREATE INDEX "EscalationRule_escalationLevel_isActive_idx" ON "EscalationRule"("escalationLevel", "isActive");

-- CreateIndex
CREATE INDEX "EscalationRule_targetRole_idx" ON "EscalationRule"("targetRole");

-- CreateIndex
CREATE INDEX "EscalationRule_reviewCycleId_idx" ON "EscalationRule"("reviewCycleId");

-- CreateIndex
CREATE INDEX "EscalationRule_departmentScope_idx" ON "EscalationRule"("departmentScope");

-- CreateIndex
CREATE INDEX "EscalationLog_escalationRuleId_triggeredAt_idx" ON "EscalationLog"("escalationRuleId", "triggeredAt");

-- CreateIndex
CREATE INDEX "EscalationLog_employeeId_triggeredAt_idx" ON "EscalationLog"("employeeId", "triggeredAt");

-- CreateIndex
CREATE INDEX "EscalationLog_managerId_triggeredAt_idx" ON "EscalationLog"("managerId", "triggeredAt");

-- CreateIndex
CREATE INDEX "EscalationLog_targetGoalId_idx" ON "EscalationLog"("targetGoalId");

-- CreateIndex
CREATE INDEX "EscalationLog_escalationType_status_idx" ON "EscalationLog"("escalationType", "status");

-- CreateIndex
CREATE INDEX "EscalationLog_escalationLevel_status_idx" ON "EscalationLog"("escalationLevel", "status");

-- CreateIndex
CREATE INDEX "EscalationLog_status_triggeredAt_idx" ON "EscalationLog"("status", "triggeredAt");

-- AddForeignKey
ALTER TABLE "EscalationRule" ADD CONSTRAINT "EscalationRule_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "ReviewCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationLog" ADD CONSTRAINT "EscalationLog_escalationRuleId_fkey" FOREIGN KEY ("escalationRuleId") REFERENCES "EscalationRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationLog" ADD CONSTRAINT "EscalationLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationLog" ADD CONSTRAINT "EscalationLog_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationLog" ADD CONSTRAINT "EscalationLog_targetGoalId_fkey" FOREIGN KEY ("targetGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
