import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { dateKey } from "@/lib/health";
import { handleSpendError, parseMonth, roundMoney } from "@/lib/spending";

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const month = parseMonth(new URL(request.url).searchParams.get("month"));
    if (!month) {
      return NextResponse.json({ error: "Month is invalid." }, { status: 400 });
    }

    const db = getDb();
    const [entries, budget, loans] = await Promise.all([
      db.spendEntry.findMany({
        where: {
          userId: user.id,
          spentAt: { gte: month.start, lt: month.end },
        },
        orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      }),
      db.monthlyBudget.findUnique({
        where: { userId_month: { userId: user.id, month: month.start } },
      }),
      db.moneyLoan.findMany({
        where: { userId: user.id },
        orderBy: [{ settled: "asc" }, { loggedAt: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const spent = roundMoney(entries.reduce((total, item) => total + item.amount, 0));
    const budgetAmount = budget?.amount ?? null;
    const remaining =
      budgetAmount == null ? null : roundMoney(budgetAmount - spent);

    const given = loans.filter((item) => item.direction === "GIVEN");
    const owed = loans.filter((item) => item.direction === "OWED");
    const openGiven = roundMoney(
      given.filter((item) => !item.settled).reduce((total, item) => total + item.amount, 0),
    );
    const openOwed = roundMoney(
      owed.filter((item) => !item.settled).reduce((total, item) => total + item.amount, 0),
    );

    const days: Record<
      string,
      { date: string; total: number; items: typeof entries }
    > = {};
    for (const entry of entries) {
      const key = dateKey(entry.spentAt);
      if (!days[key]) {
        days[key] = { date: entry.spentAt.toISOString(), total: 0, items: [] };
      }
      days[key].items.push(entry);
      days[key].total = roundMoney(days[key].total + entry.amount);
    }

    return NextResponse.json({
      month: month.key,
      budget: budgetAmount,
      spent,
      remaining,
      days: Object.values(days).map((day) => ({
        date: day.date,
        total: day.total,
        items: day.items.map((item) => ({
          id: item.id,
          name: item.name,
          amount: item.amount,
          category: item.category,
          date: item.spentAt.toISOString(),
        })),
      })),
      given: given.map(toUiLoan),
      owed: owed.map(toUiLoan),
      openGiven,
      openOwed,
    });
  } catch (error) {
    const result = handleSpendError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

function toUiLoan(item: {
  id: string;
  personName: string;
  amount: number;
  note: string | null;
  settled: boolean;
  loggedAt: Date;
}) {
  return {
    id: item.id,
    personName: item.personName,
    amount: item.amount,
    note: item.note,
    settled: item.settled,
    date: item.loggedAt.toISOString(),
  };
}
