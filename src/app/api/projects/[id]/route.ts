import { NextResponse } from "next/server";
import { ProjectStatus, TaskStatus } from "@/generated/prisma/enums";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";

const toUiStatus: Record<TaskStatus, "todo" | "progress" | "done"> = {
  NOT_STARTED: "todo",
  IN_PROGRESS: "progress",
  DONE: "done",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAppUser();
    const { id } = await params;
    const project = await getDb().project.findFirst({
      where: { id, userId: user.id },
      include: {
        tasks: { orderBy: [{ workDate: "desc" }, { createdAt: "asc" }] },
        clientMessages: { orderBy: { receivedAt: "desc" } },
        queuedMessages: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        client: project.clientName ?? "No client",
        color: project.color,
        archived: project.status !== ProjectStatus.ACTIVE,
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
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAppUser();
    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      clientName?: string | null;
      color?: string;
      status?: "active" | "archived";
    };

    const data: {
      name?: string;
      clientName?: string | null;
      color?: string;
      status?: ProjectStatus;
    } = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { error: "Project name is required." },
          { status: 400 },
        );
      }
      data.name = name;
    }

    if (body.clientName !== undefined) {
      data.clientName = body.clientName?.trim() || null;
    }

    if (body.color !== undefined) {
      data.color = body.color.trim() || undefined;
    }

    if (body.status === "active") data.status = ProjectStatus.ACTIVE;
    if (body.status === "archived") data.status = ProjectStatus.PAUSED;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No project updates were provided." },
        { status: 400 },
      );
    }

    const db = getDb();
    const existing = await db.project.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const project = await db.project.update({
      where: { id: existing.id },
      data,
    });

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        client: project.clientName ?? "No client",
        color: project.color,
        archived: project.status !== ProjectStatus.ACTIVE,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAppUser();
    const { id } = await params;
    const db = getDb();
    const existing = await db.project.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    await db.project.delete({ where: { id: existing.id } });
    return NextResponse.json({ deleted: true });
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
