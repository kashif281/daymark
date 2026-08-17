import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { isPushConfigured, sendTodoPushReminder } from "@/lib/push-reminder";

export async function POST() {
  try {
    const user = await requireAppUser();
    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: "Push notifications are not configured." },
        { status: 503 },
      );
    }

    const db = getDb();
    const due = await db.todo.findMany({
      where: {
        userId: user.id,
        completed: false,
        reminderAt: { lte: new Date() },
        reminderSentAt: null,
      },
      orderBy: { reminderAt: "asc" },
      take: 20,
    });

    let sent = 0;
    for (const todo of due) {
      const delivered = await sendTodoPushReminder({
        userId: user.id,
        todoId: todo.id,
        title: todo.title,
      });
      if (delivered > 0) {
        await db.todo.update({
          where: { id: todo.id },
          data: {
            pushReminderSentAt: new Date(),
            reminderSentAt: new Date(),
            reminderClaimedAt: null,
          },
        });
        sent += 1;
      }
    }

    return NextResponse.json({ sent });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not send due reminders." },
      { status: 500 },
    );
  }
}
