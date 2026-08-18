import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { parseDateInput, utcDate } from "@/lib/health";
import { handleSpendError, parseMoney } from "@/lib/spending";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      name?: string;
      amount?: number | string;
      category?: string;
      date?: string;
    };
    const name = body.name?.trim();
    const amount = parseMoney(body.amount);
    const spentAt = body.date ? parseDateInput(body.date) : utcDate(0);

    if (!name) {
      return NextResponse.json({ error: "Item name is required." }, { status: 400 });
    }
    if (!amount) {
      return NextResponse.json({ error: "Price must be greater than 0." }, { status: 400 });
    }
    if (!spentAt) {
      return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
    }

    const entry = await getDb().spendEntry.create({
      data: {
        userId: user.id,
        name,
        amount,
        category: body.category?.trim() || null,
        spentAt,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
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
      return NextResponse.json({ error: "Item is required." }, { status: 400 });
    }

    const deleted = await getDb().spendEntry.deleteMany({
      where: { id, userId: user.id },
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = handleSpendError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
