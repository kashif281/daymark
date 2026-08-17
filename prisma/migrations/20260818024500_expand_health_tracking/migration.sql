-- AlterEnum
ALTER TYPE "HealthRoutineKind" ADD VALUE 'SLEEP';
ALTER TYPE "HealthRoutineKind" ADD VALUE 'WATER';
ALTER TYPE "HealthRoutineKind" ADD VALUE 'MEDITATION';

-- CreateTable
CREATE TABLE "HealthCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "sleepHours" DOUBLE PRECISION,
    "sleepQuality" INTEGER,
    "waterGlasses" INTEGER NOT NULL DEFAULT 0,
    "mood" INTEGER,
    "energy" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "heartRate" INTEGER,
    "bloodSugar" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthSymptom" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthSymptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthMedication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dose" TEXT,
    "schedule" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthMedication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthMedicationLog" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "taken" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthMedicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthCheckIn_userId_logDate_key" ON "HealthCheckIn"("userId", "logDate");

-- CreateIndex
CREATE INDEX "HealthSymptom_userId_logDate_idx" ON "HealthSymptom"("userId", "logDate");

-- CreateIndex
CREATE INDEX "HealthMedication_userId_active_idx" ON "HealthMedication"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "HealthMedicationLog_medicationId_logDate_key" ON "HealthMedicationLog"("medicationId", "logDate");

-- AddForeignKey
ALTER TABLE "HealthCheckIn" ADD CONSTRAINT "HealthCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthSymptom" ADD CONSTRAINT "HealthSymptom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthMedication" ADD CONSTRAINT "HealthMedication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthMedicationLog" ADD CONSTRAINT "HealthMedicationLog_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "HealthMedication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
