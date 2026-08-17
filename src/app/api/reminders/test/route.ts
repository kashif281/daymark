import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import {
  isReminderEmailConfigured,
  sendTodoReminder,
} from "@/lib/reminder-email";

export async function POST() {
  try {
    const user = await requireAppUser();
    if (!isReminderEmailConfigured()) {
      return NextResponse.json(
        { error: "Resend is not configured." },
        { status: 503 },
      );
    }

    await sendTodoReminder({
      email: user.email,
      name: user.name,
      title: "Your Daymark email reminders are working",
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not send the test email." },
      { status: 500 },
    );
  }
}
