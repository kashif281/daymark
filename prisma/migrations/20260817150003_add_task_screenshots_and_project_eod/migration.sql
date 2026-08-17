-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "screenshotUrl" TEXT;

-- CreateTable
CREATE TABLE "ProjectEodEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "blockers" TEXT,
    "tomorrow" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectEodEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectEodEntry_projectId_entryDate_key" ON "ProjectEodEntry"("projectId", "entryDate");

-- AddForeignKey
ALTER TABLE "ProjectEodEntry" ADD CONSTRAINT "ProjectEodEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
