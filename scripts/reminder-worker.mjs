import "dotenv/config";

const appUrl = process.env.APP_URL;
const secret = process.env.CRON_SECRET;
const intervalMs = Number(process.env.REMINDER_POLL_INTERVAL_MS || 30000);

if (!appUrl || !secret) {
  throw new Error("APP_URL and CRON_SECRET are required.");
}

console.log(`Reminder worker checking every ${intervalMs / 1000} seconds.`);
await checkReminders();
setInterval(() => void checkReminders(), intervalMs);

async function checkReminders() {
  try {
    const response = await fetch(
      `${appUrl.replace(/\/$/, "")}/api/cron/reminders`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const result = await response.text();
    if (!response.ok) {
      throw new Error(`Reminder job failed (${response.status}): ${result}`);
    }
    console.log(new Date().toISOString(), result);
  } catch (error) {
    console.error(new Date().toISOString(), error);
  }
}
