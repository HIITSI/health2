"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { account, check } from "@/lib/service/server";
export async function saveDefaultRest(
  id: string,
  version: number,
  seconds: number | null,
) {
  try {
    z.uuid().parse(id);
    z.number().int().min(0).parse(version);
    z.number().int().min(0).max(3600).nullable().parse(seconds);
    const { client } = await account("write");
    check(
      (
        await client.rpc("workout_save_default_rest", {
          p_id: id,
          p_version: version,
          p_seconds: seconds,
        })
      ).error,
    );
    revalidatePath("/workout");
    return { success: "기본 휴식 시간을 저장했습니다." };
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "휴식 설정을 저장하지 못했습니다.",
    };
  }
}
