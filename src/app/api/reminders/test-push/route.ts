import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import {
  isPushConfigured,
  sendTodoPushReminder,
} from "@/lib/push-reminder";

export async function POST() {
  try {
    const user = await requireAppUser();

    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: "Push notifications are not configured." },
        { status: 503 },
      );
    }

    const delivered = await sendTodoPushReminder({
      userId: user.id,
      todoId: "test-push",
      title: "Daymark notifications are working",
    });

    if (!delivered) {
      return NextResponse.json(
        {
          error:
            "No device is subscribed yet. Enable notifications on this device first.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ sent: true, delivered });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Could not send the test notification." },
      { status: 500 },
    );
  }
}
