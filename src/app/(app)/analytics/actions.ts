"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";
import { goalSchema } from "@/lib/analysis/model";
export async function saveAnalysisGoal(
  input: unknown,
  version: number | null,
): Promise<{ success?: string; error?: string; conflict?: boolean }> {
  try {
    const data = goalSchema.parse(input);
    z.number().int().min(0).nullable().parse(version);
    const client = await supabase();
    if (!client)
      return { error: "Supabase 연결 후 목표를 저장할 수 있습니다." };
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return { error: "다시 로그인해 주세요." };
    const r = await client.rpc("analysis_save_goal", {
      p_version: version,
      p_data: data,
    });
    if (r.error)
      return {
        conflict: r.error.code === "PT409",
        error:
          r.error.code === "PT409"
            ? "다른 저장에서 목표가 변경되었습니다. 최신 목표를 불러온 뒤 다시 수정하세요."
            : "목표를 저장하지 못했습니다. 입력값·권한·연결을 확인하세요.",
      };
    revalidatePath("/");
    revalidatePath("/analytics");
    revalidatePath("/diet");
    return { success: "목표를 저장했습니다. 식단과 분석에 함께 적용됩니다." };
  } catch (e) {
    return {
      error:
        e instanceof z.ZodError
          ? "입력값을 확인하세요. 체중은 0 초과~1,000kg, 영양 목표는 0.1~100,000이며 활동 수준을 선택해야 합니다."
          : "연결 오류로 저장하지 못했습니다. 입력을 유지했습니다.",
    };
  }
}
