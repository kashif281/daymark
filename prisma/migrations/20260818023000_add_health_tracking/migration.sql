-- CreateEnum
CREATE TYPE "HealthRoutineKind" AS ENUM ('WALK', 'EXERCISE', 'DIET', 'OTHER');

-- CreateTable
CREATE TABLE "HealthRoutine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "HealthRoutineKind" NOT NULL,
    "title" TEXT NOT NULL,
    "target" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "amount" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthPrescription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "doctorName" TEXT,
    "visitDate" DATE NOT NULL,
    "advice" TEXT NOT NULL,
    "medications" TEXT,
    "nextVisitAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthProgressNote" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "noteDate" DATE NOT NULL,
    "improving" TEXT NOT NULL,
    "stillIssue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthProgressNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthRoutine_userId_archived_idx" ON "HealthRoutine"("userId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "HealthLog_routineId_logDate_key" ON "HealthLog"("routineId", "logDate");

-- CreateIndex
CREATE INDEX "HealthLog_userId_logDate_idx" ON "HealthLog"("userId", "logDate");

-- CreateIndex
CREATE INDEX "HealthPrescription_userId_visitDate_idx" ON "HealthPrescription"("userId", "visitDate");

-- CreateIndex
CREATE INDEX "HealthProgressNote_prescriptionId_noteDate_idx" ON "HealthProgressNote"("prescriptionId", "noteDate");

-- AddForeignKey
ALTER TABLE "HealthRoutine" ADD CONSTRAINT "HealthRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthLog" ADD CONSTRAINT "HealthLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthLog" ADD CONSTRAINT "HealthLog_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "HealthRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthPrescription" ADD CONSTRAINT "HealthPrescription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthProgressNote" ADD CONSTRAINT "HealthProgressNote_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "HealthPrescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
