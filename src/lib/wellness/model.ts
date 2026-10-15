import { z } from "zod";
import { dateSchema } from "../diet/nutrition.ts";

const positive = (max: number) =>
  z.number().finite().positive().max(max).nullable();
export const bodySchema = z
  .object({
    weight_kg: positive(1000),
    muscle_mass_kg: positive(1000),
    body_fat_percent: z.number().finite().min(0).max(100).nullable(),
    fat_mass_kg: z.number().finite().min(0).max(1000).nullable(),
    fat_mass_source: z.enum(["measured", "calculated"]).nullable(),
    waist_cm: positive(500),
    note: z.string().trim().max(2000),
  })
  .refine(
    (d) =>
      d.fat_mass_source !== "calculated" ||
      (d.weight_kg !== null && d.body_fat_percent !== null),
    "계산 체지방량에는 체중과 체지방률이 필요합니다.",
  )
  .refine(
    (d) => d.fat_mass_source !== "measured" || d.fat_mass_kg !== null,
    "실제 측정한 체지방량을 입력하세요.",
  )
  .refine(
    (d) => d.fat_mass_source !== null || d.fat_mass_kg === null,
    "체지방량의 출처를 선택하세요.",
  )
  .refine(
    (d) =>
      d.weight_kg === null ||
      d.fat_mass_source !== "measured" ||
      d.fat_mass_kg === null ||
      d.fat_mass_kg <= d.weight_kg,
    "체지방량은 체중을 초과할 수 없습니다.",
  )
  .refine(
    (d) =>
      d.weight_kg === null ||
      d.muscle_mass_kg === null ||
      d.muscle_mass_kg <= d.weight_kg,
    "골격근량은 체중을 초과할 수 없습니다.",
  )
  .refine(
    (d) =>
      [
        d.weight_kg,
        d.muscle_mass_kg,
        d.body_fat_percent,
        d.fat_mass_kg,
        d.waist_cm,
      ].some((v) => v !== null) || !!d.note,
    "측정값이나 측정 메모를 입력하세요.",
  );
export const conditionSchema = z.object({
  sleep_hours: z.number().finite().min(0).max(24).nullable(),
  fatigue: z.number().int().min(1).max(5).nullable(),
  workout_satisfaction: z.number().int().min(1).max(5).nullable(),
  pain_areas: z.string().trim().max(300),
  pain_intensity: z.number().int().min(0).max(10).nullable(),
  note: z.string().trim().max(2000),
});
export type BodyInput = z.infer<typeof bodySchema>;
export type ConditionInput = z.infer<typeof conditionSchema>;
export type BodyRecord = BodyInput & {
  id: string;
  measured_date: string;
  measured_at: string;
  created_at: string;
  version: number;
};
export type ConditionRecord = ConditionInput & {
  id: string;
  recorded_on: string;
  version: number;
  energy: number | null;
  mood: number | null;
};
export type DaySummary = {
  date: string;
  meals: number;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  completed_workouts: number;
  in_progress_workouts: number;
  body_count: number;
  condition: boolean;
  rests: number;
};
export type BodyPoint = Pick<
  BodyInput,
  | "weight_kg"
  | "muscle_mass_kg"
  | "body_fat_percent"
  | "fat_mass_kg"
  | "fat_mass_source"
  | "waist_cm"
> & { date: string };
export const ranges = ["7", "30", "90", "all"] as const;
export type Range = (typeof ranges)[number];
export const rangeSchema = z.enum(ranges);
export const metrics = [
  { key: "weight_kg", label: "체중", unit: "kg" },
  { key: "muscle_mass_kg", label: "골격근량", unit: "kg" },
  { key: "body_fat_percent", label: "체지방률", unit: "%" },
  { key: "fat_mass_kg", label: "체지방량", unit: "kg" },
  { key: "waist_cm", label: "허리둘레", unit: "cm" },
] as const;
export function calculatedFat(weight: number | null, percent: number | null) {
  if (
    weight === null ||
    percent === null ||
    !Number.isFinite(weight) ||
    !Number.isFinite(percent) ||
    weight <= 0 ||
    percent < 0 ||
    percent > 100
  )
    return null;
  return (weight * percent) / 100;
}
function offsetDay(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function monthBounds(date: string) {
  dateSchema.parse(date);
  const start = date.slice(0, 7) + "-01";
  const d = new Date(`${start}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return { start, end: d.toISOString().slice(0, 10) };
}
export function shiftMonth(date: string, months: number) {
  const { start } = monthBounds(date);
  const d = new Date(`${start}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(d);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  d.setUTCDate(Math.min(Number(date.slice(8)), last.getUTCDate()));
  return d.toISOString().slice(0, 10);
}
export function monthGrid(date: string) {
  const { start } = monthBounds(date);
  const first = offsetDay(start, -new Date(`${start}T12:00:00Z`).getUTCDay());
  return Array.from({ length: 42 }, (_, i) => offsetDay(first, i));
}
export function hasRecord(day: DaySummary | undefined) {
  return (
    !!day &&
    !!(
      day.meals ||
      day.completed_workouts ||
      day.in_progress_workouts ||
      day.body_count ||
      day.condition ||
      day.rests
    )
  );
}
// Fixed ranges retain null days. No zero imputation or carrying observations forward.
export function dailyPoints(
  rows: BodyPoint[],
  end: string,
  range: Range,
): BodyPoint[] {
  dateSchema.parse(end);
  rangeSchema.parse(range);
  const sorted = rows
    .filter((r) => r.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
  const start =
    range === "all" ? sorted[0]?.date : offsetDay(end, 1 - Number(range));
  if (!start) return [];
  const count =
    Math.round(
      (Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) /
        86400000,
    ) + 1;
  const map = new Map(sorted.map((r) => [r.date, r]));
  return Array.from({ length: count }, (_, i) => {
    const date = offsetDay(start, i);
    return (
      map.get(date) || {
        date,
        weight_kg: null,
        muscle_mass_kg: null,
        body_fat_percent: null,
        fat_mass_kg: null,
        fat_mass_source: null,
        waist_cm: null,
      }
    );
  });
}
export function weeklyWeights(rows: BodyPoint[]) {
  const groups = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const day = new Date(`${row.date}T12:00:00Z`).getUTCDay();
    const monday = offsetDay(row.date, -((day + 6) % 7));
    const group = groups.get(monday) || { sum: 0, count: 0 };
    if (row.weight_kg !== null && Number.isFinite(row.weight_kg)) {
      group.sum += row.weight_kg;
      group.count++;
    }
    groups.set(monday, group);
  }
  return [...groups].map(([date, { sum, count }]) => ({
    date,
    weight_kg: count ? sum / count : null,
    count,
  }));
}
export function comparison(
  rows: BodyPoint[],
  key: (typeof metrics)[number]["key"],
) {
  const actual = rows.filter((r) => r[key] !== null && Number.isFinite(r[key]));
  const first = actual.at(0),
    last = actual.at(-1);
  return {
    first,
    last,
    delta: first && last ? last[key]! - first[key]! : null,
    count: actual.length,
  };
}
