import { NextResponse } from "next/server";
import { MoneyDirection } from "@/generated/prisma/enums";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { parseDateInput, utcDate } from "@/lib/health";
import { handleSpendError, parseMoney } from "@/lib/spending";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      direction?: string;
      personName?: string;
      amount?: number | string;
      note?: string;
      date?: string;
    };
    const direction =
      body.direction === "GIVEN" || body.direction === "OWED"
        ? (body.direction as MoneyDirection)
        : null;
    const personName = body.personName?.trim();
    const amount = parseMoney(body.amount);
    const loggedAt = body.date ? parseDateInput(body.date) : utcDate(0);

    if (!direction) {
      return NextResponse.json({ error: "Choose given or to pay." }, { status: 400 });
    }
    if (!personName) {
      return NextResponse.json({ error: "Person name is required." }, { status: 400 });
    }
    if (!amount) {
      return NextResponse.json({ error: "Amount must be greater than 0." }, { status: 400 });
    }
    if (!loggedAt) {
      return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
    }

    const loan = await getDb().moneyLoan.create({
      data: {
        userId: user.id,
        direction,
        personName,
        amount,
        note: body.note?.trim() || null,
        loggedAt,
      },
    });

    return NextResponse.json({ loan }, { status: 201 });
  } catch (error) {
    const result = handleSpendError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as { id?: string; settled?: boolean };

    if (!body.id) {
      return NextResponse.json({ error: "Entry is required." }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.moneyLoan.findFirst({
      where: { id: body.id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    const loan = await db.moneyLoan.update({
      where: { id: existing.id },
      data: { settled: body.settled ?? !existing.settled },
    });

    return NextResponse.json({ loan });
  } catch (error) {
    const result = handleSpendError(error);
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
      return NextResponse.json({ error: "Entry is required." }, { status: 400 });
    }

    const deleted = await getDb().moneyLoan.deleteMany({
      where: { id, userId: user.id },
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = handleSpendError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
