import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import {
  calendarWeekKeys,
  dateKey,
  handleHealthError,
  parseDateInput,
  toUiCheckIn,
  utcDate,
} from "@/lib/health";

function streakCount(doneDates: Set<string>, todayKey: string) {
  let streak = 0;
  const start = new Date(`${todayKey}T00:00:00.000Z`);
  if (!doneDates.has(todayKey)) {
    start.setUTCDate(start.getUTCDate() - 1);
  }
  while (doneDates.has(dateKey(start))) {
    streak += 1;
    start.setUTCDate(start.getUTCDate() - 1);
  }
  return streak;
}

function daysBack(from: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(from);
    date.setUTCDate(from.getUTCDate() - (count - 1 - index));
    return date;
  });
}

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const db = getDb();
    const today =
      parseDateInput(new URL(request.url).searchParams.get("date")) ?? utcDate(0);
    const days = daysBack(today, 14);
    const start = days[0];
    const todayKey = dateKey(today);

    const [routines, prescriptions, checkIns, symptoms, medications] = await Promise.all([
      db.healthRoutine.findMany({
        where: { userId: user.id, archived: false },
        orderBy: { createdAt: "asc" },
        include: {
          logs: {
            where: { logDate: { gte: start } },
            orderBy: { logDate: "asc" },
          },
        },
      }),
      db.healthPrescription.findMany({
        where: { userId: user.id },
        orderBy: { visitDate: "desc" },
        include: {
          updates: { orderBy: { noteDate: "desc" } },
        },
      }),
      db.healthCheckIn.findMany({
        where: { userId: user.id, logDate: { gte: start } },
        orderBy: { logDate: "asc" },
      }),
      db.healthSymptom.findMany({
        where: { userId: user.id, logDate: { gte: start } },
        orderBy: { createdAt: "desc" },
      }),
      db.healthMedication.findMany({
        where: { userId: user.id, active: true },
        orderBy: { createdAt: "asc" },
        include: {
          logs: {
            where: { logDate: { gte: start } },
            orderBy: { logDate: "asc" },
          },
        },
      }),
    ]);

    const checkInsByDate = new Map(checkIns.map((item) => [dateKey(item.logDate), item]));

    return NextResponse.json({
      checkIn: toUiCheckIn(checkInsByDate.get(todayKey) ?? null),
      checkIns: days.map((date) => ({
        date: date.toISOString(),
        ...toUiCheckIn(checkInsByDate.get(dateKey(date)) ?? null),
      })),
      routines: routines.map((routine) => {
        const logsByDate = new Map(
          routine.logs.map((log) => [dateKey(log.logDate), log]),
        );
        const doneDates = new Set(
          routine.logs.filter((log) => log.completed).map((log) => dateKey(log.logDate)),
        );
        const today = logsByDate.get(todayKey) ?? null;
        const weekKeys = calendarWeekKeys(todayKey);

        return {
          id: routine.id,
          kind: routine.kind,
          title: routine.title,
          target: routine.target,
          today: today
            ? {
                id: today.id,
                completed: today.completed,
                amount: today.amount,
                notes: today.notes,
              }
            : null,
          weekDone: weekKeys.filter((key) => doneDates.has(key)).length,
          streak: streakCount(doneDates, todayKey),
          days: days.map((date) => {
            const key = dateKey(date);
            const log = logsByDate.get(key);
            return {
              date: date.toISOString(),
              completed: log?.completed ?? false,
              amount: log?.amount ?? null,
              notes: log?.notes ?? null,
            };
          }),
        };
      }),
      prescriptions: prescriptions.map((item) => ({
        id: item.id,
        doctorName: item.doctorName,
        visitDate: item.visitDate.toISOString(),
        advice: item.advice,
        medications: item.medications,
        nextVisitAt: item.nextVisitAt?.toISOString() ?? null,
        latestImproving: item.updates[0]?.improving ?? null,
        updates: item.updates.map((note) => ({
          id: note.id,
          noteDate: note.noteDate.toISOString(),
          improving: note.improving,
          stillIssue: note.stillIssue,
        })),
      })),
      symptoms: symptoms
        .filter((item) => dateKey(item.logDate) === todayKey)
        .map((item) => ({
          id: item.id,
          name: item.name,
          severity: item.severity,
          notes: item.notes,
          date: item.logDate.toISOString(),
        })),
      medications: medications.map((item) => {
        const todayLog = item.logs.find((log) => dateKey(log.logDate) === todayKey);
        return {
          id: item.id,
          name: item.name,
          dose: item.dose,
          schedule: item.schedule,
          taken: todayLog?.taken ?? false,
          weekTaken: item.logs.filter((log) => log.taken).length,
        };
      }),
    });
  } catch (error) {
    const result = handleHealthError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
