import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { handleHealthError, parseDateInput, utcDate } from "@/lib/health";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      name?: string;
      dose?: string;
      schedule?: string;
    };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Medication name is required." }, { status: 400 });
    }

    const medication = await getDb().healthMedication.create({
      data: {
        userId: user.id,
        name,
        dose: body.dose?.trim() || null,
        schedule: body.schedule?.trim() || null,
      },
    });

    return NextResponse.json({ medication }, { status: 201 });
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
      taken?: boolean;
      date?: string;
      active?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ error: "Medication is required." }, { status: 400 });
    }

    const db = getDb();
    const medication = await db.healthMedication.findFirst({
      where: { id: body.id, userId: user.id },
    });
    if (!medication) {
      return NextResponse.json({ error: "Medication not found." }, { status: 404 });
    }

    if (body.active === false) {
      const updated = await db.healthMedication.update({
        where: { id: medication.id },
        data: { active: false },
      });
      return NextResponse.json({ medication: updated });
    }

    const logDate = body.date ? parseDateInput(body.date) : utcDate(0);
    if (!logDate) {
      return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
    }

    const log = await db.healthMedicationLog.upsert({
      where: {
        medicationId_logDate: {
          medicationId: medication.id,
          logDate,
        },
      },
      create: {
        medicationId: medication.id,
        logDate,
        taken: body.taken ?? true,
      },
      update: { taken: body.taken ?? true },
    });

    return NextResponse.json({ log });
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
      return NextResponse.json({ error: "Medication is required." }, { status: 400 });
    }

    const deleted = await getDb().healthMedication.deleteMany({
      where: { id, userId: user.id },
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Medication not found." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = handleHealthError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
