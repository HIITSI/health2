import { z } from "zod";
export const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof mealTypes)[number];
export const mealLabels: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};
const amount = z.number().finite().min(0).max(100000);
export const nutrientsSchema = z.object({
  calories: amount,
  carbs_g: amount,
  protein_g: amount,
  fat_g: amount,
});
export type Nutrients = z.infer<typeof nutrientsSchema>;
export const gramsSchema = z.number().finite().positive().max(100000);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const date = new Date(`${s}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s
    );
  }, "올바른 날짜를 선택하세요.")
  .refine(
    (s) => s >= "1900-01-01" && s <= "2100-12-31",
    "1900~2100년 날짜를 선택하세요.",
  );
export const foodSchema = nutrientsSchema
  .extend({
    name: z.string().trim().min(1, "음식명을 입력하세요.").max(120),
    brand: z.string().trim().max(120),
    reference_grams: gramsSchema,
    source: z.string().trim().min(1, "영양정보 출처를 입력하세요.").max(500),
  })
  .refine(
    (d) =>
      d.reference_grams > 0 &&
      ["calories", "carbs_g", "protein_g", "fat_g"].every((key) => {
        const n = (d[key as keyof Nutrients] / d.reference_grams) * 100;
        return Number.isFinite(n) && n >= 0 && n <= 100000;
      }),
    "100g 환산 값이 너무 큽니다. 기준 중량과 영양정보를 확인하세요.",
  );
export function scaleNutrition(
  n: Nutrients,
  basisGrams: number,
  grams: number,
): Nutrients {
  nutrientsSchema.parse(n);
  gramsSchema.parse(basisGrams);
  gramsSchema.parse(grams);
  const factor = grams / basisGrams;
  return {
    calories: n.calories * factor,
    carbs_g: n.carbs_g * factor,
    protein_g: n.protein_g * factor,
    fat_g: n.fat_g * factor,
  };
}
export function sumNutrition(rows: Nutrients[]): Nutrients {
  return rows.reduce(
    (total, n) => ({
      calories: total.calories + Number(n.calories),
      carbs_g: total.carbs_g + Number(n.carbs_g),
      protein_g: total.protein_g + Number(n.protein_g),
      fat_g: total.fat_g + Number(n.fat_g),
    }),
    { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 },
  );
}
export function macroRatios(n: Nutrients) {
  const c = n.carbs_g * 4,
    p = n.protein_g * 4,
    f = n.fat_g * 9,
    total = c + p + f;
  return {
    carbs: total ? (c / total) * 100 : 0,
    protein: total ? (p / total) * 100 : 0,
    fat: total ? (f / total) * 100 : 0,
  };
}
export function koreaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function shiftDate(date: string, days: number) {
  dateSchema.parse(date);
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const fmt = (n: number) =>
  new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(n);
export type Food = Nutrients & {
  id: string;
  name: string;
  brand: string;
  source: string;
  is_custom: boolean;
  is_favorite: boolean;
  serving_grams: number;
  reference_grams: number;
};
export type Item = Nutrients & {
  id: string;
  food_id: string | null;
  food_name: string;
  brand: string;
  source: string;
  grams: number;
  calories_per100: number;
  carbs_per100: number;
  protein_per100: number;
  fat_per100: number;
  meal_id: string;
};
export type Meal = {
  id: string;
  meal_date: string;
  meal_type: MealType;
  meal_items: Item[];
};
export type Combo = {
  id: string;
  name: string;
  diet_combo_items: { food_id: string; grams: number }[];
};
export type Goals = {
  calories: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
};
