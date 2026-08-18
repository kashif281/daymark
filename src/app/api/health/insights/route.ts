import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";
import { dateKey, handleHealthError, parseDateInput, toUiCheckIn, utcDate } from "@/lib/health";

const MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

const SYSTEM_PROMPT = `You are a health-focused AI assistant powered by Gemini Flash.

Your primary responsibility is to continuously keep track of the user's health-related journey and maintain awareness of the user's previous health data, previous conversations, previous inputs, actions, progress, and outcomes.

You must always consider the user's previous health data before responding to new health-related information.

Do not treat each conversation, question, measurement, activity, symptom, habit, or update as an isolated event. Always understand the current information in the context of what has happened previously.

Continuously track the user's overall health journey and determine whether the user is moving in the right direction, moving in the wrong direction, improving, declining, or showing no meaningful change based on the available health data.

Keep track of everything relevant to the user's health journey, including previous information, changes over time, actions taken, progress, setbacks, patterns, and outcomes.

When new health information is provided:
1. Compare it with the user's previous health data.
2. Identify what has changed.
3. Identify whether the change is positive, negative, or unchanged.
4. Consider the user's previous actions and whether they appear to be helping or hurting their progress.
5. Keep the broader health journey in context.
6. Continue building an ongoing understanding of the user's health progress rather than starting over.
7. Clearly identify when the user appears to be moving in the right direction or the wrong direction based on the available information.
8. Keep tracking the journey throughout future interactions.

The AI must prioritize continuity and historical context. Previous health data must remain relevant when interpreting new health information.

The goal is to understand the user's complete health journey over time and continuously evaluate where they are, where they came from, what they are doing, what is changing, and whether their overall direction is positive, negative, or unchanged.

Remain focused specifically on health and health-related information.
You are not a doctor. Never diagnose. If something looks medically concerning, say to check with a clinician.

Return JSON only with keys:
headline (short),
direction ("right" | "wrong" | "improving" | "declining" | "unchanged"),
comparison (3-6 sentences covering today vs previous days, the ongoing journey, and whether they are on track),
changed (array of short change notes),
helping (one sentence or empty),
hurting (one sentence or empty),
suggestions (array of 3 short next actions),
attention ("none" | "watch" | "urgent").`;

function daysBack(from: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(from);
    date.setUTCDate(from.getUTCDate() - (count - 1 - index));
    return date;
  });
}

function compactCheckIn(entry: ReturnType<typeof toUiCheckIn>) {
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

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        headline: "Gemini is not connected yet",
        comparison:
          "Add GEMINI_API_KEY so the assistant can keep tracking your health journey over time.",
        suggestions: [],
        attention: "none",
        direction: "unchanged",
        changed: [],
        helping: null,
        hurting: null,
      });
    }

    const today =
      parseDateInput(new URL(request.url).searchParams.get("date")) ?? utcDate(0);
    const days = daysBack(today, 30);
    const start = days[0];
    const todayKey = dateKey(today);
    const yesterdayKey = dateKey(days[days.length - 2] ?? today);
    const db = getDb();

    const [checkIns, routines, symptoms, medications, prescriptions, previousInsights] =
      await Promise.all([
        db.healthCheckIn.findMany({
          where: { userId: user.id, logDate: { gte: start } },
          orderBy: { logDate: "asc" },
        }),
        db.healthRoutine.findMany({
          where: { userId: user.id, archived: false },
          include: {
            logs: {
              where: { logDate: { gte: start } },
              orderBy: { logDate: "asc" },
            },
          },
        }),
        db.healthSymptom.findMany({
          where: { userId: user.id, logDate: { gte: start } },
          orderBy: { logDate: "asc" },
        }),
        db.healthMedication.findMany({
          where: { userId: user.id, active: true },
          include: {
            logs: { where: { logDate: { gte: start } } },
          },
        }),
        db.healthPrescription.findMany({
          where: { userId: user.id },
          orderBy: { visitDate: "desc" },
          take: 5,
          include: { updates: { orderBy: { noteDate: "desc" }, take: 5 } },
        }),
        db.healthJourneyInsight.findMany({
          where: { userId: user.id },
          orderBy: { logDate: "desc" },
          take: 14,
        }),
      ]);

    const byDate = new Map(checkIns.map((item) => [dateKey(item.logDate), item]));
    const snapshot = {
      today: todayKey,
      yesterday: yesterdayKey,
      vitalsToday: compactCheckIn(toUiCheckIn(byDate.get(todayKey) ?? null)),
      vitalsYesterday: compactCheckIn(toUiCheckIn(byDate.get(yesterdayKey) ?? null)),
      vitalsHistory: days.map((date) => ({
        date: dateKey(date),
        ...compactCheckIn(toUiCheckIn(byDate.get(dateKey(date)) ?? null)),
      })),
      habits: routines.map((routine) => ({
        title: routine.title,
        kind: routine.kind,
        target: routine.target,
        doneToday: routine.logs.some(
          (log) => dateKey(log.logDate) === todayKey && log.completed,
        ),
        completedDates: routine.logs
          .filter((log) => log.completed)
          .map((log) => dateKey(log.logDate)),
        amounts: routine.logs
          .filter((log) => log.amount)
          .map((log) => ({ date: dateKey(log.logDate), amount: log.amount })),
      })),
      symptomsHistory: symptoms.map((item) => ({
        date: dateKey(item.logDate),
        name: item.name,
        severity: item.severity,
      })),
      medications: medications.map((item) => ({
        name: item.name,
        dose: item.dose,
        takenToday: item.logs.some(
          (log) => dateKey(log.logDate) === todayKey && log.taken,
        ),
        takenDates: item.logs.filter((log) => log.taken).map((log) => dateKey(log.logDate)),
      })),
      doctorJourney: prescriptions.map((item) => ({
        doctorName: item.doctorName,
        advice: item.advice,
        medications: item.medications,
        updates: item.updates.map((note) => ({
          date: dateKey(note.noteDate),
          improving: note.improving,
          stillIssue: note.stillIssue,
        })),
      })),
      previousAssistantNotes: previousInsights
        .filter((item) => dateKey(item.logDate) !== todayKey)
        .map((item) => ({
          date: dateKey(item.logDate),
          headline: item.headline,
          direction: item.direction,
          comparison: item.comparison,
          changed: asStringArray(item.changed),
          helping: item.helping,
          hurting: item.hurting,
          suggestions: asStringArray(item.suggestions),
        })),
    };

    const hasSignal =
      snapshot.vitalsToday.sleepHours != null ||
      snapshot.vitalsToday.mood != null ||
      snapshot.vitalsToday.energy != null ||
      snapshot.vitalsToday.heartRate != null ||
      snapshot.vitalsToday.systolic != null ||
      snapshot.symptomsHistory.some((item) => item.date === todayKey) ||
      snapshot.habits.some((item) => item.doneToday) ||
      snapshot.vitalsHistory.some(
        (item) =>
          item.sleepHours != null || item.mood != null || item.heartRate != null,
      );

    if (!hasSignal) {
      return NextResponse.json({
        configured: true,
        headline: "Start the health journey",
        comparison:
          "There is not enough logged health data yet. Add vitals, habits, or symptoms so the assistant can compare today with previous days and keep tracking direction over time.",
        suggestions: [
          "Mark a walk, exercise, or diet habit done.",
          "Add sleep, water, mood, or a vital.",
        ],
        attention: "none",
        direction: "unchanged",
        changed: [],
        helping: null,
        hurting: null,
      });
    }

    const insight = await askGemini(
      apiKey,
      `Here is the user's ongoing health journey. Previous assistant notes must stay relevant. Compare the latest data with previous health data, name what changed, say if the direction is right, wrong, improving, declining, or unchanged, and continue the journey rather than starting over.\n\n${JSON.stringify(snapshot)}`,
    );

    await db.healthJourneyInsight.upsert({
      where: { userId_logDate: { userId: user.id, logDate: today } },
      create: {
        userId: user.id,
        logDate: today,
        headline: insight.headline,
        comparison: insight.comparison,
        direction: insight.direction,
        attention: insight.attention,
        suggestions: insight.suggestions,
        changed: insight.changed,
        helping: insight.helping,
        hurting: insight.hurting,
      },
      update: {
        headline: insight.headline,
        comparison: insight.comparison,
        direction: insight.direction,
        attention: insight.attention,
        suggestions: insight.suggestions,
        changed: insight.changed,
        helping: insight.helping,
        hurting: insight.hurting,
      },
    });

    return NextResponse.json({ configured: true, ...insight });
  } catch (error) {
    const result = handleHealthError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

async function askGemini(apiKey: string, prompt: string) {
  let lastError = "Gemini request failed.";
  for (const model of MODELS) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!response.ok) {
      lastError = `Gemini ${model} returned ${response.status}.`;
      continue;
    }
    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      lastError = "Gemini returned an empty response.";
      continue;
    }
    try {
      const parsed = JSON.parse(text) as {
        headline?: string;
        comparison?: string;
        suggestions?: string[];
        attention?: string;
        direction?: string;
        changed?: string[];
        helping?: string | null;
        hurting?: string | null;
      };
      const direction =
        parsed.direction === "right" ||
        parsed.direction === "wrong" ||
        parsed.direction === "improving" ||
        parsed.direction === "declining" ||
        parsed.direction === "unchanged"
          ? parsed.direction
          : "unchanged";
      return {
        headline: parsed.headline || "Health journey update",
        comparison: parsed.comparison || "",
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.slice(0, 5).map(String)
          : [],
        attention:
          parsed.attention === "urgent" || parsed.attention === "watch"
            ? parsed.attention
            : ("none" as const),
        direction,
        changed: Array.isArray(parsed.changed) ? parsed.changed.map(String).slice(0, 6) : [],
        helping: parsed.helping?.trim() || null,
        hurting: parsed.hurting?.trim() || null,
      };
    } catch {
      lastError = "Gemini returned invalid JSON.";
    }
  }
  return {
    headline: "Could not update the journey yet",
    comparison: lastError,
    suggestions: ["Log another vital or habit and try again in a moment."],
    attention: "none" as const,
    direction: "unchanged" as const,
    changed: [] as string[],
    helping: null as string | null,
    hurting: null as string | null,
  };
}
