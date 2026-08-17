import webPush from "web-push";
import { getDb } from "@/lib/db";

export function isPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

export async function sendTodoPushReminder({
  userId,
  todoId,
  title,
}: {
  userId: string;
  todoId: string;
  title: string;
}) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subjectValue = process.env.VAPID_SUBJECT;
  const subject =
    subjectValue &&
    !/^mailto:/i.test(subjectValue) &&
    !/^https?:\/\//i.test(subjectValue)
      ? `mailto:${subjectValue}`
      : subjectValue;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Web push is not configured.");
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  const db = getDb();
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  if (!subscriptions.length) return 0;

  let delivered = 0;
  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify({
          title: "Pending Daymark todo",
          body: title,
          tag: `todo-${todoId}`,
          url: "/",
        }),
        { TTL: 60 * 60, urgency: "high" },
      );
      delivered += 1;
    } catch (error) {
      const statusCode =
        typeof error === "object" && error && "statusCode" in error
          ? Number(error.statusCode)
          : null;

      if (statusCode === 404 || statusCode === 410) {
        await db.pushSubscription.delete({ where: { id: subscription.id } });
        continue;
      }

      throw error;
    }
  }

  return delivered;
}
