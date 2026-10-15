"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { supabase } from "@/lib/supabase/server";
import { publicSignup } from "@/lib/service/public-config";
export async function signup(
  _: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  if (!publicSignup()) return { error: "공개 회원가입이 비활성 상태입니다." };
  const p = z
    .object({
      email: z.email(),
      password: z.string().min(12).max(128),
      confirmation: z.string(),
      consent: z.literal("on"),
      captcha: z.string().max(4096).optional(),
    })
    .refine(
      (d) => d.password === d.confirmation,
      "비밀번호 확인이 일치하지 않습니다.",
    )
    .safeParse(Object.fromEntries(form));
  if (!p.success)
    return { error: "이메일·12자 이상 비밀번호·확인·약관 동의를 확인하세요." };
  if (process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY && !p.data.captcha)
    return { error: "사람 확인을 완료하세요." };
  const client = await supabase();
  if (!client) return { error: "Supabase 연결 후 가입할 수 있습니다." };
  const h = await headers(),
    origin = process.env.FITLOG_APP_ORIGIN || h.get("origin");
  if (!origin) return { error: "서비스 주소 설정을 확인하세요." };
  const r = await client.auth.signUp({
    email: p.data.email,
    password: p.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      ...(p.data.captcha ? { captchaToken: p.data.captcha } : {}),
    },
  });
  if (r.error)
    return {
      error:
        "가입 요청을 처리하지 못했습니다. 입력·가입 설정·연결 상태를 확인하세요.",
    };
  return {
    success: r.data.session
      ? "계정이 생성되었습니다. 홈 화면에서 시작하세요."
      : "가입 요청을 접수했습니다. 이메일 인증 안내를 확인하세요. 이미 등록된 이메일이면 기존 계정으로 로그인하세요.",
  };
}
