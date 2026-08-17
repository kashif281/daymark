import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { handleHealthError, parseDateInput, utcDate } from "@/lib/health";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      routineId?: string;
      completed?: boolean;
      amount?: string | null;
      notes?: string | null;
      date?: string;
    };

    if (!body.routineId) {
      return NextResponse.json({ error: "Routine is required." }, { status: 400 });
    }

    const logDate = body.date ? parseDateInput(body.date) : utcDate(0);
    if (!logDate) {
      return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
    }

    const db = getDb();
    const routine = await db.healthRoutine.findFirst({
      where: { id: body.routineId, userId: user.id },
      select: { id: true },
    });
    if (!routine) {
      return NextResponse.json({ error: "Routine not found." }, { status: 404 });
    }

    const log = await db.healthLog.upsert({
      where: {
        routineId_logDate: {
          routineId: routine.id,
          logDate,
        },
      },
      create: {
        userId: user.id,
        routineId: routine.id,
        logDate,
        completed: body.completed ?? true,
        amount: body.amount?.trim() || null,
        notes: body.notes?.trim() || null,
      },
      update: {
        completed: body.completed,
        amount: body.amount === undefined ? undefined : body.amount?.trim() || null,
        notes: body.notes === undefined ? undefined : body.notes?.trim() || null,
      },
    });

    return NextResponse.json({ log });
  } catch (error) {
    const result = handleHealthError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
