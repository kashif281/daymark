export function utcDate(daysAgo = 0) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo),
  );
}

export function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function parseDateInput(value?: string | null) {
  if (!value) return utcDate(0);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function optionalNumber(value: unknown, min?: number, max?: number) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
}

export function handleHealthError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return { error: "Unauthorized", status: 401 as const };
  }
  console.error(error);
  return { error: "Something went wrong.", status: 500 as const };
}

export function emptyCheckIn() {
  return {
    sleepHours: null as number | null,
    sleepQuality: null as number | null,
    waterGlasses: 0,
    mood: null as number | null,
    energy: null as number | null,
    weightKg: null as number | null,
    systolic: null as number | null,
    diastolic: null as number | null,
    heartRate: null as number | null,
    bloodSugar: null as number | null,
    temperature: null as number | null,
    notes: null as string | null,
  };
}

export function toUiCheckIn(entry: {
  sleepHours: number | null;
  sleepQuality: number | null;
  waterGlasses: number;
  mood: number | null;
  energy: number | null;
  weightKg: number | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  bloodSugar: number | null;
  temperature: number | null;
  notes: string | null;
} | null) {
  if (!entry) return emptyCheckIn();
  return {
    sleepHours: entry.sleepHours,
    sleepQuality: entry.sleepQuality,
    waterGlasses: entry.waterGlasses,
    mood: entry.mood,
    energy: entry.energy,
    weightKg: entry.weightKg,
    systolic: entry.systolic,
    diastolic: entry.diastolic,
    heartRate: entry.heartRate,
    bloodSugar: entry.bloodSugar,
    temperature: entry.temperature,
    notes: entry.notes,
  };
}

