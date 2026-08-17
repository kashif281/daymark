import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { handleHealthError, optionalNumber, parseDateInput, utcDate } from "@/lib/health";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      name?: string;
      severity?: number | string;
      notes?: string;
      date?: string;
    };
    const name = body.name?.trim();
    const severity = optionalNumber(body.severity, 1, 10);
    const logDate = body.date ? parseDateInput(body.date) : utcDate(0);

    if (!name) {
      return NextResponse.json({ error: "Symptom name is required." }, { status: 400 });
    }
    if (!severity) {
      return NextResponse.json({ error: "Severity from 1 to 10 is required." }, { status: 400 });
    }
    if (!logDate) {
      return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
    }

    const symptom = await getDb().healthSymptom.create({
      data: {
        userId: user.id,
        logDate,
        name,
        severity,
        notes: body.notes?.trim() || null,
      },
    });

    return NextResponse.json({ symptom }, { status: 201 });
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
      return NextResponse.json({ error: "Symptom is required." }, { status: 400 });
    }

    const deleted = await getDb().healthSymptom.deleteMany({
      where: { id, userId: user.id },
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Symptom not found." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = handleHealthError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
