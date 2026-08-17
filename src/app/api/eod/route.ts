import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      projectId?: string;
      summary?: string;
      blockers?: string;
      tomorrow?: string;
    };
    const summary = body.summary?.trim();

    if (!summary) {
      return NextResponse.json({ error: "Summary is required." }, { status: 400 });
    }

    const db = getDb();
    const data = {
      summary,
      blockers: body.blockers?.trim() || null,
      tomorrow: body.tomorrow?.trim() || null,
    };

    if (body.projectId) {
      const project = await db.project.findFirst({
        where: { id: body.projectId, userId: user.id },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found." }, { status: 404 });
      }

      const entry = await db.projectEodEntry.upsert({
        where: {
          projectId_entryDate: {
            projectId: project.id,
            entryDate: todayUtc(),
          },
        },
        create: {
          projectId: project.id,
          entryDate: todayUtc(),
          ...data,
        },
        update: data,
      });
      return NextResponse.json({ entry });
    }

    const entry = await db.eodEntry.upsert({
      where: {
        userId_entryDate: {
          userId: user.id,
          entryDate: todayUtc(),
        },
      },
      create: {
        userId: user.id,
        entryDate: todayUtc(),
        ...data,
      },
      update: data,
    });
    return NextResponse.json({ entry });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
