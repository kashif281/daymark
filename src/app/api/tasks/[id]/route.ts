import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { dateKey } from "@/lib/health";
import { parseOptionalHours } from "@/lib/task-notes";

async function findOwnedTask(id: string, userId: string) {
  return getDb().task.findFirst({
    where: { id, project: { userId } },
    select: { id: true },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAppUser();
    const { id } = await params;
    const task = await getDb().task.findFirst({
      where: { id, project: { userId: user.id } },
      select: {
        id: true,
        title: true,
        description: true,
        screenshotUrl: true,
        workDate: true,
        hoursWorked: true,
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        screenshotUrl: task.screenshotUrl,
        workDate: dateKey(task.workDate),
        hoursWorked: task.hoursWorked,
        comments: task.comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          author: comment.user.name ?? comment.user.email,
          createdAt: comment.createdAt.toISOString(),
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
      description?: string | null;
      screenshotUrl?: string | null;
      hoursWorked?: number | string | null;
    };

    const hasDescription = Object.hasOwn(body, "description");
    const hasScreenshot = Object.hasOwn(body, "screenshotUrl");
    const hasHours = Object.hasOwn(body, "hoursWorked");

    if (!hasDescription && !hasScreenshot && !hasHours) {
      return NextResponse.json(
        { error: "A description, screenshot link, or hours value is required." },
        { status: 400 },
      );
    }

    const task = await findOwnedTask(id, user.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const hoursWorked = hasHours ? parseOptionalHours(body.hoursWorked) : undefined;

    const updated = await getDb().task.update({
      where: { id: task.id },
      data: {
        ...(hasDescription
          ? { description: body.description?.trim() || null }
          : {}),
        ...(hasScreenshot
          ? { screenshotUrl: body.screenshotUrl?.trim() || null }
          : {}),
        ...(hasHours ? { hoursWorked: hoursWorked ?? null } : {}),
      },
      select: {
        id: true,
        description: true,
        screenshotUrl: true,
        workDate: true,
        hoursWorked: true,
      },
    });

    return NextResponse.json({
      task: {
        ...updated,
        workDate: dateKey(updated.workDate),
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
    const task = await findOwnedTask(id, user.id);

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    await getDb().task.delete({ where: { id: task.id } });
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
