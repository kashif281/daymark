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
