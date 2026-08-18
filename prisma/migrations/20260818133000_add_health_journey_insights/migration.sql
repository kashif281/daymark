-- CreateTable
CREATE TABLE "HealthJourneyInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "headline" TEXT NOT NULL,
    "comparison" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "attention" TEXT NOT NULL,
    "suggestions" JSONB NOT NULL,
    "changed" JSONB,
    "helping" TEXT,
    "hurting" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthJourneyInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthJourneyInsight_userId_logDate_key" ON "HealthJourneyInsight"("userId", "logDate");

-- CreateIndex
CREATE INDEX "HealthJourneyInsight_userId_createdAt_idx" ON "HealthJourneyInsight"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "HealthJourneyInsight" ADD CONSTRAINT "HealthJourneyInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
