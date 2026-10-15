"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";
import { dateSchema } from "@/lib/diet/nutrition";
import { bodySchema, conditionSchema } from "@/lib/wellness/model";
export type WellnessResult = {
  success?: string;
  error?: string;
  conflict?: boolean;
  id?: string;
};
async function write(name: string, args: object): Promise<WellnessResult> {
  const client = await supabase();
  if (!client) return { error: "Supabase 연결 후 사용할 수 있습니다." };
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return { error: "다시 로그인해 주세요." };
  const r = await client.rpc(name, args);
  if (r.error)
    return {
      conflict: r.error.code === "PT409",
      error:
        r.error.code === "PT409"
          ? "다른 기기에서 기록이 변경되었습니다. 최신 기록을 불러온 뒤 다시 수정하세요."
          : r.error.message.includes("Empty condition")
            ? "컨디션 항목이나 메모를 하나 이상 입력하세요."
            : "저장하지 못했습니다. 연결·권한·입력값을 확인하세요.",
    };
  revalidatePath("/calendar");
  revalidatePath("/analytics");
  revalidatePath("/");
  return {
    success: "기록을 저장했습니다.",
    id: typeof r.data === "string" ? r.data : undefined,
  };
}
function invalid(error: unknown): WellnessResult {
  const message = error instanceof z.ZodError ? error.issues[0]?.message : "";
  return {
    error:
      message && /[가-힣]/.test(message)
        ? message
        : "입력값을 확인하세요. 측정 단위와 각 항목의 범위를 확인해 주세요.",
  };
}
export async function saveBody(
  date: string,
  input: unknown,
  id: string | null,
  version: number | null,
): Promise<WellnessResult> {
  try {
    dateSchema.parse(date);
    z.uuid().nullable().parse(id);
    z.number().int().min(0).nullable().parse(version);
    return await write("wellness_save_body", {
      p_date: date,
      p_data: bodySchema.parse(input),
      p_id: id,
      p_version: version,
    });
  } catch (e) {
    return invalid(e);
  }
}
export async function saveCondition(
  date: string,
  input: unknown,
  version: number | null,
): Promise<WellnessResult> {
  try {
    dateSchema.parse(date);
    z.number().int().min(0).nullable().parse(version);
    return await write("wellness_save_condition", {
      p_date: date,
      p_data: conditionSchema.parse(input),
      p_version: version,
    });
  } catch (e) {
    return invalid(e);
  }
}
export async function deleteWellness(
  kind: "body" | "condition",
  id: string,
  version: number,
): Promise<WellnessResult> {
  try {
    z.enum(["body", "condition"]).parse(kind);
    z.uuid().parse(id);
    z.number().int().min(0).parse(version);
    const result = await write("wellness_delete", {
      p_kind: kind,
      p_id: id,
      p_version: version,
    });
    return result.error ? result : { success: "기록을 삭제했습니다." };
  } catch (e) {
    return invalid(e);
  }
}
