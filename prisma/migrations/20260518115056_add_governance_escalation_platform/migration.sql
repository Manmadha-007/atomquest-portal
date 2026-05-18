-- CreateEnum
CREATE TYPE "EscalationNotificationChannel" AS ENUM ('EMAIL', 'TEAMS');

-- CreateEnum
CREATE TYPE "EscalationNotificationStatus" AS ENUM ('DELIVERED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "EscalationExecutionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED');

-- CreateEnum
CREATE TYPE "EscalationTriggerSource" AS ENUM ('MANUAL', 'API', 'CLI', 'SYSTEM');

-- AlterTable
ALTER TABLE "EscalationLog" ADD COLUMN     "dismissalReason" TEXT,
ADD COLUMN     "dismissedAt" TIMESTAMP(3),
ADD COLUMN     "dismissedByUserId" UUID,
ADD COLUMN     "resolutionNotes" TEXT,
ADD COLUMN     "resolutionReason" TEXT,
ADD COLUMN     "resolvedByUserId" UUID;

-- CreateTable
CREATE TABLE "EscalationNotificationDelivery" (
    "id" UUID NOT NULL,
    "escalationLogId" UUID NOT NULL,
    "channel" "EscalationNotificationChannel" NOT NULL,
    "status" "EscalationNotificationStatus" NOT NULL,
    "recipientUserId" UUID NOT NULL,
    "recipientAddress" TEXT,
    "providerName" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationNotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationExecution" (
    "id" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "EscalationExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "triggeredByUserId" UUID,
    "triggerSource" "EscalationTriggerSource" NOT NULL,
    "rulesEvaluated" INTEGER NOT NULL DEFAULT 0,
    "violationsDetected" INTEGER NOT NULL DEFAULT 0,
    "logsCreated" INTEGER NOT NULL DEFAULT 0,
    "evaluationDuplicates" INTEGER NOT NULL DEFAULT 0,
    "notificationsAttempted" INTEGER NOT NULL DEFAULT 0,
    "notificationsDelivered" INTEGER NOT NULL DEFAULT 0,
    "notificationsSkipped" INTEGER NOT NULL DEFAULT 0,
    "notificationDuplicates" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EscalationNotificationDelivery_escalationLogId_attemptedAt_idx" ON "EscalationNotificationDelivery"("escalationLogId", "attemptedAt");

-- CreateIndex
CREATE INDEX "EscalationNotificationDelivery_recipientUserId_attemptedAt_idx" ON "EscalationNotificationDelivery"("recipientUserId", "attemptedAt");

-- CreateIndex
CREATE INDEX "EscalationNotificationDelivery_channel_status_idx" ON "EscalationNotificationDelivery"("channel", "status");

-- CreateIndex
CREATE INDEX "EscalationNotificationDelivery_status_attemptedAt_idx" ON "EscalationNotificationDelivery"("status", "attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EscalationNotificationDelivery_escalationLogId_channel_reci_key" ON "EscalationNotificationDelivery"("escalationLogId", "channel", "recipientUserId");

-- CreateIndex
CREATE INDEX "EscalationExecution_status_startedAt_idx" ON "EscalationExecution"("status", "startedAt");

-- CreateIndex
CREATE INDEX "EscalationExecution_triggerSource_startedAt_idx" ON "EscalationExecution"("triggerSource", "startedAt");

-- CreateIndex
CREATE INDEX "EscalationExecution_triggeredByUserId_startedAt_idx" ON "EscalationExecution"("triggeredByUserId", "startedAt");

-- CreateIndex
CREATE INDEX "EscalationLog_resolvedByUserId_resolvedAt_idx" ON "EscalationLog"("resolvedByUserId", "resolvedAt");

-- CreateIndex
CREATE INDEX "EscalationLog_dismissedByUserId_dismissedAt_idx" ON "EscalationLog"("dismissedByUserId", "dismissedAt");

-- AddForeignKey
ALTER TABLE "EscalationLog" ADD CONSTRAINT "EscalationLog_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationLog" ADD CONSTRAINT "EscalationLog_dismissedByUserId_fkey" FOREIGN KEY ("dismissedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationNotificationDelivery" ADD CONSTRAINT "EscalationNotificationDelivery_escalationLogId_fkey" FOREIGN KEY ("escalationLogId") REFERENCES "EscalationLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationNotificationDelivery" ADD CONSTRAINT "EscalationNotificationDelivery_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationExecution" ADD CONSTRAINT "EscalationExecution_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
