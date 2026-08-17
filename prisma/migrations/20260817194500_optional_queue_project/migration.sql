-- AlterTable
ALTER TABLE "QueuedMessage" ADD COLUMN "userId" TEXT;

UPDATE "QueuedMessage" AS q
SET "userId" = p."userId"
FROM "Project" AS p
WHERE q."projectId" = p."id";

DELETE FROM "QueuedMessage" WHERE "userId" IS NULL;

ALTER TABLE "QueuedMessage" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "QueuedMessage" ALTER COLUMN "projectId" DROP NOT NULL;

ALTER TABLE "QueuedMessage" DROP CONSTRAINT "QueuedMessage_projectId_fkey";

ALTER TABLE "QueuedMessage" ADD CONSTRAINT "QueuedMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QueuedMessage" ADD CONSTRAINT "QueuedMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "QueuedMessage_userId_status_idx" ON "QueuedMessage"("userId", "status");
