"use server";
import { supabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";
export async function login(_: { error: string }, form: FormData) {
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1).max(128) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "이메일과 비밀번호를 확인해 주세요." };
  const client = await supabase();
  if (!client) return { error: "Supabase 연결 설정이 필요합니다." };
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error)
    return {
      error: "로그인하지 못했습니다. 계정 정보 또는 연결 상태를 확인해 주세요.",
    };
  redirect("/");
}
