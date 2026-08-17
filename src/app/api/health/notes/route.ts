import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { handleHealthError, parseDateInput, utcDate } from "@/lib/health";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      prescriptionId?: string;
      improving?: string;
      stillIssue?: string;
      noteDate?: string;
    };
    const improving = body.improving?.trim();

    if (!body.prescriptionId) {
      return NextResponse.json({ error: "Prescription is required." }, { status: 400 });
    }
    if (!improving) {
      return NextResponse.json({ error: "What is improving is required." }, { status: 400 });
    }

    const noteDate = body.noteDate ? parseDateInput(body.noteDate) : utcDate(0);
    if (!noteDate) {
      return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
    }

    const db = getDb();
    const prescription = await db.healthPrescription.findFirst({
      where: { id: body.prescriptionId, userId: user.id },
      select: { id: true },
    });
    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found." }, { status: 404 });
    }

    const note = await db.healthProgressNote.create({
      data: {
        prescriptionId: prescription.id,
        noteDate,
        improving,
        stillIssue: body.stillIssue?.trim() || null,
      },
    });

    return NextResponse.json({ note }, { status: 201 });
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
      return NextResponse.json({ error: "Note is required." }, { status: 400 });
    }

    const db = getDb();
    const note = await db.healthProgressNote.findFirst({
      where: {
        id,
        prescription: { userId: user.id },
      },
      select: { id: true },
    });
    if (!note) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    await db.healthProgressNote.delete({ where: { id: note.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = handleHealthError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
