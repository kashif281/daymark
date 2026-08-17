import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";

function toUiTodo(todo: {
  id: string;
  title: string;
  completed: boolean;
  reminderAt: Date | null;
  reminderSentAt: Date | null;
}) {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    reminderAt: todo.reminderAt?.toISOString() ?? null,
    reminderSentAt: todo.reminderSentAt?.toISOString() ?? null,
  };
}

export async function GET() {
  try {
    const user = await requireAppUser();
    const todos = await getDb().todo.findMany({
      where: { userId: user.id },
      orderBy: [{ completed: "asc" }, { reminderAt: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ todos: todos.map(toUiTodo) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      title?: string;
      reminderAt?: string | null;
    };
    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json({ error: "Todo title is required." }, { status: 400 });
    }

    const reminderAt = parseReminder(body.reminderAt);
    if (body.reminderAt && !reminderAt) {
      return NextResponse.json({ error: "Reminder time is invalid." }, { status: 400 });
    }

    const todo = await getDb().todo.create({
      data: { userId: user.id, title, reminderAt },
    });

    return NextResponse.json({ todo: toUiTodo(todo) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      id?: string;
      completed?: boolean;
      title?: string;
      reminderAt?: string | null;
    };

    if (!body.id) {
      return NextResponse.json({ error: "Todo is required." }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.todo.findFirst({
      where: { id: body.id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Todo not found." }, { status: 404 });
    }

    const reminderAt =
      body.reminderAt === undefined ? undefined : parseReminder(body.reminderAt);
    if (body.reminderAt && !reminderAt) {
      return NextResponse.json({ error: "Reminder time is invalid." }, { status: 400 });
    }

    const todo = await db.todo.update({
      where: { id: existing.id },
      data: {
        completed: body.completed,
        title: body.title?.trim() || undefined,
        reminderAt,
        reminderClaimedAt: reminderAt !== undefined ? null : undefined,
        reminderSentAt: reminderAt !== undefined ? null : undefined,
        emailReminderSentAt: reminderAt !== undefined ? null : undefined,
        pushReminderSentAt: reminderAt !== undefined ? null : undefined,
      },
    });

    return NextResponse.json({ todo: toUiTodo(todo) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAppUser();
    const url = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) as { id?: string };
    const id = url.searchParams.get("id") || body.id;
    const clearCompleted = url.searchParams.get("completed") === "true";
    const db = getDb();

    if (clearCompleted) {
      await db.todo.deleteMany({
        where: { userId: user.id, completed: true },
      });
      return new NextResponse(null, { status: 204 });
    }

    if (!id) {
      return NextResponse.json({ error: "Todo is required." }, { status: 400 });
    }

    const deleted = await db.todo.deleteMany({
      where: { id, userId: user.id },
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Todo not found." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}

function parseReminder(value?: string | null) {
  if (!value) return null;
  const reminder = new Date(value);
  return Number.isNaN(reminder.getTime()) ? null : reminder;
}

function handleError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.error(error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
