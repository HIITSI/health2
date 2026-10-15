"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";
import {
  dateSchema,
  foodSchema,
  gramsSchema,
  mealTypes,
  scaleNutrition,
  nutrientsSchema,
} from "@/lib/diet/nutrition";
export type Result = { error?: string; success?: string };
const itemsSchema = z
  .array(z.object({ food_id: z.uuid(), grams: gramsSchema }))
  .min(1)
  .max(100);
async function account() {
  const client = await supabase();
  if (!client) throw new Error("Supabase 연결 후 사용할 수 있습니다.");
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new Error("다시 로그인해 주세요.");
  return { client, user };
}
function databaseError(error: unknown) {
  if (error)
    throw new Error(
      "저장에 실패했습니다. 연결·권한·마이그레이션 상태를 확인하세요.",
    );
}
async function run(operation: () => Promise<string>): Promise<Result> {
  try {
    const success = await operation();
    revalidatePath("/diet");
    revalidatePath("/");
    revalidatePath("/analytics");
    return { success };
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? "입력값을 확인하세요. " + error.issues[0].message
          : error instanceof Error
            ? error.message
            : "요청을 처리하지 못했습니다.",
    };
  }
}
export async function registerFood(
  input: unknown,
  id?: string,
): Promise<Result> {
  return run(async () => {
    const food = foodSchema.parse(input);
    const normalized = scaleNutrition(food, food.reference_grams, 100);
    nutrientsSchema.parse(normalized);
    const { client, user } = await account();
    const row = {
      ...normalized,
      name: food.name,
      brand: food.brand,
      source: food.source,
      is_custom: true,
      serving_grams: 100,
      reference_grams: food.reference_grams,
    };
    const response = id
      ? await client
          .from("foods")
          .update(row)
          .eq("id", z.uuid().parse(id))
          .eq("user_id", user.id)
          .select("id")
          .single()
      : await client
          .from("foods")
          .insert({ ...row, user_id: user.id })
          .select("id")
          .single();
    databaseError(response.error);
    return id
      ? "음식 정보를 수정했습니다. 기존 식단의 영양 기록은 유지됩니다."
      : "음식을 등록했습니다.";
  });
}
export async function favoriteFood(
  id: string,
  favorite: boolean,
): Promise<Result> {
  return run(async () => {
    z.uuid().parse(id);
    z.boolean().parse(favorite);
    const { client, user } = await account();
    const result = await client
      .from("foods")
      .update({ is_favorite: favorite })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    databaseError(result.error);
    return favorite ? "즐겨찾기에 추가했습니다." : "즐겨찾기를 해제했습니다.";
  });
}
export async function addMeal(input: unknown): Promise<Result> {
  return run(async () => {
    const data = z
      .object({ date: dateSchema, type: z.enum(mealTypes), items: itemsSchema })
      .parse(input);
    const { client } = await account();
    const result = await client.rpc("diet_add_meal", {
      p_date: data.date,
      p_type: data.type,
      p_items: data.items,
    });
    databaseError(result.error);
    return "식단을 저장했습니다.";
  });
}
export async function editItem(id: string, grams: number): Promise<Result> {
  return run(async () => {
    z.uuid().parse(id);
    gramsSchema.parse(grams);
    const { client } = await account();
    const result = await client.rpc("diet_edit_item", {
      p_id: id,
      p_grams: grams,
    });
    databaseError(result.error);
    return "섭취량을 수정했습니다.";
  });
}
export async function deleteItem(id: string): Promise<Result> {
  return run(async () => {
    z.uuid().parse(id);
    const { client } = await account();
    const result = await client.rpc("diet_delete_item", { p_id: id });
    databaseError(result.error);
    return "음식 기록을 삭제했습니다.";
  });
}
export async function saveCombo(name: string, items: unknown): Promise<Result> {
  return run(async () => {
    z.string().trim().min(1).max(120).parse(name);
    const parsed = itemsSchema.parse(items);
    const { client } = await account();
    const result = await client.rpc("diet_save_combo", {
      p_name: name,
      p_items: parsed,
    });
    databaseError(result.error);
    return "식단 조합을 저장했습니다.";
  });
}
export async function deleteCombo(id: string): Promise<Result> {
  return run(async () => {
    z.uuid().parse(id);
    const { client, user } = await account();
    const result = await client
      .from("diet_combos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    databaseError(result.error);
    return "조합을 삭제했습니다.";
  });
}
export async function copyDay(from: string, to: string): Promise<Result> {
  return run(async () => {
    dateSchema.parse(from);
    dateSchema.parse(to);
    if (from === to) throw new Error("다른 날짜를 선택하세요.");
    const { client } = await account();
    const result = await client.rpc("diet_copy_day", {
      p_from: from,
      p_to: to,
    });
    databaseError(result.error);
    if (!result.data) throw new Error("선택한 날짜에 복사할 식단이 없습니다.");
    return `${result.data}개 식사 기록을 복사했습니다. 기존 대상 날짜의 기록은 유지됩니다.`;
  });
}
export async function saveGoals(input: unknown): Promise<Result> {
  return run(async () => {
    const goal = z.number().finite().positive().max(100000).nullable();
    const data = z
      .object({ calories: goal, carbs_g: goal, protein_g: goal, fat_g: goal })
      .parse(input);
    const { client, user } = await account();
    const result = await client.from("nutrition_goals").upsert({
      ...data,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    });
    databaseError(result.error);
    return "일일 섭취 목표를 저장했습니다.";
  });
}
