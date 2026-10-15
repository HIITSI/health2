"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { barcodeMealSchema } from "@/lib/service/model";
import {
  scaleNutrition,
  dateSchema,
  gramsSchema,
  mealTypes,
} from "@/lib/diet/nutrition";
import { account, check } from "@/lib/service/server";
export async function saveBarcodeMeal(input: unknown) {
  try {
    const d = barcodeMealSchema.parse(input);
    const { client } = await account("write");
    const food = {
      ...d.food,
      ...scaleNutrition(d.food, d.food.reference_grams, 100),
    };
    const r = await client.rpc("diet_add_barcode", {
      p_code: d.barcode,
      p_food: food,
      p_date: d.date,
      p_type: d.type,
      p_grams: d.grams,
      p_request: d.request_id,
    });
    check(r.error);
    revalidatePath("/diet");
    revalidatePath("/");
    revalidatePath("/analytics");
    return { success: "제품과 식단을 저장했습니다." };
  } catch (e) {
    return {
      error:
        e instanceof z.ZodError
          ? "바코드·출처·중량·영양정보를 확인하세요."
          : e instanceof Error
            ? e.message
            : "저장하지 못했습니다.",
    };
  }
}
export async function savePhotoMeal(input: unknown) {
  try {
    const d = z
      .object({
        date: dateSchema,
        type: z.enum(mealTypes),
        request_id: z.uuid(),
        note: z.string().max(2000),
        items: z
          .array(z.object({ food_id: z.uuid(), grams: gramsSchema }))
          .min(1)
          .max(10),
      })
      .parse(input);
    const { client } = await account("write");
    const r = await client.rpc("diet_add_photo_confirmed", {
      p_date: d.date,
      p_type: d.type,
      p_items: d.items,
      p_note: d.note,
      p_request: d.request_id,
    });
    check(r.error);
    revalidatePath("/diet");
    revalidatePath("/");
    revalidatePath("/analytics");
    return {
      success:
        "확인한 음식과 중량으로 식단을 저장했습니다. 영양정보는 등록된 음식 기준입니다.",
    };
  } catch (e) {
    return {
      error:
        e instanceof z.ZodError
          ? "음식·중량과 2,000자 이하 메모를 확인하세요."
          : e instanceof Error
            ? e.message
            : "저장하지 못했습니다.",
    };
  }
}
