import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  isReminderEmailConfigured,
  sendTodoReminder,
} from "@/lib/reminder-email";
import {
  isPushConfigured,
  sendTodoPushReminder,
} from "@/lib/push-reminder";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();
  const staleClaim = new Date(now.getTime() - 10 * 60 * 1000);
  const due = await db.todo.findMany({
    where: {
      completed: false,
      reminderAt: { lte: now },
      reminderSentAt: null,
      OR: [{ reminderClaimedAt: null }, { reminderClaimedAt: { lt: staleClaim } }],
    },
    include: {
      user: {
        select: {
          email: true,
          name: true,
          _count: { select: { pushSubscriptions: true } },
        },
      },
    },
    orderBy: { reminderAt: "asc" },
    take: 50,
  });

  let sent = 0;
  let failed = 0;
  let deferred = 0;

  for (const todo of due) {
    const claimed = await db.todo.updateMany({
      where: {
        id: todo.id,
        completed: false,
        reminderSentAt: null,
        OR: [{ reminderClaimedAt: null }, { reminderClaimedAt: { lt: staleClaim } }],
      },
      data: { reminderClaimedAt: now },
    });

    if (!claimed.count) continue;

    try {
      // Push is the primary reminder channel. Email stays optional behind a flag.
      const emailConfigured =
        process.env.REMINDER_EMAIL_ENABLED === "true" &&
        isReminderEmailConfigured();
      const pushConfigured = isPushConfigured();
      const hasPushSubscribers = todo.user._count.pushSubscriptions > 0;

      if (!emailConfigured && !pushConfigured) {
        throw new Error("No reminder delivery channel is configured.");
      }

      // Wait quietly until the user enables notifications on a device.
      if (!emailConfigured && pushConfigured && !hasPushSubscribers) {
        await db.todo.update({
          where: { id: todo.id },
          data: { reminderClaimedAt: null },
        });
        deferred += 1;
        continue;
      }

      let delivered = Boolean(
        todo.emailReminderSentAt || todo.pushReminderSentAt,
      );

      if (emailConfigured && !todo.emailReminderSentAt) {
        await sendTodoReminder({
          email: todo.user.email,
          name: todo.user.name,
          title: todo.title,
        });
        await db.todo.update({
          where: { id: todo.id },
          data: { emailReminderSentAt: new Date() },
        });
        delivered = true;
      }

      if (pushConfigured && hasPushSubscribers && !todo.pushReminderSentAt) {
        const pushDeliveries = await sendTodoPushReminder({
          userId: todo.userId,
          todoId: todo.id,
          title: todo.title,
        });
        if (pushDeliveries > 0) {
          await db.todo.update({
            where: { id: todo.id },
            data: { pushReminderSentAt: new Date() },
          });
          delivered = true;
        }
      }

      if (!delivered) {
        throw new Error("No subscribed reminder channel could deliver.");
      }

      await db.todo.update({
        where: { id: todo.id },
        data: { reminderSentAt: new Date(), reminderClaimedAt: null },
      });
      sent += 1;
    } catch (error) {
      console.error(`Could not send reminder for todo ${todo.id}`, error);
      await db.todo.update({
        where: { id: todo.id },
        data: { reminderClaimedAt: null },
      });
      failed += 1;
    }
  }

  return NextResponse.json({ checked: due.length, sent, failed, deferred });
}
