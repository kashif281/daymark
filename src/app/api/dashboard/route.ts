import { NextResponse } from "next/server";
import { TaskStatus } from "@/generated/prisma/enums";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";

const toUiStatus: Record<TaskStatus, "todo" | "progress" | "done"> = {
  NOT_STARTED: "todo",
  IN_PROGRESS: "progress",
  DONE: "done",
};

const fromUiStatus = {
  todo: TaskStatus.NOT_STARTED,
  progress: TaskStatus.IN_PROGRESS,
  done: TaskStatus.DONE,
} as const;

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function GET() {
  try {
    const user = await requireAppUser();
    const db = getDb();

    const projectCount = await db.project.count({ where: { userId: user.id } });
    if (projectCount === 0) {
      await db.project.create({
        data: {
          userId: user.id,
          name: "My first project",
          clientName: "Personal",
          color: "#7161d6",
        },
      });
    }

    const projects = await db.project.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      include: {
        tasks: {
          where: { workDate: todayUtc() },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        clientMessages: { orderBy: { receivedAt: "desc" }, take: 3 },
        queuedMessages: {
          where: { status: { not: "SENT" } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    const todos = await db.todo.findMany({
      where: { userId: user.id },
      orderBy: [{ completed: "asc" }, { reminderAt: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      user: { name: user.name, email: user.email },
      todos: todos.map((todo) => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        reminderAt: todo.reminderAt?.toISOString() ?? null,
        reminderSentAt: todo.reminderSentAt?.toISOString() ?? null,
      })),
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        client: project.clientName ?? "No client",
        color: project.color,
        tasks: project.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          screenshotUrl: task.screenshotUrl,
          status: toUiStatus[task.status],
        })),
        clientMessages: project.clientMessages.map((message) => ({
          id: message.id,
          sender: message.senderName ?? "Client",
          content: message.content,
          receivedAt: message.receivedAt.toISOString(),
        })),
        queuedMessages: project.queuedMessages.map((message) => ({
          id: message.id,
          content: message.content,
          status: message.status.toLowerCase(),
        })),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      screenshotUrl?: string;
      projectId?: string;
    };
    const title = body.title?.trim();
    const description = body.description?.trim() || null;
    const screenshotUrl = body.screenshotUrl?.trim() || null;

    if (!title) {
      return NextResponse.json({ error: "Task title is required." }, { status: 400 });
    }

    const db = getDb();
    const project = await db.project.findFirst({
      where: body.projectId
        ? { id: body.projectId, userId: user.id }
        : { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const task = await db.task.create({
      data: {
        projectId: project.id,
        title,
        description,
        screenshotUrl,
        workDate: todayUtc(),
      },
    });

    return NextResponse.json(
      {
        projectId: project.id,
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          screenshotUrl: task.screenshotUrl,
          status: toUiStatus[task.status],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      taskId?: string;
      status?: keyof typeof fromUiStatus;
    };

    if (!body.taskId || !body.status || !(body.status in fromUiStatus)) {
      return NextResponse.json({ error: "Valid task and status are required." }, { status: 400 });
    }

    const db = getDb();
    const task = await db.task.findFirst({
      where: { id: body.taskId, project: { userId: user.id } },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const updated = await db.task.update({
      where: { id: task.id },
      data: { status: fromUiStatus[body.status] },
    });

    return NextResponse.json({
      task: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        screenshotUrl: updated.screenshotUrl,
        status: toUiStatus[updated.status],
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.error(error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
