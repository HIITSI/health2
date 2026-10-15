import { z } from "zod";
import { dateSchema, type Nutrients } from "../diet/nutrition.ts";
import type { BodyPoint, Range } from "../wellness/model.ts";
export const goalModes = {
  bulk: "벌크업",
  cut: "다이어트",
  maintain: "체중 유지",
  custom: "사용자 직접 설정",
} as const;
export const activities = {
  sedentary: "낮음 · 주로 앉아서 생활",
  light: "가벼움 · 가벼운 활동/운동",
  moderate: "보통 · 규칙적인 운동",
  high: "높음 · 활동적인 생활/운동",
  athlete: "매우 높음 · 강도 높은 활동",
} as const;
const target = z.number().finite().min(0.1).max(100000);
export const goalSchema = z.object({
  goal_mode: z.enum(["bulk", "cut", "maintain", "custom"]),
  current_weight: z.number().finite().positive().max(1000),
  target_weight: z.number().finite().positive().max(1000),
  target_date: dateSchema.nullable(),
  activity_level: z.enum(["sedentary", "light", "moderate", "high", "athlete"]),
  calories: target,
  carbs_g: target,
  protein_g: target,
  fat_g: target,
});
export type GoalInput = z.infer<typeof goalSchema>;
export type NutritionKey = keyof Nutrients;
export const nutritionMetrics = [
  { key: "calories", label: "열량", unit: "kcal" },
  { key: "carbs_g", label: "탄수화물", unit: "g" },
  { key: "protein_g", label: "단백질", unit: "g" },
  { key: "fat_g", label: "지방", unit: "g" },
] as const;
export type Goal = {
  goal_mode: keyof typeof goalModes;
  current_weight: number | null;
  target_weight: number | null;
  target_date: string | null;
  activity_level: keyof typeof activities | null;
  calories: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  version: number;
};
export type GoalSnapshot = Omit<Goal, "version"> & {
  id: string;
  effective_date: string;
  created_at: string;
  is_active: boolean;
};
export type NutritionDay = Nutrients & {
  date: string;
  items: number;
  goal: GoalSnapshot | null;
};
export type WorkoutDay = {
  date: string;
  exercise_id: string;
  name: string;
  max_weight: number;
  max_reps: number;
  estimated_1rm: number | null;
  volume: number;
  working_sets: number;
  total_reps: number;
  sessions: number;
};
export type SessionDay = {
  id: string;
  date: string;
  volume: number;
  working_sets: number;
};
export type PartDay = {
  date: string;
  muscle_group: string;
  working_sets: number;
};
export type Best = {
  exercise_id: string;
  name: string;
  max_weight: number;
  max_reps: number;
  estimated_1rm: number | null;
};
export type PersonalRecord = Best & {
  date: string;
  session_id: string;
  previous_weight: number | null;
  previous_reps: number | null;
  previous_1rm: number | null;
};
export type AnalysisData = {
  nutrition: NutritionDay[];
  body: BodyPoint[];
  workouts: WorkoutDay[];
  sessions: SessionDay[];
  parts: PartDay[];
  best: Best[];
  personal_records: PersonalRecord[];
  goals: GoalSnapshot[];
  current_goal: Goal | null;
  exercises: { id: string; name: string; muscle_group: string }[];
};
export const emptyAnalysis = (): AnalysisData => ({
  nutrition: [],
  body: [],
  workouts: [],
  sessions: [],
  parts: [],
  best: [],
  personal_records: [],
  goals: [],
  current_goal: null,
  exercises: [],
});
export function offsetDate(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function monday(date: string) {
  return offsetDate(
    date,
    -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7),
  );
}
export function periodStart(end: string, range: Range, data?: AnalysisData) {
  if (range !== "all") return offsetDate(end, 1 - Number(range));
  const dates = [
    ...(data?.nutrition || []).map((r) => r.date),
    ...(data?.body || []).map((r) => r.date),
    ...(data?.workouts || []).map((r) => r.date),
  ]
    .filter((d) => d <= end)
    .sort();
  return dates[0] || end;
}
export function datesIn(start: string, end: string) {
  const n =
    Math.round(
      (Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) /
        86400000,
    ) + 1;
  return Array.from({ length: Math.max(0, n) }, (_, i) => offsetDate(start, i));
}
export function mean(values: (number | null | undefined)[]) {
  const valid = values.filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}
export function progress(
  actual: number | null | undefined,
  target: number | null | undefined,
) {
  if (
    actual == null ||
    target == null ||
    !Number.isFinite(actual) ||
    !Number.isFinite(target) ||
    target <= 0
  )
    return null;
  const p = (actual / target) * 100;
  return Number.isFinite(p) ? p : null;
}
export function withinGoal(actual: number, target: number | null) {
  return (
    target !== null &&
    target > 0 &&
    Number.isFinite(actual) &&
    Math.abs(actual - target) <= target * 0.1 + 1e-8
  );
}
export function nutritionStats(rows: NutritionDay[]) {
  const recorded = rows.filter((r) => r.items > 0);
  const assessed = recorded.filter(
    (r) =>
      r.goal?.is_active &&
      nutritionMetrics.some(
        (m) => r.goal![m.key] !== null && r.goal![m.key]! > 0,
      ),
  );
  const met = assessed.filter((r) =>
    nutritionMetrics.every(
      (m) => r.goal![m.key] === null || withinGoal(r[m.key], r.goal![m.key]),
    ),
  );
  return {
    days: recorded.length,
    average: {
      calories: mean(recorded.map((r) => r.calories)),
      carbs_g: mean(recorded.map((r) => r.carbs_g)),
      protein_g: mean(recorded.map((r) => r.protein_g)),
      fat_g: mean(recorded.map((r) => r.fat_g)),
    },
    assessed: assessed.length,
    achieved: met.length,
    calorieDays: assessed.filter((r) => r.goal?.calories !== null).length,
    calorieAchieved: assessed.filter(
      (r) =>
        r.goal?.calories !== null && withinGoal(r.calories, r.goal!.calories),
    ).length,
  };
}
export function nutritionSeries(
  rows: NutritionDay[],
  start: string,
  end: string,
) {
  const map = new Map(rows.filter((r) => r.items > 0).map((r) => [r.date, r]));
  return datesIn(start, end).map((date) => {
    const r = map.get(date);
    return {
      date,
      calories: r?.calories ?? null,
      carbs_g: r?.carbs_g ?? null,
      protein_g: r?.protein_g ?? null,
      fat_g: r?.fat_g ?? null,
      target_calories: r?.goal?.is_active ? r.goal.calories : null,
    };
  });
}
export function weeklySeries(data: AnalysisData, start: string, end: string) {
  const days = datesIn(start, end),
    weeks = [...new Set(days.map(monday))];
  return weeks.map((date) => {
    const inWeek = (d: string) => d >= start && d <= end && monday(d) === date;
    const n = data.nutrition.filter((r) => r.items > 0 && inWeek(r.date)),
      b = data.body.filter(
        (r) =>
          inWeek(r.date) &&
          r.weight_kg !== null &&
          Number.isFinite(r.weight_kg),
      ),
      s = data.sessions.filter((r) => inWeek(r.date));
    return {
      date,
      end: offsetDate(date, 6),
      calories: mean(n.map((r) => r.calories)),
      nutrition_days: n.length,
      weight_kg: mean(b.map((r) => r.weight_kg)),
      weight_days: b.length,
      volume: s.reduce((a, r) => a + r.volume, 0),
      working_sets: s.reduce((a, r) => a + r.working_sets, 0),
      workout_days: new Set(s.map((r) => r.date)).size,
      sessions: s.length,
    };
  });
}
export function exerciseSummary(rows: WorkoutDay[]) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  return {
    first: sorted[0],
    last: sorted.at(-1),
    maxWeight: sorted.length
      ? Math.max(...sorted.map((r) => r.max_weight))
      : null,
    maxReps: sorted.length ? Math.max(...sorted.map((r) => r.max_reps)) : null,
    estimated: sorted.length
      ? Math.max(...sorted.map((r) => r.estimated_1rm ?? 0)) || null
      : null,
    volume: sorted.reduce((a, r) => a + r.volume, 0),
    sets: sorted.reduce((a, r) => a + r.working_sets, 0),
  };
}
export function goalAt(history: GoalSnapshot[], date: string) {
  return (
    [...history]
      .filter((g) => g.effective_date <= date)
      .sort(
        (a, b) =>
          b.effective_date.localeCompare(a.effective_date) ||
          b.created_at.localeCompare(a.created_at) ||
          b.id.localeCompare(a.id),
      )[0] || null
  );
}
export function goalInsight(data: AnalysisData, end: string) {
  const recentStart = offsetDate(end, -6),
    previousStart = offsetDate(end, -13);
  const previous = data.body.filter(
      (b) =>
        b.date >= previousStart &&
        b.date < recentStart &&
        b.weight_kg !== null &&
        Number.isFinite(b.weight_kg),
    ),
    recent = data.body.filter(
      (b) =>
        b.date >= recentStart &&
        b.date <= end &&
        b.weight_kg !== null &&
        Number.isFinite(b.weight_kg),
    );
  const goal = goalAt(data.goals, end);
  const weightDelta =
    previous.length >= 3 && recent.length >= 3
      ? mean(recent.map((b) => b.weight_kg))! -
        mean(previous.map((b) => b.weight_kg))!
      : null;
  const paired = data.nutrition.filter(
    (r) =>
      r.date >= previousStart &&
      r.date <= end &&
      r.items > 0 &&
      r.goal?.is_active &&
      r.goal.calories !== null,
  );
  const gap = paired.length
    ? mean(paired.map((r) => r.calories - r.goal!.calories!))
    : null;
  const signatures = new Set(
    datesIn(previousStart, end).map((d) => {
      const g = goalAt(data.goals, d);
      return g?.is_active ? `${g.goal_mode}:${g.calories}` : "unknown";
    }),
  );
  const stable = signatures.size === 1 && !signatures.has("unknown");
  const sufficient = weightDelta !== null && paired.length >= 10 && stable;
  const weightTrend =
    weightDelta === null
      ? "측정 자료 부족"
      : Math.abs(weightDelta) < 0.2
        ? "두 주 평균 차이 0.2kg 미만"
        : weightDelta > 0
          ? "두 주 평균 체중 증가"
          : "두 주 평균 체중 감소";
  const intake =
    gap === null
      ? "목표와 비교 가능한 섭취 기록 없음"
      : Math.abs(gap) <=
          Math.abs(mean(paired.map((r) => r.goal!.calories!))!) * 0.1
        ? "기록된 평균 열량이 목표 ±10% 범위"
        : gap < 0
          ? "기록된 평균 열량이 목표보다 낮음"
          : "기록된 평균 열량이 목표보다 높음";
  let guidance =
    "기록 수와 목표 변경 여부를 확인하고 자료를 더 쌓은 뒤 섭취량 조절 여부를 판단하세요.";
  if (sufficient) {
    if (
      goal?.goal_mode === "bulk" &&
      weightDelta! < 0.2 &&
      gap! < -mean(paired.map((r) => r.goal!.calories!))! * 0.1
    )
      guidance =
        "체중 증가가 작고 기록된 열량이 목표보다 낮습니다. 누락 여부를 확인한 뒤 섭취량 조절 필요성을 검토할 수 있습니다.";
    else if (
      goal?.goal_mode === "cut" &&
      weightDelta! > -0.2 &&
      gap! > mean(paired.map((r) => r.goal!.calories!))! * 0.1
    )
      guidance =
        "체중 감소가 작고 기록된 열량이 목표보다 높습니다. 누락 여부를 확인한 뒤 섭취량 조절 필요성을 검토할 수 있습니다.";
    else
      guidance =
        "두 주 평균과 당시 목표 대비 기록을 참고해 현재 계획을 검토하세요. 관찰된 변화가 섭취량 때문에 생겼다고 확정할 수는 없습니다.";
  }
  return {
    goal,
    weightDelta,
    weightTrend,
    intake,
    gap,
    previousDays: previous.length,
    recentDays: recent.length,
    nutritionDays: paired.length,
    stable,
    sufficient,
    guidance,
  };
}
