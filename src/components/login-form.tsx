"use client";
import { useActionState, useState } from "react";
import { login } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
export function LoginForm({ enabled }: { enabled: boolean }) {
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="email">이메일</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={!enabled}
        />
      </div>
      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={!enabled}
        />
      </div>
      {state.error && (
        <p role="alert" className="mb-4 text-sm text-red-500">
          {state.error}
        </p>
      )}
      <Button className="w-full" disabled={!enabled || pending}>
        {pending ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
