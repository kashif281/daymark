import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";

function utcDate(daysAgo = 0) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo),
  );
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const user = await requireAppUser();
    const db = getDb();
    const start = utcDate(29);

    const [entries, tasks] = await Promise.all([
      db.eodEntry.findMany({
        where: { userId: user.id, entryDate: { gte: start } },
        orderBy: { entryDate: "asc" },
      }),
      db.task.findMany({
        where: {
          workDate: { gte: start },
          project: { userId: user.id },
        },
        include: {
          project: { select: { name: true, color: true } },
        },
        orderBy: { workDate: "asc" },
      }),
    ]);

    const days = Array.from({ length: 30 }, (_, index) => {
      const date = utcDate(29 - index);
      const key = dateKey(date);
      const entry = entries.find((item) => dateKey(item.entryDate) === key);
      const dayTasks = tasks.filter((task) => dateKey(task.workDate) === key);
      return {
        date: date.toISOString(),
        hours: Math.round((entry?.hoursWorked ?? 0) * 10) / 10,
        summary: entry?.summary ?? null,
        blockers: entry?.blockers ?? null,
        tomorrow: entry?.tomorrow ?? null,
        tasksDone: dayTasks.filter((task) => task.status === "DONE").length,
        tasksTotal: dayTasks.length,
        tasks: dayTasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status === "DONE" ? "done" : task.status === "IN_PROGRESS" ? "progress" : "todo",
          projectName: task.project.name,
          projectColor: task.project.color,
        })),
      };
    });

    const recent = days.slice(-7);
    const previous = days.slice(-14, -7);
    const sum = (items: typeof days, key: "hours" | "tasksDone") =>
      items.reduce((total, day) => total + day[key], 0);

    const hoursRecent = Math.round(sum(recent, "hours") * 10) / 10;
    const hoursPrevious = Math.round(sum(previous, "hours") * 10) / 10;
    const tasksRecent = sum(recent, "tasksDone");
    const tasksPrevious = sum(previous, "tasksDone");
    const today = days[days.length - 1];
    const yesterday = days[days.length - 2];
    const bestDay = (items: typeof days) =>
      [...items].sort(
        (a, b) => b.hours - a.hours || b.tasksDone - a.tasksDone,
      )[0] ?? null;

    return NextResponse.json({
      days,
      comparison: {
        hoursRecent,
        hoursPrevious,
        tasksRecent,
        tasksPrevious,
        hoursDelta: Math.round((hoursRecent - hoursPrevious) * 10) / 10,
        tasksDelta: tasksRecent - tasksPrevious,
        todayHours: today?.hours ?? 0,
        yesterdayHours: yesterday?.hours ?? 0,
        todayTasks: today?.tasksDone ?? 0,
        yesterdayTasks: yesterday?.tasksDone ?? 0,
        todayHoursDelta: Math.round(((today?.hours ?? 0) - (yesterday?.hours ?? 0)) * 10) / 10,
        todayTasksDelta: (today?.tasksDone ?? 0) - (yesterday?.tasksDone ?? 0),
        bestThisWeek: bestDay(recent),
        bestLastWeek: bestDay(previous),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
