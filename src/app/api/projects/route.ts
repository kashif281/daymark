import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";

const PROJECT_COLORS = [
  "#7161d6",
  "#e09548",
  "#4f9c7a",
  "#d46a6a",
  "#4f8ec9",
  "#c27a4f",
];

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      name?: string;
      clientName?: string;
      color?: string;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    const db = getDb();
    const existingCount = await db.project.count({ where: { userId: user.id } });
    const color =
      body.color?.trim() || PROJECT_COLORS[existingCount % PROJECT_COLORS.length];

    const project = await db.project.create({
      data: {
        userId: user.id,
        name,
        clientName: body.clientName?.trim() || null,
        color,
      },
    });

    return NextResponse.json(
      {
        project: {
          id: project.id,
          name: project.name,
          client: project.clientName ?? "No client",
          color: project.color,
          tasks: [],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error(error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
