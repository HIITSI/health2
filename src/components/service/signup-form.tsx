"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { signup } from "@/app/signup/actions";
type HCaptcha = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
};
export function SignupForm({
  enabled,
  terms,
  privacy,
  sitekey,
}: {
  enabled: boolean;
  terms: string;
  privacy: string;
  sitekey?: string;
}) {
  const [state, action, pending] = useActionState(signup, {}),
    [captcha, setCaptcha] = useState(""),
    holder = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sitekey || !enabled) return;
    let widget: string | undefined,
      disposed = false;
    const element = document.createElement("script");
    element.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
    element.async = true;
    element.onload = () => {
      const api = (window as Window & { hcaptcha?: HCaptcha }).hcaptcha;
      if (api && holder.current && !disposed)
        widget = api.render(holder.current, {
          sitekey,
          callback: setCaptcha,
          "expired-callback": () => setCaptcha(""),
        });
    };
    document.head.appendChild(element);
    return () => {
      disposed = true;
      if (widget)
        (window as Window & { hcaptcha?: HCaptcha }).hcaptcha?.remove(widget);
      element.remove();
    };
  }, [sitekey, enabled]);
  return (
    <form action={action} className="mt-6">
      <fieldset disabled={!enabled || pending}>
        <label htmlFor="signup-email">이메일</label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
        <label className="mt-4" htmlFor="signup-password">
          비밀번호
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
        <label className="mt-4" htmlFor="signup-confirm">
          비밀번호 확인
        </label>
        <input
          id="signup-confirm"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
        <label className="mt-5 flex items-start gap-3">
          <input type="checkbox" name="consent" required className="!w-5" />
          <span className="text-xs leading-5">
            <a
              className="text-blue-600 underline"
              href={terms}
              target="_blank"
              rel="noopener noreferrer"
            >
              이용약관
            </a>{" "}
            및{" "}
            <a
              className="text-blue-600 underline"
              href={privacy}
              target="_blank"
              rel="noopener noreferrer"
            >
              개인정보 처리방침
            </a>
            을 확인하고 동의합니다.
          </span>
        </label>
        {sitekey && <div ref={holder} className="mt-4 overflow-x-auto" />}
        <input type="hidden" name="captcha" value={captcha} />
        <Button
          type="submit"
          className="mt-5 w-full"
          disabled={!enabled || pending || Boolean(sitekey && !captcha)}
        >
          {pending ? "가입 요청 중…" : "회원가입"}
        </Button>
      </fieldset>
      {state.error && (
        <p role="alert" className="mt-4 text-sm text-red-500">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="mt-4 text-sm text-emerald-600">
          {state.success}
        </p>
      )}
    </form>
  );
}
