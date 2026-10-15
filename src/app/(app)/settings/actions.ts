"use server";
import { profileSchema } from "@/lib/profile";
import { supabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
export async function saveProfile(
  _: { error: string; success: string },
  form: FormData,
) {
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: parsed.error.issues[0].message, success: "" };
  const client = await supabase();
  if (!client) return { error: "Supabase 연결이 필요합니다.", success: "" };
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user)
    return { error: "다시 로그인해 주세요.", success: "" };
  const { error } = await client
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id)
    .select("id")
    .single();
  if (error)
    return {
      error: "저장하지 못했습니다. 데이터베이스 설정과 연결을 확인하세요.",
      success: "",
    };
  revalidatePath("/", "layout");
  return { error: "", success: "기본 정보를 저장했습니다." };
}
