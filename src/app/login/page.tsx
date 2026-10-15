import Link from "next/link";
import { Activity, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { appName, configured } from "@/lib/config";
import { publicSignup } from "@/lib/service/public-config";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const expired = (await searchParams).error === "expired";
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <section className="card w-full max-w-md sm:p-9">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
          <Activity className="text-blue-600" />
          {appName}
        </Link>
        <h1 className="mt-9 text-2xl font-bold">다시 만나 반가워요</h1>
        <p className="mt-3 mb-7 text-sm subtle">
          나만의 건강 기록 공간에 로그인하세요.
        </p>
        {!configured && (
          <p
            role="status"
            className="mb-6 rounded-xl bg-amber-500/10 p-4 text-sm subtle"
          >
            Supabase 미연결 상태입니다. 환경변수 설정 후 로그인할 수 있습니다.
          </p>
        )}
        {expired && (
          <p role="alert" className="mb-4 text-sm text-red-500">
            초대 또는 복구 링크가 만료되었거나 유효하지 않습니다. 관리자에게 새
            링크를 요청하세요.
          </p>
        )}
        <LoginForm enabled={configured} />
        <p className="mt-6 flex items-start gap-2 text-xs leading-5 subtle">
          <ShieldCheck size={18} className="shrink-0" />
          {publicSignup()
            ? "각 계정의 건강 기록은 독립적으로 관리됩니다."
            : "초대받은 계정만 이용할 수 있습니다. 공개 회원가입은 비활성 상태입니다."}
        </p>
        {publicSignup() && (
          <Link
            href="/signup"
            className="mt-4 block text-center text-sm text-blue-600"
          >
            회원가입
          </Link>
        )}
        <Link href="/" className="mt-6 block text-center text-sm text-blue-600">
          홈으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
