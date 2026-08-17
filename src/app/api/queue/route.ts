import { NextResponse } from "next/server";
import { MessageStatus } from "@/generated/prisma/enums";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";

function toUiMessage(
  message: {
    id: string;
    content: string;
    status: MessageStatus;
    projectId: string | null;
  },
  project?: { name: string; color: string } | null,
) {
  return {
    id: message.id,
    content: message.content,
    status: message.status.toLowerCase(),
    projectId: message.projectId,
    projectName: project?.name ?? null,
    color: project?.color ?? "#9a9994",
  };
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      content?: string;
      projectId?: string | null;
    };
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "Message content is required." },
        { status: 400 },
      );
    }

    const db = getDb();
    let project: { id: string; name: string; color: string } | null = null;
    if (body.projectId) {
      project = await db.project.findFirst({
        where: { id: body.projectId, userId: user.id },
        select: { id: true, name: true, color: true },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found." }, { status: 404 });
      }
    }

    const message = await db.queuedMessage.create({
      data: {
        userId: user.id,
        projectId: project?.id ?? null,
        content,
      },
    });

    return NextResponse.json(
      { message: toUiMessage(message, project) },
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
      messageId?: string;
      status?: "draft" | "ready" | "sent";
    };
    if (!body.messageId || !body.status) {
      return NextResponse.json(
        { error: "Message and status are required." },
        { status: 400 },
      );
    }

    const db = getDb();
    const existing = await db.queuedMessage.findFirst({
      where: { id: body.messageId, userId: user.id },
      include: { project: { select: { name: true, color: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const status = body.status.toUpperCase() as MessageStatus;
    const message = await db.queuedMessage.update({
      where: { id: existing.id },
      data: {
        status,
        sentAt: status === "SENT" ? new Date() : null,
      },
    });

    return NextResponse.json({
      message: toUiMessage(message, existing.project),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAppUser();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const deleted = await getDb().queuedMessage.deleteMany({
      where: { id, userId: user.id },
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
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
