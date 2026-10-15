"use server";
import { z } from "zod";
import { supabase } from "@/lib/supabase/server";
export async function changePassword(
  _: { error: string; success: string },
  form: FormData,
) {
  const schema = z
    .object({
      password: z.string().min(12, "비밀번호를 12자 이상 입력하세요.").max(128),
      confirmation: z.string(),
    })
    .refine(
      (data) => data.password === data.confirmation,
      "비밀번호가 일치하지 않습니다.",
    );
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: parsed.error.issues[0].message, success: "" };
  const client = await supabase();
  if (!client) return { error: "Supabase 연결이 필요합니다.", success: "" };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "다시 로그인해 주세요.", success: "" };
  const { error } = await client.auth.updateUser({
    password: parsed.data.password,
  });
  if (error)
    return {
      error:
        "비밀번호 변경에 실패했습니다. 재인증이 필요하거나 비밀번호 정책에 맞지 않을 수 있습니다.",
      success: "",
    };
  return { error: "", success: "비밀번호를 저장했습니다." };
}
