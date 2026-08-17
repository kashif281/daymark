import "dotenv/config";
import { randomBytes } from "node:crypto";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

function id(prefix = "cseed") {
  return `${prefix}${randomBytes(10).toString("hex")}`;
}

function utcDate(daysAgo) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo),
  );
}

function dateKey(value) {
  return value.toISOString().slice(0, 10);
}

const TASK_TITLES = [
  "Fix login redirect",
  "Review client feedback",
  "Update dashboard cards",
  "Write API tests",
  "Polish mobile layout",
  "Sync reminder worker",
  "Clean dead CSS",
  "Ship progress chart",
  "Document seed data",
  "Triage inbox",
];

const SUMMARIES = [
  "Shipped the core flow and cleaned up leftover bugs.",
  "Mostly planning and review. Light coding day.",
  "Closed several tickets and unblocked tomorrow's work.",
  "Deep work on the main feature. Fewer meetings.",
  "Catch-up day: comments, small fixes, and a short EOD.",
  "Strong delivery day. Hit the planned scope.",
];

async function seedUser(userId, projectId) {
  for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
    const date = utcDate(daysAgo);
    const weekday = date.getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const key = dateKey(date);

    let hours = 0;
    let doneCount = 0;
    let extraCount = 0;
    if (!isWeekend) {
      if (daysAgo <= 6) {
        hours = 7.5 + (daysAgo % 3) * 0.5;
        doneCount = 3 + (daysAgo % 2);
        extraCount = 1;
      } else if (daysAgo <= 13) {
        hours = 4.5 + (daysAgo % 3) * 0.5;
        doneCount = 1 + (daysAgo % 2);
        extraCount = 1;
      } else {
        hours = 3.5 + (daysAgo % 4) * 0.5;
        doneCount = daysAgo % 3 === 0 ? 0 : 1;
        extraCount = 1;
      }
    }

    await client.query(
      `INSERT INTO "EodEntry" (id, "userId", "entryDate", summary, blockers, tomorrow, "hoursWorked", "createdAt", "updatedAt")
       VALUES ($1, $2, $3::date, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT ("userId", "entryDate")
       DO UPDATE SET summary = EXCLUDED.summary, blockers = EXCLUDED.blockers, tomorrow = EXCLUDED.tomorrow, "hoursWorked" = EXCLUDED."hoursWorked", "updatedAt" = NOW()`,
      [
        id(),
        userId,
        key,
        isWeekend ? "Light weekend catch-up." : SUMMARIES[daysAgo % SUMMARIES.length],
        daysAgo % 5 === 0 ? "Waiting on client copy." : null,
        isWeekend ? "Pick up weekday tasks." : "Continue the in-progress work.",
        hours,
      ],
    );

    await client.query(
      `DELETE FROM "Task" WHERE "projectId" = $1 AND "workDate" = $2::date AND title LIKE '[seed] %'`,
      [projectId, key],
    );

    const statuses = [
      ...Array.from({ length: doneCount }, () => "DONE"),
      ...Array.from({ length: extraCount }, () =>
        daysAgo === 0 ? "IN_PROGRESS" : "NOT_STARTED",
      ),
    ];

    for (const [index, status] of statuses.entries()) {
      const title = `[seed] ${TASK_TITLES[(daysAgo + index) % TASK_TITLES.length]}`;
      await client.query(
        `INSERT INTO "Task" (id, "projectId", title, "workDate", status, "sortOrder", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4::date, $5, $6, NOW(), NOW())`,
        [id("ctask"), projectId, title, key, status, index],
      );
    }
  }
}

await client.connect();

const users = (
  await client.query(`
    SELECT u.id, p.id AS "projectId", p.name
    FROM "User" u
    JOIN "Project" p ON p."userId" = u.id
    WHERE p.status = 'ACTIVE'
    ORDER BY p."createdAt"
  `)
).rows;

const byUser = new Map();
for (const row of users) {
  if (!byUser.has(row.id)) byUser.set(row.id, row);
}

for (const row of byUser.values()) {
  await seedUser(row.id, row.projectId);
  console.log(`Seeded 30 days for ${row.id} on project ${row.name}`);
}

await client.end();
