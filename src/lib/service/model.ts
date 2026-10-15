import { z } from "zod";
import {
  dateSchema,
  foodSchema,
  gramsSchema,
  mealTypes,
} from "../diet/nutrition.ts";
export function validBarcode(code: string) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  const digits = [...code].map(Number),
    check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
export const barcodeSchema = z
  .string()
  .trim()
  .refine(validBarcode, "8·12·13·14자리 바코드와 검증 숫자를 확인하세요.");
export const barcodeMealSchema = z.object({
  barcode: barcodeSchema,
  date: dateSchema,
  type: z.enum(mealTypes),
  grams: gramsSchema,
  request_id: z.uuid(),
  food: foodSchema.extend({ data_provider: z.enum(["user", "openfoodfacts"]) }),
});
export type BarcodeProduct = Omit<
  z.infer<typeof barcodeMealSchema>["food"],
  "calories" | "carbs_g" | "protein_g" | "fat_g"
> & {
  barcode: string;
  id?: string;
  incomplete?: boolean;
  calories: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
};
export const photoResultSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        estimated_grams: z.number().finite().positive().max(5000).nullable(),
        cooking_method: z.string().max(200),
        uncertainty: z.string().min(1).max(500),
      }),
    )
    .max(10),
  note: z.string().max(1000),
});
export type PhotoResult = z.infer<typeof photoResultSchema>;
export const dataTables = [
  "foods",
  "exercises",
  "workout_routines",
  "workout_routine_days",
  "routine_exercises",
  "diet_combos",
  "diet_combo_items",
  "meal_records",
  "meal_items",
  "workout_sessions",
  "workout_session_exercises",
  "workout_sets",
  "workout_routine_progress",
  "workout_routine_events",
  "body_measurements",
  "condition_records",
  "goals",
  "nutrition_goals",
  "nutrition_goal_history",
] as const;
export const backupSchema = z
  .object({
    format: z.literal("fitlog-backup"),
    version: z.literal(1),
    schema_version: z.literal(6),
    exported_at: z.iso.datetime({ offset: true }),
    owner_id: z.uuid(),
    revision: z.number().int().nonnegative(),
    profile: z.record(z.string(), z.unknown()),
    tables: z.object(
      Object.fromEntries(
        dataTables.map((t) => [
          t,
          z.array(z.record(z.string(), z.unknown())).max(20000),
        ]),
      ) as Record<
        (typeof dataTables)[number],
        z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      >,
    ),
  })
  .refine(
    (b) => Object.values(b.tables).reduce((n, r) => n + r.length, 0) <= 20000,
    "백업은 총 20,000행까지 복구할 수 있습니다.",
  )
  .superRefine((b, ctx) => {
    const numeric = new Set([
      "calories",
      "carbs_g",
      "protein_g",
      "fat_g",
      "serving_grams",
      "reference_grams",
      "grams",
      "calories_per100",
      "carbs_per100",
      "protein_per100",
      "fat_per100",
      "weight_kg",
      "height_cm",
      "muscle_mass_kg",
      "body_fat_percent",
      "fat_mass_kg",
      "waist_cm",
      "sleep_hours",
      "fatigue",
      "workout_satisfaction",
      "pain_intensity",
      "energy",
      "mood",
      "current_weight",
      "target_weight",
      "target_value",
      "target_sets",
      "target_weight",
      "target_reps",
      "reps",
      "set_number",
      "effort_value",
      "rest_seconds",
      "default_rest_seconds",
      "settings_version",
      "position",
      "day_index",
      "routine_day_index",
      "cycle_length",
      "revision",
      "version",
      "duration_seconds",
      "distance_m",
    ]);
    for (const [table, rows] of Object.entries(b.tables))
      for (const [i, row] of rows.entries())
        for (const [key, value] of Object.entries(row))
          if (
            numeric.has(key) &&
            value !== null &&
            (typeof value !== "number" || !Number.isFinite(value))
          )
            ctx.addIssue({
              code: "custom",
              message: "백업 숫자 필드가 손상되었습니다.",
              path: ["tables", table, i, key],
            });
  });
export type Backup = z.infer<typeof backupSchema>;
export const exportSchema = z
  .object({
    start: dateSchema,
    end: dateSchema,
    kind: z.enum(["diet", "workout", "body"]),
    format: z.enum(["csv", "xlsx"]),
  })
  .refine((d) => d.start <= d.end, "시작일이 종료일보다 늦습니다.");
export const timerSchema = z.object({
  id: z.string(),
  label: z.string().max(200),
  duration: z.number().int().min(1).max(3600),
  remaining_ms: z.number().finite().min(0).max(3600000),
  deadline: z.number().finite().nullable(),
  status: z.enum(["running", "paused", "idle", "finished"]),
  notified: z.boolean(),
});
export type RestState = z.infer<typeof timerSchema>;
export function restRemaining(state: RestState, now: number) {
  return state.status === "running" && state.deadline !== null
    ? Math.max(0, Math.min(state.duration * 1000, state.deadline - now))
    : state.remaining_ms;
}
export function pauseRest(state: RestState, now: number): RestState {
  return {
    ...state,
    remaining_ms: restRemaining(state, now),
    deadline: null,
    status: "paused",
  };
}
export function resumeRest(state: RestState, now: number): RestState {
  return { ...state, deadline: now + state.remaining_ms, status: "running" };
}
