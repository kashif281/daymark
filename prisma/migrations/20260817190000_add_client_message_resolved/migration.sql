-- AlterTable
ALTER TABLE "ClientMessage" ADD COLUMN "resolvedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ClientMessage_projectId_resolvedAt_idx" ON "ClientMessage"("projectId", "resolvedAt");
