"use client";
import { useActionState } from "react";
import { changePassword } from "@/app/(app)/account/password/actions";
import { Button } from "@/components/ui/button";
export function PasswordForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(changePassword, {
    error: "",
    success: "",
  });
  return (
    <form action={action} className="card mt-8 max-w-lg">
      <div className="field">
        <label htmlFor="new-password">새 비밀번호</label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          disabled={!enabled}
        />
        <p className="mt-2 text-xs subtle">12자 이상 입력하세요.</p>
      </div>
      <div className="field">
        <label htmlFor="confirmation">비밀번호 확인</label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          disabled={!enabled}
        />
      </div>
      {state.error && (
        <p role="alert" className="mb-4 text-sm text-red-500">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="mb-4 text-sm text-emerald-600">
          {state.success}
        </p>
      )}
      <Button disabled={!enabled || pending}>
        {pending ? "저장 중…" : "비밀번호 저장"}
      </Button>
    </form>
  );
}
