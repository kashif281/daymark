import { NextResponse } from "next/server";
import { HealthRoutineKind } from "@/generated/prisma/enums";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { handleHealthError } from "@/lib/health";

const kinds = new Set<string>(Object.values(HealthRoutineKind));

function toKind(value?: string) {
  const kind = value?.trim().toUpperCase();
  return kinds.has(kind ?? "") ? (kind as HealthRoutineKind) : null;
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      kind?: string;
      title?: string;
      target?: string;
    };
    const kind = toKind(body.kind);
    const title = body.title?.trim();

    if (!kind) {
      return NextResponse.json({ error: "Routine type is required." }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Routine title is required." }, { status: 400 });
    }

    const routine = await getDb().healthRoutine.create({
      data: {
        userId: user.id,
        kind,
        title,
        target: body.target?.trim() || null,
      },
    });

    return NextResponse.json({ routine }, { status: 201 });
  } catch (error) {
    const result = handleHealthError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      id?: string;
      title?: string;
      target?: string | null;
      archived?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ error: "Routine is required." }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.healthRoutine.findFirst({
      where: { id: body.id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Routine not found." }, { status: 404 });
    }

    const routine = await db.healthRoutine.update({
      where: { id: existing.id },
      data: {
        title: body.title?.trim() || undefined,
        target: body.target === undefined ? undefined : body.target?.trim() || null,
        archived: body.archived,
      },
    });

    return NextResponse.json({ routine });
  } catch (error) {
    const result = handleHealthError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAppUser();
    const url = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) as { id?: string };
    const id = url.searchParams.get("id") || body.id;

    if (!id) {
      return NextResponse.json({ error: "Routine is required." }, { status: 400 });
    }

    const deleted = await getDb().healthRoutine.deleteMany({
      where: { id, userId: user.id },
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Routine not found." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = handleHealthError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
