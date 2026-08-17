import { NextResponse } from "next/server";
import { MessageStatus } from "@/generated/prisma/enums";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAppUser();
    const { id } = await params;
    const body = (await request.json()) as {
      type?: "client" | "queued";
      content?: string;
      senderName?: string;
    };

    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "Message content is required." },
        { status: 400 },
      );
    }

    const db = getDb();
    const project = await db.project.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (body.type === "queued") {
      const message = await db.queuedMessage.create({
        data: { userId: user.id, projectId: project.id, content },
      });

      return NextResponse.json(
        {
          message: {
            id: message.id,
            content: message.content,
            status: message.status.toLowerCase(),
          },
        },
        { status: 201 },
      );
    }

    const message = await db.clientMessage.create({
      data: {
        projectId: project.id,
        content,
        senderName: body.senderName?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        message: {
          id: message.id,
          sender: message.senderName ?? "Client",
          content: message.content,
          receivedAt: message.receivedAt.toISOString(),
          resolved: Boolean(message.resolvedAt),
        },
      },
      { status: 201 },
    );
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
      type?: "client" | "queued";
      messageId?: string;
      status?: "draft" | "ready" | "sent";
      resolved?: boolean;
    };

    if (!body.messageId) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    const db = getDb();

    if (body.type === "client" || body.resolved !== undefined) {
      const existing = await db.clientMessage.findFirst({
        where: {
          id: body.messageId,
          projectId: id,
          project: { userId: user.id },
        },
        select: { id: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Message not found." }, { status: 404 });
      }

      const message = await db.clientMessage.update({
        where: { id: existing.id },
        data: {
          resolvedAt: body.resolved === false ? null : new Date(),
        },
      });

      return NextResponse.json({
        message: {
          id: message.id,
          sender: message.senderName ?? "Client",
          content: message.content,
          receivedAt: message.receivedAt.toISOString(),
          resolved: Boolean(message.resolvedAt),
        },
      });
    }

    if (!body.status) {
      return NextResponse.json(
        { error: "Message and status are required." },
        { status: 400 },
      );
    }
    const existing = await db.queuedMessage.findFirst({
      where: {
        id: body.messageId,
        projectId: id,
        project: { userId: user.id },
      },
      select: { id: true },
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
      message: {
        id: message.id,
        content: message.content,
        status: message.status.toLowerCase(),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAppUser();
    const { id } = await params;
    const body = (await request.json()) as {
      type?: "client" | "queued";
      messageId?: string;
    };

    if (!body.messageId) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    const db = getDb();

    if (body.type === "queued") {
      const existing = await db.queuedMessage.findFirst({
        where: {
          id: body.messageId,
          projectId: id,
          project: { userId: user.id },
        },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Message not found." }, { status: 404 });
      }
      await db.queuedMessage.delete({ where: { id: existing.id } });
      return NextResponse.json({ deleted: true });
    }

    const existing = await db.clientMessage.findFirst({
      where: {
        id: body.messageId,
        projectId: id,
        project: { userId: user.id },
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }
    await db.clientMessage.delete({ where: { id: existing.id } });
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
