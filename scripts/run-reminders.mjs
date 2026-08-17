import "dotenv/config";

const appUrl = process.env.APP_URL;
const secret = process.env.CRON_SECRET;

if (!appUrl || !secret) {
  throw new Error("APP_URL and CRON_SECRET are required.");
}

const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/cron/reminders`, {
  headers: { Authorization: `Bearer ${secret}` },
});
const result = await response.text();

if (!response.ok) {
  throw new Error(`Reminder job failed (${response.status}): ${result}`);
}

console.log(result);
