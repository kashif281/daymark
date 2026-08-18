import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { handleSpendError, parseMoney, parseMonth } from "@/lib/spending";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      month?: string;
      amount?: number | string | null;
    };
    const month = parseMonth(body.month);
    if (!month) {
      return NextResponse.json({ error: "Month is invalid." }, { status: 400 });
    }

    const db = getDb();
    if (body.amount === "" || body.amount === null || body.amount === undefined) {
      await db.monthlyBudget.deleteMany({
        where: { userId: user.id, month: month.start },
      });
      return NextResponse.json({ budget: null });
    }

    const amount = parseMoney(body.amount);
    if (!amount) {
      return NextResponse.json({ error: "Budget must be greater than 0." }, { status: 400 });
    }

    const budget = await db.monthlyBudget.upsert({
      where: { userId_month: { userId: user.id, month: month.start } },
      create: { userId: user.id, month: month.start, amount },
      update: { amount },
    });

    return NextResponse.json({ budget: budget.amount });
  } catch (error) {
    const result = handleSpendError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
