import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { handleHealthError, parseDateInput, utcDate } from "@/lib/health";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      doctorName?: string;
      visitDate?: string;
      advice?: string;
      medications?: string;
      nextVisitAt?: string | null;
    };
    const advice = body.advice?.trim();
    const visitDate = parseDateInput(body.visitDate) ?? utcDate(0);
    const nextVisitAt =
      body.nextVisitAt === undefined
        ? undefined
        : body.nextVisitAt
          ? parseDateInput(body.nextVisitAt)
          : null;

    if (!advice) {
      return NextResponse.json({ error: "What the doctor said is required." }, { status: 400 });
    }
    if (body.nextVisitAt && nextVisitAt === null) {
      return NextResponse.json({ error: "Next visit date is invalid." }, { status: 400 });
    }

    const prescription = await getDb().healthPrescription.create({
      data: {
        userId: user.id,
        doctorName: body.doctorName?.trim() || null,
        visitDate,
        advice,
        medications: body.medications?.trim() || null,
        nextVisitAt: nextVisitAt ?? null,
      },
    });

    return NextResponse.json({ prescription }, { status: 201 });
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
      doctorName?: string | null;
      visitDate?: string;
      advice?: string;
      medications?: string | null;
      nextVisitAt?: string | null;
    };

    if (!body.id) {
      return NextResponse.json({ error: "Prescription is required." }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.healthPrescription.findFirst({
      where: { id: body.id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Prescription not found." }, { status: 404 });
    }

    const visitDate =
      body.visitDate === undefined ? undefined : parseDateInput(body.visitDate);
    const nextVisitAt =
      body.nextVisitAt === undefined
        ? undefined
        : body.nextVisitAt
          ? parseDateInput(body.nextVisitAt)
          : null;

    if (body.visitDate && !visitDate) {
      return NextResponse.json({ error: "Visit date is invalid." }, { status: 400 });
    }
    if (body.nextVisitAt && nextVisitAt === null) {
      return NextResponse.json({ error: "Next visit date is invalid." }, { status: 400 });
    }

    const prescription = await db.healthPrescription.update({
      where: { id: existing.id },
      data: {
        doctorName:
          body.doctorName === undefined ? undefined : body.doctorName?.trim() || null,
        visitDate: visitDate ?? undefined,
        advice: body.advice?.trim() || undefined,
        medications:
          body.medications === undefined ? undefined : body.medications?.trim() || null,
        nextVisitAt:
          nextVisitAt === undefined
            ? undefined
            : nextVisitAt === null
              ? { set: null }
              : nextVisitAt,
      },
    });

    return NextResponse.json({ prescription });
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
      return NextResponse.json({ error: "Prescription is required." }, { status: 400 });
    }

    const deleted = await getDb().healthPrescription.deleteMany({
      where: { id, userId: user.id },
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Prescription not found." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = handleHealthError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
