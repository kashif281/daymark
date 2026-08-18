"use client";

import {
  Activity,
  Apple,
  Check,
  Droplets,
  Dumbbell,
  Footprints,
  HeartPulse,
  Moon,
  Pill,
  Plus,
  RotateCcw,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { calendarWeekKeys } from "@/lib/health";

export type HealthKind =
  | "WALK"
  | "EXERCISE"
  | "DIET"
  | "SLEEP"
  | "WATER"
  | "MEDITATION"
  | "OTHER";

type HealthCheckIn = {
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
};

type HealthRoutine = {
  id: string;
  kind: HealthKind;
  title: string;
  target: string | null;
  today: {
    id: string;
    completed: boolean;
    amount: string | null;
    notes: string | null;
  } | null;
  weekDone: number;
  streak: number;
  days: {
    date: string;
    completed: boolean;
    amount: string | null;
    notes: string | null;
  }[];
};

type HealthPrescription = {
  id: string;
  doctorName: string | null;
  visitDate: string;
  advice: string;
  medications: string | null;
  nextVisitAt: string | null;
  latestImproving: string | null;
  updates: {
    id: string;
    noteDate: string;
    improving: string;
    stillIssue: string | null;
  }[];
};

type HealthSymptom = {
  id: string;
  name: string;
  severity: number;
  notes: string | null;
};

type HealthInsight = {
  configured: boolean;
  headline: string;
  comparison: string;
  suggestions: string[];
  attention: "none" | "watch" | "urgent";
  direction?: "right" | "wrong" | "improving" | "declining" | "unchanged";
  changed?: string[];
  helping?: string | null;
  hurting?: string | null;
};

type CheckInDay = HealthCheckIn & { date: string };

type HealthMedication = {
  id: string;
  name: string;
  dose: string | null;
  schedule: string | null;
  taken: boolean;
  weekTaken: number;
};

const starters: { kind: HealthKind; title: string; target: string }[] = [
  { kind: "WALK", title: "Morning walk", target: "30 min" },
  { kind: "EXERCISE", title: "Exercise", target: "45 min" },
  { kind: "DIET", title: "Diet plan", target: "Follow doctor's diet" },
  { kind: "MEDITATION", title: "Meditation", target: "10 min" },
];

const symptomChips = ["Headache", "Fatigue", "Pain", "Nausea", "Dizziness", "Anxiety", "Cough"];

const vitalOptions = [
  { key: "weightKg", label: "Weight (kg)" },
  { key: "systolic", label: "Systolic BP" },
  { key: "diastolic", label: "Diastolic BP" },
  { key: "heartRate", label: "Heart rate" },
  { key: "bloodSugar", label: "Blood sugar" },
  { key: "temperature", label: "Temperature °C" },
] as const;

type VitalKey = (typeof vitalOptions)[number]["key"];

function localDateInput(value?: Date) {
  const now = value ?? new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const weekdayLetters = ["M", "T", "W", "T", "F", "S", "S"];

function dateKeyFromIso(value: string) {
  return value.slice(0, 10);
}

function formatLocalDay(key: string, weekday = false) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: weekday ? "short" : undefined,
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatDate(value: string, weekday = false) {
  return formatLocalDay(dateKeyFromIso(value), weekday);
}

function kindMeta(kind: HealthKind) {
  if (kind === "WALK") return { label: "Walk", icon: Footprints, color: "#4c9a70" };
  if (kind === "EXERCISE") return { label: "Exercise", icon: Dumbbell, color: "#6d5bd0" };
  if (kind === "DIET") return { label: "Diet", icon: Apple, color: "#c48431" };
  if (kind === "SLEEP") return { label: "Sleep", icon: Moon, color: "#4b6fa8" };
  if (kind === "WATER") return { label: "Water", icon: Droplets, color: "#3d8fd1" };
  if (kind === "MEDITATION") return { label: "Meditation", icon: Sparkles, color: "#a15bb8" };
  return { label: "Other", icon: HeartPulse, color: "#5f5e5a" };
}

function ScoreButton({
  value,
  selected,
  onClick,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`size-8 rounded-lg text-[12px] font-semibold ${
        selected ? "bg-[#292927] text-white" : "border border-[#deddd8] text-[#5f5e5a]"
      }`}
      onClick={onClick}
    >
      {value}
    </button>
  );
}

export function HealthView() {
  const [checkIn, setCheckIn] = useState<HealthCheckIn>({
    sleepHours: null,
    sleepQuality: null,
    waterGlasses: 0,
    mood: null,
    energy: null,
    weightKg: null,
    systolic: null,
    diastolic: null,
    heartRate: null,
    bloodSugar: null,
    temperature: null,
    notes: null,
  });
  const [routines, setRoutines] = useState<HealthRoutine[]>([]);
  const [prescriptions, setPrescriptions] = useState<HealthPrescription[]>([]);
  const [symptoms, setSymptoms] = useState<HealthSymptom[]>([]);
  const [medications, setMedications] = useState<HealthMedication[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInDay[]>([]);
  const [insight, setInsight] = useState<HealthInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [routineOpen, setRoutineOpen] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [medicationOpen, setMedicationOpen] = useState(false);
  const [selected, setSelected] = useState<HealthPrescription | null>(null);
  const [symptomName, setSymptomName] = useState("");
  const [symptomSeverity, setSymptomSeverity] = useState(5);
  const [vitalKind, setVitalKind] = useState<VitalKey>("weightKg");
  const [vitalValue, setVitalValue] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/health?date=${localDateInput()}`);
    if (!response.ok) {
      throw new Error("Could not load health");
    }
    const data = (await response.json()) as {
      checkIn: HealthCheckIn;
      checkIns: CheckInDay[];
      routines: HealthRoutine[];
      prescriptions: HealthPrescription[];
      symptoms: HealthSymptom[];
      medications: HealthMedication[];
    };
    setCheckIn(data.checkIn);
    setCheckIns(data.checkIns ?? []);
    setRoutines(data.routines);
    setPrescriptions(data.prescriptions);
    setSymptoms(data.symptoms);
    setMedications(data.medications);
  }, []);

  const loadInsight = useCallback(async () => {
    setInsightLoading(true);
    try {
      const response = await fetch(`/api/health/insights?date=${localDateInput()}`);
      if (!response.ok) throw new Error("Could not load insights");
      setInsight((await response.json()) as HealthInsight);
    } catch {
      setInsight(null);
    } finally {
      setInsightLoading(false);
    }
  }, []);

  useEffect(() => {
    load()
      .catch(() => setError("Could not load health tracking."))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      void loadInsight();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [loading, checkIn, routines, symptoms, medications, loadInsight]);

  async function saveCheckIn(patch: Partial<HealthCheckIn>) {
    const response = await fetch("/api/health/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch, date: localDateInput() }),
    });
    if (response.ok) await load();
  }

  async function addStarter(starter: (typeof starters)[number]) {
    const response = await fetch("/api/health/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(starter),
    });
    if (response.ok) await load();
  }

  async function toggleRoutine(routine: HealthRoutine, date = localDateInput()) {
    const todayKey = localDateInput();
    const day =
      date === todayKey
        ? routine.today
        : routine.days.find((item) => dateKeyFromIso(item.date) === date);
    const response = await fetch("/api/health/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routineId: routine.id,
        completed: !(day?.completed ?? false),
        amount: day?.amount,
        notes: day?.notes,
        date,
      }),
    });
    if (response.ok) await load();
  }

  async function saveLogDetails(
    routine: HealthRoutine,
    details: { amount?: string; notes?: string },
  ) {
    const response = await fetch("/api/health/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routineId: routine.id,
        completed: routine.today?.completed ?? true,
        amount: details.amount ?? routine.today?.amount,
        notes: details.notes ?? routine.today?.notes,
        date: localDateInput(),
      }),
    });
    if (response.ok) await load();
  }

  async function removeRoutine(id: string) {
    const response = await fetch(`/api/health/routines?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (response.ok) await load();
  }

  async function addSymptom(name = symptomName) {
    if (!name.trim()) return;
    const response = await fetch("/api/health/symptoms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        severity: symptomSeverity,
        date: localDateInput(),
      }),
    });
    if (response.ok) {
      setSymptomName("");
      await load();
    }
  }

  async function removeSymptom(id: string) {
    const response = await fetch(`/api/health/symptoms?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (response.ok) await load();
  }

  async function toggleMedication(item: HealthMedication) {
    const response = await fetch("/api/health/medications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        taken: !item.taken,
        date: localDateInput(),
      }),
    });
    if (response.ok) await load();
  }

  async function removeMedication(id: string) {
    const response = await fetch(`/api/health/medications?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (response.ok) await load();
  }

  async function addVital() {
    if (vitalValue === "") return;
    const parsed = Number(vitalValue);
    if (!Number.isFinite(parsed)) return;
    await saveCheckIn({ [vitalKind]: parsed });
    setVitalValue("");
  }

  async function removeVital(key: VitalKey) {
    await saveCheckIn({ [key]: null });
  }

  const doneToday = routines.filter((routine) => routine.today?.completed).length;
  const medsTaken = medications.filter((item) => item.taken).length;
  const yesterday = checkIns.length >= 2 ? checkIns[checkIns.length - 2] : null;
  const unusedStarters = starters.filter(
    (starter) => !routines.some((routine) => routine.kind === starter.kind),
  );

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.04em]">Health</h1>
          <p className="mt-1 text-sm text-[#777671]">
            Daily check-in, habits, meds, symptoms, and doctor notes.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            className="rounded-lg border border-[#deddd8] bg-white px-2.5 py-1.5 text-[11px] font-semibold"
            onClick={() => setRoutineOpen(true)}
          >
            Add habit
          </button>
          <button
            className="rounded-lg bg-[#292927] px-2.5 py-1.5 text-[11px] font-semibold text-white"
            onClick={() => setPrescriptionOpen(true)}
          >
            Add prescription
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-[#a7463d]">{error}</p> : null}
      {loading ? <p className="text-sm text-[#8f8e89]">Loading health…</p> : null}

      <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[13px] font-bold">
            <Sparkles size={15} className="text-[#6d5bd0]" />
            Health journey
          </h2>
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-[#deddd8] px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50"
            disabled={insightLoading}
            onClick={() => void loadInsight()}
          >
            <RotateCcw size={12} />
            {insightLoading ? "Checking…" : "Retry"}
          </button>
        </div>
        {insight?.direction || (insight?.attention && insight.attention !== "none") ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {insight.direction ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  insight.direction === "right" || insight.direction === "improving"
                    ? "bg-[#e7f4ec] text-[#367653]"
                    : insight.direction === "wrong" || insight.direction === "declining"
                      ? "bg-[#f8e4e1] text-[#a7463d]"
                      : "bg-[#f3f3f0] text-[#6e6d68]"
                }`}
              >
                {directionLabel(insight.direction)}
              </span>
            ) : null}
            {insight.attention && insight.attention !== "none" ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  insight.attention === "urgent"
                    ? "bg-[#f8e4e1] text-[#a7463d]"
                    : "bg-[#fff4d8] text-[#8a6a1f]"
                }`}
              >
                {insight.attention === "urgent" ? "Needs care" : "Keep an eye"}
              </span>
            ) : null}
          </div>
        ) : null}
        {insight?.attention === "watch" ? (
          <p className="mt-2 text-[11px] text-[#8a6a1f]">
             Something is off vs other days, but not urgent.
          </p>
        ) : null}
        {insight?.attention === "urgent" ? (
          <p className="mt-2 text-[11px] text-[#a7463d]">
            Needs care means talk to a clinician. This app is not medical advice.
          </p>
        ) : null}
        {insightLoading && !insight ? (
          <p className="mt-2 text-sm text-[#8f8e89]">Comparing your vitals…</p>
        ) : insight ? (
          <>
            <p className="mt-2 text-[15px] font-semibold">{insight.headline}</p>
            <p className="mt-1 text-[13px] leading-5 text-[#565550]">{insight.comparison}</p>
            {insight.changed?.length ? (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
                  What changed
                </p>
                <ul className="mt-1 space-y-1">
                  {insight.changed.map((item) => (
                    <li key={item} className="text-[13px] text-[#3f3e3a]">
                      · {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {insight.helping ? (
              <p className="mt-2 text-[12px] text-[#367653]">Helping: {insight.helping}</p>
            ) : null}
            {insight.hurting ? (
              <p className="mt-1 text-[12px] text-[#a7463d]">Hurting: {insight.hurting}</p>
            ) : null}
            {insight.suggestions.length ? (
              <ul className="mt-3 space-y-1.5">
                {insight.suggestions.map((item) => (
                  <li key={item} className="text-[13px] text-[#3f3e3a]">
                    · {item}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 text-[11px] text-[#9a9994]">
              Suggestions only. Not medical advice.
            </p>
          </>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-[#8f8e89]">
              Log sleep, water, mood, or a habit, then tap Retry if the journey does not update.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Sleep"
          value={checkIn.sleepHours != null ? `${checkIn.sleepHours}h` : "—"}
          hint={checkIn.sleepQuality ? `quality ${checkIn.sleepQuality}/5` : "log last night"}
        />
        <SummaryCard
          label="Water"
          value={`${checkIn.waterGlasses}/8`}
          hint="glasses today"
        />
        <SummaryCard
          label="Routines"
          value={`${doneToday}/${routines.length || 0}`}
          hint="done today"
        />
        <SummaryCard
          label="Meds"
          value={`${medsTaken}/${medications.length || 0}`}
          hint="taken today"
        />
      </div>

      <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-bold">
          <Moon size={15} className="text-[#4b6fa8]" />
          Daily check-in
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
              Sleep hours
            </p>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              className="mt-2 w-full rounded-lg border border-[#deddd8] bg-[#fafaf8] px-3 py-2 text-sm outline-none focus:border-[#8a79dc]"
              placeholder="e.g. 7.5"
              defaultValue={checkIn.sleepHours ?? ""}
              key={`sleep-${checkIn.sleepHours ?? ""}`}
              onBlur={(event) =>
                void saveCheckIn({
                  sleepHours: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
              Sleep quality
            </p>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <ScoreButton
                  key={value}
                  value={value}
                  selected={checkIn.sleepQuality === value}
                  onClick={() => void saveCheckIn({ sleepQuality: value })}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
              Water
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                className="rounded-lg border border-[#deddd8] px-3 py-2 text-sm font-semibold"
                onClick={() =>
                  void saveCheckIn({
                    waterGlasses: Math.max(0, checkIn.waterGlasses - 1),
                  })
                }
              >
                −
              </button>
              <p className="min-w-16 text-center text-lg font-bold">
                {checkIn.waterGlasses}
                <span className="ml-1 text-sm font-semibold text-[#8f8e89]">/ 8</span>
              </p>
              <button
                className="rounded-lg border border-[#deddd8] px-3 py-2 text-sm font-semibold"
                onClick={() =>
                  void saveCheckIn({
                    waterGlasses: Math.min(30, checkIn.waterGlasses + 1),
                  })
                }
              >
                +
              </button>
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
              Mood
            </p>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <ScoreButton
                  key={value}
                  value={value}
                  selected={checkIn.mood === value}
                  onClick={() => void saveCheckIn({ mood: value })}
                />
              ))}
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
              Energy
            </p>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <ScoreButton
                  key={value}
                  value={value}
                  selected={checkIn.energy === value}
                  onClick={() => void saveCheckIn({ energy: value })}
                />
              ))}
            </div>
          </div>
        </div>
        <textarea
          className="mt-4 min-h-20 w-full resize-y rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
          placeholder="How do you feel today?"
          defaultValue={checkIn.notes ?? ""}
          key={`notes-${checkIn.notes ?? ""}`}
          onBlur={(event) => void saveCheckIn({ notes: event.target.value || null })}
        />
      </div>

      <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-bold">
          <Activity size={15} className="text-[#6d5bd0]" />
          Vitals
        </h2>
        {yesterday ? (
          <p className="mt-1 text-[12px] text-[#8f8e89]">
            Yesterday: {yesterday.sleepHours ?? "—"}h sleep · mood {yesterday.mood ?? "—"} · energy{" "}
            {yesterday.energy ?? "—"} · {yesterday.waterGlasses} water
            {yesterday.systolic && yesterday.diastolic
              ? ` · BP ${yesterday.systolic}/${yesterday.diastolic}`
              : ""}
          </p>
        ) : null}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {vitalOptions.map((item) => (
              <button
                key={item.key}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                  vitalKind === item.key
                    ? "bg-[#292927] text-white"
                    : "border border-[#deddd8] text-[#5f5e5a]"
                }`}
                onClick={() => setVitalKind(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              step="any"
              className="min-w-0 flex-1 rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
              placeholder={`${vitalOptions.find((item) => item.key === vitalKind)?.label} value`}
              value={vitalValue}
              onChange={(event) => setVitalValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addVital();
              }}
            />
            <button
              className="rounded-xl bg-[#6d5bd0] px-4 py-3 text-[12px] font-semibold text-white disabled:opacity-50"
              disabled={vitalValue === ""}
              onClick={() => void addVital()}
            >
              Add
            </button>
          </div>
          {vitalOptions.some((item) => checkIn[item.key] != null) ? (
            <div className="mt-3 space-y-2">
              {vitalOptions
                .filter((item) => checkIn[item.key] != null)
                .map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl border border-[#ecebe7] px-3 py-2"
                  >
                    <p className="text-[12px] font-semibold">
                      {item.label}{" "}
                      <span className="text-[#8f8e89]">· {checkIn[item.key]}</span>
                    </p>
                    <button
                      aria-label={`Remove ${item.label}`}
                      className="text-[#aaa9a4] hover:text-[#a7463d]"
                      onClick={() => void removeVital(item.key)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#8f8e89]">
              No vitals added today. Pick one, enter the value, then tap Add.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-bold">Habits</h2>
            <p className="mt-1 text-[12px] text-[#8f8e89]">
              Every habit stays listed. Mark done today with the button; use the week row only to catch up missed days.
            </p>
          </div>
          <button
            className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[#6553c6]"
            onClick={() => setRoutineOpen(true)}
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {routines.length ? (
          <div className="mt-4 space-y-3">
            {routines.map((routine) => {
              const meta = kindMeta(routine.kind);
              const Icon = meta.icon;
              const done = Boolean(routine.today?.completed);
              const todayKey = localDateInput();
              const logsByDate = new Map(
                routine.days.map((day) => [dateKeyFromIso(day.date), day]),
              );
              const week = calendarWeekKeys(todayKey).map((key, index) => {
                const log = logsByDate.get(key);
                return {
                  key,
                  index,
                  completed: Boolean(log?.completed),
                  isToday: key === todayKey,
                  isFuture: key > todayKey,
                };
              });
              return (
                <div
                  key={routine.id}
                  className={`rounded-xl border p-3 ${
                    done ? "border-[#cfe6d6] bg-[#f7fbf8]" : "border-[#ecebe7] bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                        <Icon size={14} style={{ color: meta.color }} />
                        {routine.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#8f8e89]">
                        {meta.label}
                        {routine.target ? ` · ${routine.target}` : ""}
                        {routine.streak ? ` · ${routine.streak}-day streak` : ""}
                      </p>
                    </div>
                    <button
                      aria-label={`Delete ${routine.title}`}
                      className="rounded-md p-1 text-[#aaa9a4] hover:bg-[#f3f3f0] hover:text-[#a7463d]"
                      onClick={() => void removeRoutine(routine.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className={`mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                      done
                        ? "bg-[#55a276] text-white"
                        : "border border-[#deddd8] bg-white text-[#3f3e3a] hover:border-[#55a276]"
                    }`}
                    onClick={() => void toggleRoutine(routine)}
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-md ${
                        done ? "bg-white/20" : "border border-[#deddd8] bg-white"
                      }`}
                    >
                      {done ? <Check size={14} strokeWidth={3} /> : null}
                    </span>
                    <span>
                      <span className="block text-[12px] font-semibold">
                        {done ? "Done today" : "Mark done today"}
                      </span>
                      <span className={`block text-[10px] ${done ? "text-white/80" : "text-[#8f8e89]"}`}>
                        {done ? "Tap to undo" : "Logs this habit for today"}
                      </span>
                    </span>
                  </button>
                  {done ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input
                        key={`${routine.id}-amount-${routine.today?.amount ?? ""}`}
                        className="rounded-lg border border-[#deddd8] bg-white px-3 py-2 text-[12px] outline-none focus:border-[#8a79dc]"
                        placeholder="How much? e.g. 40 min, 8k steps"
                        defaultValue={routine.today?.amount ?? ""}
                        onBlur={(event) =>
                          void saveLogDetails(routine, { amount: event.target.value })
                        }
                      />
                      <input
                        key={`${routine.id}-notes-${routine.today?.notes ?? ""}`}
                        className="rounded-lg border border-[#deddd8] bg-white px-3 py-2 text-[12px] outline-none focus:border-[#8a79dc]"
                        placeholder="Notes"
                        defaultValue={routine.today?.notes ?? ""}
                        onBlur={(event) =>
                          void saveLogDetails(routine, { notes: event.target.value })
                        }
                      />
                    </div>
                  ) : null}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9a9994]">
                      <p>This week · catch up</p>
                      <p>{routine.weekDone}/7</p>
                    </div>
                    <div className="mt-1.5 grid grid-cols-7 gap-1">
                      {week.map((day) => {
                        const label = weekdayLetters[day.index];
                        const title = `${formatLocalDay(day.key, true)}${
                          day.completed ? " · done" : day.isFuture ? " · upcoming" : ""
                        }`;
                        const className = `rounded-lg py-1.5 text-center ${
                          day.completed
                            ? "bg-[#55a276] text-white"
                            : day.isToday
                              ? "border border-[#6d5bd0] bg-white text-[#5f4db9]"
                              : day.isFuture
                                ? "bg-[#f7f7f4] text-[#c4c3be]"
                                : "bg-[#f3f3f0] text-[#8f8e89]"
                        }`;
                        if (day.isToday || day.isFuture) {
                          return (
                            <div key={day.key} title={title} className={className}>
                              <span className="block text-[10px] font-bold">{label}</span>
                              <span className="mt-0.5 block text-[9px]">
                                {day.isToday ? (day.completed ? "✓" : "today") : "·"}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <button
                            key={day.key}
                            type="button"
                            title={`${title}. Tap to ${day.completed ? "undo" : "mark done"}.`}
                            className={className}
                            onClick={() => void toggleRoutine(routine, day.key)}
                          >
                            <span className="block text-[10px] font-bold">{label}</span>
                            <span className="mt-0.5 block text-[9px]">
                              {day.completed ? "✓" : "·"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            {unusedStarters.length ? (
              <div className="rounded-xl border border-dashed border-[#deddd8] px-3 py-3">
                <p className="text-[11px] font-semibold text-[#8f8e89]">Add another habit</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {unusedStarters.map((starter) => (
                    <button
                      key={starter.kind}
                      className="rounded-lg border border-[#deddd8] px-3 py-1.5 text-[12px] font-semibold hover:border-[#d4d0f0]"
                      onClick={() => void addStarter(starter)}
                    >
                      {starter.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-[#8f8e89]">
              Add a walk, exercise, diet, or meditation habit to start tracking.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {starters.map((starter) => (
                <button
                  key={starter.kind}
                  className="rounded-lg border border-[#deddd8] px-3 py-1.5 text-[12px] font-semibold hover:border-[#d4d0f0]"
                  onClick={() => void addStarter(starter)}
                >
                  {starter.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[13px] font-bold">
              <Pill size={15} className="text-[#6d5bd0]" />
              Medications
            </h2>
            <button
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#6553c6]"
              onClick={() => setMedicationOpen(true)}
            >
              <Plus size={13} /> Add
            </button>
          </div>
          {medications.length ? (
            <div className="mt-4 space-y-2">
              {medications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-[#ecebe7] px-3 py-2.5 text-left hover:border-[#d4d0f0]"
                  onClick={() => void toggleMedication(item)}
                >
                  <span
                    className={`grid size-[19px] shrink-0 place-items-center rounded-full border ${
                      item.taken
                        ? "border-[#55a276] bg-[#55a276] text-white"
                        : "border-[#cac9c4] bg-white"
                    }`}
                  >
                    {item.taken ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">{item.name}</span>
                    <span className="text-[11px] text-[#8f8e89]">
                      {[item.dose, item.schedule].filter(Boolean).join(" · ") || "As prescribed"}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete ${item.name}`}
                    className="rounded-md p-1 text-[#aaa9a4] hover:text-[#a7463d]"
                    onClick={(event) => {
                      event.stopPropagation();
                      void removeMedication(item.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.stopPropagation();
                        void removeMedication(item.id);
                      }
                    }}
                  >
                    <Trash2 size={13} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#8f8e89]">
              Add daily medicines or supplements and tick them when taken.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
          <h2 className="flex items-center gap-2 text-[13px] font-bold">
            <HeartPulse size={15} className="text-[#a7463d]" />
            Symptoms
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {symptomChips.map((name) => (
              <button
                key={name}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  symptomName === name
                    ? "bg-[#292927] text-white"
                    : "border border-[#deddd8] hover:border-[#d4d0f0]"
                }`}
                onClick={() => setSymptomName(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-[#deddd8] bg-[#fafaf8] px-3 py-2 text-[12px] outline-none focus:border-[#8a79dc]"
              placeholder="Symptom name"
              value={symptomName}
              onChange={(event) => setSymptomName(event.target.value)}
            />
            <select
              className="rounded-lg border border-[#deddd8] bg-[#fafaf8] px-2 text-[12px]"
              value={symptomSeverity}
              onChange={(event) => setSymptomSeverity(Number(event.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <option key={value} value={value}>
                  {value}/10
                </option>
              ))}
            </select>
            <button
              className="rounded-lg bg-[#292927] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
              disabled={!symptomName.trim()}
              onClick={() => void addSymptom()}
            >
              Add
            </button>
          </div>
          {symptoms.length ? (
            <div className="mt-3 space-y-2">
              {symptoms.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[#ecebe7] px-3 py-2"
                >
                  <p className="text-[12px] font-semibold">
                    {item.name}{" "}
                    <span className="text-[#8f8e89]">· {item.severity}/10</span>
                  </p>
                  <button
                    aria-label={`Delete ${item.name}`}
                    className="text-[#aaa9a4] hover:text-[#a7463d]"
                    onClick={() => void removeSymptom(item.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#8f8e89]">No symptoms logged today.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[13px] font-bold">
            <Stethoscope size={15} className="text-[#6d5bd0]" />
            Doctor prescriptions
          </h2>
          <button
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#6553c6]"
            onClick={() => setPrescriptionOpen(true)}
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {prescriptions.length ? (
          <div className="mt-4 space-y-3">
            {prescriptions.map((item) => (
              <button
                key={item.id}
                className="w-full rounded-xl border border-[#ecebe7] p-3 text-left hover:border-[#d4d0f0]"
                onClick={() => setSelected(item)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold">
                    {item.doctorName || "Doctor visit"}
                  </p>
                  <p className="text-[11px] text-[#8f8e89]">{formatDate(item.visitDate)}</p>
                </div>
                <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#565550]">
                  {item.advice}
                </p>
                {item.latestImproving ? (
                  <p className="mt-2 text-[11px] font-semibold text-[#367653]">
                    Improving: {item.latestImproving}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-[#9a9994]">
                    Tap to add what is improving
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#8f8e89]">
            Save what the doctor said, then log what is getting better over time.
          </p>
        )}
      </div>

      {routineOpen ? (
        <RoutineModal
          onClose={() => setRoutineOpen(false)}
          onSaved={async () => {
            setRoutineOpen(false);
            await load();
          }}
        />
      ) : null}
      {prescriptionOpen ? (
        <PrescriptionModal
          onClose={() => setPrescriptionOpen(false)}
          onSaved={async () => {
            setPrescriptionOpen(false);
            await load();
          }}
        />
      ) : null}
      {medicationOpen ? (
        <MedicationModal
          onClose={() => setMedicationOpen(false)}
          onSaved={async () => {
            setMedicationOpen(false);
            await load();
          }}
        />
      ) : null}
      {selected ? (
        <PrescriptionDetail
          prescription={selected}
          onClose={() => setSelected(null)}
          onChanged={async () => {
            await load();
            const response = await fetch(`/api/health?date=${localDateInput()}`);
            if (!response.ok) return;
            const data = (await response.json()) as {
              prescriptions: HealthPrescription[];
            };
            setSelected(
              data.prescriptions.find((item) => item.id === selected.id) ?? null,
            );
          }}
        />
      ) : null}
    </section>
  );
}

function directionLabel(direction: NonNullable<HealthInsight["direction"]>) {
  if (direction === "right") return "On track";
  if (direction === "wrong") return "Off track";
  if (direction === "improving") return "Improving";
  if (direction === "declining") return "Declining";
  return "No change";
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e6e5e0] bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-[12px] text-[#8f8e89]">{hint}</p>
    </div>
  );
}

function RoutineModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [kind, setKind] = useState<HealthKind>("WALK");
  const [title, setTitle] = useState("Morning walk");
  const [target, setTarget] = useState("30 min");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const response = await fetch("/api/health/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, title, target }),
    });
    setSaving(false);
    if (response.ok) await onSaved();
  }

  return (
    <Modal title="Add habit" onClose={onClose}>
      <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
        Type
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["WALK", "EXERCISE", "DIET", "MEDITATION", "SLEEP", "WATER", "OTHER"] as HealthKind[]).map(
          (value) => (
            <button
              key={value}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                kind === value
                  ? "bg-[#292927] text-white"
                  : "border border-[#deddd8] text-[#5f5e5a]"
              }`}
              onClick={() => {
                setKind(value);
                const defaults: Record<HealthKind, { title: string; target: string }> = {
                  WALK: { title: "Morning walk", target: "30 min" },
                  EXERCISE: { title: "Exercise", target: "45 min" },
                  DIET: { title: "Diet plan", target: "" },
                  MEDITATION: { title: "Meditation", target: "10 min" },
                  SLEEP: { title: "Sleep", target: "8 hours" },
                  WATER: { title: "Water", target: "8 glasses" },
                  OTHER: { title: "", target: "" },
                };
                setTitle(defaults[value].title);
                setTarget(defaults[value].target);
              }}
            >
              {kindMeta(value).label}
            </button>
          ),
        )}
      </div>
      <input
        className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
        placeholder="Habit name"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <input
        className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
        placeholder="Target, e.g. 30 min or 8k steps"
        value={target}
        onChange={(event) => setTarget(event.target.value)}
      />
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="rounded-lg px-4 py-2 text-xs font-semibold text-[#6e6d68] hover:bg-[#f3f3f0]"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="rounded-lg bg-[#6d5bd0] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          disabled={!title.trim() || saving}
          onClick={() => void save()}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function MedicationModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [schedule, setSchedule] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const response = await fetch("/api/health/medications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dose, schedule }),
    });
    setSaving(false);
    if (response.ok) await onSaved();
  }

  return (
    <Modal title="Add medication" onClose={onClose}>
      <input
        className="w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
        placeholder="Name, e.g. Vitamin D"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <input
        className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
        placeholder="Dose, e.g. 500mg"
        value={dose}
        onChange={(event) => setDose(event.target.value)}
      />
      <input
        className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
        placeholder="Schedule, e.g. Morning and night"
        value={schedule}
        onChange={(event) => setSchedule(event.target.value)}
      />
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="rounded-lg px-4 py-2 text-xs font-semibold text-[#6e6d68] hover:bg-[#f3f3f0]"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="rounded-lg bg-[#6d5bd0] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          disabled={!name.trim() || saving}
          onClick={() => void save()}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function PrescriptionModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [doctorName, setDoctorName] = useState("");
  const [visitDate, setVisitDate] = useState(localDateInput());
  const [advice, setAdvice] = useState("");
  const [medications, setMedications] = useState("");
  const [nextVisitAt, setNextVisitAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!advice.trim()) return;
    setSaving(true);
    const response = await fetch("/api/health/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctorName,
        visitDate,
        advice,
        medications,
        nextVisitAt: nextVisitAt || null,
      }),
    });
    setSaving(false);
    if (response.ok) await onSaved();
  }

  return (
    <Modal title="Doctor prescription" onClose={onClose}>
      <p className="text-xs text-[#888782]">
        Save what the doctor said so you can track what is improving.
      </p>
      <input
        className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
        placeholder="Doctor name (optional)"
        value={doctorName}
        onChange={(event) => setDoctorName(event.target.value)}
      />
      <input
        type="date"
        className="mt-3 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
        value={visitDate}
        onChange={(event) => setVisitDate(event.target.value)}
      />
      <textarea
        className="mt-3 min-h-28 w-full resize-y rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
        placeholder="What did the doctor say?"
        value={advice}
        onChange={(event) => setAdvice(event.target.value)}
      />
      <textarea
        className="mt-3 min-h-20 w-full resize-y rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
        placeholder="Medications or diet notes (optional)"
        value={medications}
        onChange={(event) => setMedications(event.target.value)}
      />
      <label className="mt-3 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
        Next visit
      </label>
      <input
        type="date"
        className="mt-2 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
        value={nextVisitAt}
        onChange={(event) => setNextVisitAt(event.target.value)}
      />
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="rounded-lg px-4 py-2 text-xs font-semibold text-[#6e6d68] hover:bg-[#f3f3f0]"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="rounded-lg bg-[#6d5bd0] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          disabled={!advice.trim() || saving}
          onClick={() => void save()}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function PrescriptionDetail({
  prescription,
  onClose,
  onChanged,
}: {
  prescription: HealthPrescription;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [improving, setImproving] = useState("");
  const [stillIssue, setStillIssue] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!improving.trim()) return;
    setSaving(true);
    const response = await fetch("/api/health/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prescriptionId: prescription.id,
        improving,
        stillIssue,
        noteDate: localDateInput(),
      }),
    });
    setSaving(false);
    if (response.ok) {
      setImproving("");
      setStillIssue("");
      await onChanged();
    }
  }

  async function remove() {
    const response = await fetch(
      `/api/health/prescriptions?id=${encodeURIComponent(prescription.id)}`,
      { method: "DELETE" },
    );
    if (response.ok) onClose();
    await onChanged();
  }

  return (
    <Modal
      title={prescription.doctorName || "Doctor visit"}
      subtitle={formatDate(prescription.visitDate, true)}
      onClose={onClose}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
          What the doctor said
        </p>
        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-[#3f3e3a]">
          {prescription.advice}
        </p>
      </div>
      {prescription.medications ? (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
            Medications / diet
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-[#3f3e3a]">
            {prescription.medications}
          </p>
        </div>
      ) : null}
      {prescription.nextVisitAt ? (
        <p className="mt-3 text-[12px] text-[#6e6d68]">
          Next visit: {formatDate(prescription.nextVisitAt)}
        </p>
      ) : null}
      <div className="mt-5 border-t border-[#ecebe7] pt-4">
        <p className="text-[13px] font-bold">What is improving</p>
        <textarea
          className="mt-3 min-h-20 w-full resize-y rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
          placeholder="Energy is better, walking is easier…"
          value={improving}
          onChange={(event) => setImproving(event.target.value)}
        />
        <textarea
          className="mt-3 min-h-16 w-full resize-y rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
          placeholder="What is still an issue? (optional)"
          value={stillIssue}
          onChange={(event) => setStillIssue(event.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <button
            className="rounded-lg bg-[#6d5bd0] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            disabled={!improving.trim() || saving}
            onClick={() => void addNote()}
          >
            Add update
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {prescription.updates.map((note) => (
          <div key={note.id} className="rounded-xl border border-[#ecebe7] p-3">
            <p className="text-[11px] font-semibold text-[#8f8e89]">
              {formatDate(note.noteDate, true)}
            </p>
            <p className="mt-1 text-[13px] leading-5 text-[#367653]">
              Improving: {note.improving}
            </p>
            {note.stillIssue ? (
              <p className="mt-1 text-[12px] leading-5 text-[#5f5e5a]">
                Still: {note.stillIssue}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <button
        className="mt-5 text-[12px] font-semibold text-[#a7463d]"
        onClick={() => void remove()}
      >
        Delete prescription
      </button>
    </Modal>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="max-h-[min(42rem,calc(100dvh-2rem))] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs text-[#888782]">{subtitle}</p> : null}
          </div>
          <button
            className="rounded-lg p-1 text-[#8f8e89] hover:bg-[#f3f3f0]"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
