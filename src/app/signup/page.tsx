import Link from "next/link";
import { configured, appName } from "@/lib/config";
import { publicSignup } from "@/lib/service/public-config";
import { SignupForm } from "@/components/service/signup-form";
export default function SignupPage() {
  const enabled = publicSignup() && configured;
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <section className="card w-full max-w-md">
        <Link className="font-bold text-blue-600" href="/">
          {appName}
        </Link>
        <h1 className="mt-6 text-2xl font-bold">회원가입</h1>
        {!enabled ? (
          <p className="mt-4 text-sm subtle">
            공개 회원가입이 비활성 상태입니다. 현재는 관리자 초대 또는 서비스
            연결 설정이 필요합니다.
          </p>
        ) : (
          <SignupForm
            enabled={enabled}
            terms={process.env.FITLOG_TERMS_URL!}
            privacy={process.env.FITLOG_PRIVACY_URL!}
            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
          />
        )}
        <Link className="mt-6 block text-sm text-blue-600" href="/login">
          로그인으로 이동
        </Link>
      </section>
    </main>
  );
}
