import { utcDate } from "@/lib/health";

export function parseMonth(value?: string | null) {
  const now = utcDate(0);
  const fallback = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const match = /^(\d{4})-(\d{2})$/.exec(value || fallback);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return {
    key: `${year}-${String(month).padStart(2, "0")}`,
    start,
    end,
  };
}

export function parseMoney(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function handleSpendError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return { error: "Unauthorized", status: 401 as const };
  }
  console.error(error);
  return { error: "Something went wrong.", status: 500 as const };
}
