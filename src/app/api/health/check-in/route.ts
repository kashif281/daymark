import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import {
  emptyCheckIn,
  handleHealthError,
  optionalNumber,
  parseDateInput,
  toUiCheckIn,
  utcDate,
} from "@/lib/health";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as Record<string, unknown>;
    const logDate = body.date ? parseDateInput(String(body.date)) : utcDate(0);
    if (!logDate) {
      return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
    }

    const patch: Record<string, number | string | null> = {};
    if ("sleepHours" in body) patch.sleepHours = optionalNumber(body.sleepHours, 0, 24);
    if ("sleepQuality" in body) patch.sleepQuality = optionalNumber(body.sleepQuality, 1, 5);
    if ("waterGlasses" in body) patch.waterGlasses = optionalNumber(body.waterGlasses, 0, 30) ?? 0;
    if ("mood" in body) patch.mood = optionalNumber(body.mood, 1, 5);
    if ("energy" in body) patch.energy = optionalNumber(body.energy, 1, 5);
    if ("weightKg" in body) patch.weightKg = optionalNumber(body.weightKg, 0, 400);
    if ("systolic" in body) patch.systolic = optionalNumber(body.systolic, 50, 250);
    if ("diastolic" in body) patch.diastolic = optionalNumber(body.diastolic, 30, 180);
    if ("heartRate" in body) patch.heartRate = optionalNumber(body.heartRate, 30, 250);
    if ("bloodSugar" in body) patch.bloodSugar = optionalNumber(body.bloodSugar, 0, 40);
    if ("temperature" in body) patch.temperature = optionalNumber(body.temperature, 30, 45);
    if ("notes" in body) {
      patch.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    }

    const db = getDb();
    const existing = await db.healthCheckIn.findUnique({
      where: { userId_logDate: { userId: user.id, logDate } },
    });

    const entry = existing
      ? await db.healthCheckIn.update({
          where: { id: existing.id },
          data: patch,
        })
      : await db.healthCheckIn.create({
          data: {
            userId: user.id,
            logDate,
            ...emptyCheckIn(),
            ...patch,
          },
        });

    return NextResponse.json({ checkIn: toUiCheckIn(entry) });
  } catch (error) {
    const result = handleHealthError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
