-- AlterTable
ALTER TABLE "Goal" ADD COLUMN "parentGoalId" UUID;

-- CreateIndex
CREATE INDEX "Goal_parentGoalId_idx" ON "Goal"("parentGoalId");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_parentGoalId_ownerId_key" ON "Goal"("parentGoalId", "ownerId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
