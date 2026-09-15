/** Normalize optional hours input. Empty → null. Undefined = field omitted. */
export function parseOptionalHours(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

/** Turn free text into clean `- item` lines when bullet mode is on. */
export function normalizeBulletText(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "-")
    .map((line) =>
      line.startsWith("- ")
        ? line
        : `- ${line.replace(/^[-•*]\s*/, "")}`,
    )
    .join("\n");
}

export function ensureBulletPrefix(value: string): string {
  if (!value.trim()) return "- ";
  return value;
}

/** On Enter in bullet mode, start the next line with `- `. */
export function handleBulletKeyDown(
  event: { key: string; shiftKey: boolean; preventDefault: () => void; currentTarget: HTMLTextAreaElement },
  value: string,
  setValue: (next: string) => void,
) {
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  const target = event.currentTarget;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const next = `${value.slice(0, start)}\n- ${value.slice(end)}`;
  setValue(next);
  requestAnimationFrame(() => {
    const cursor = start + 3;
    target.selectionStart = cursor;
    target.selectionEnd = cursor;
  });
}

export function localDateInput(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatWorkDate(value: string, weekday = false) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(undefined, {
    weekday: weekday ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

/** Monday-based week start key (YYYY-MM-DD). */
export function weekStartKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + offset);
  return localDateInput(date);
}

export function weekLabel(weekStart: string, todayKey = localDateInput()) {
  const thisWeek = weekStartKey(todayKey);
  const [y, m, d] = thisWeek.split("-").map(Number);
  const lastWeekDate = new Date(y, m - 1, d - 7);
  const lastWeek = localDateInput(lastWeekDate);

  if (weekStart === thisWeek) return "This week";
  if (weekStart === lastWeek) return "Last week";

  const [sy, sm, sd] = weekStart.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(sy, sm - 1, sd + 6);
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

