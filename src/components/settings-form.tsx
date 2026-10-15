"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { saveProfile } from "@/app/(app)/settings/actions";
import type { Profile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Monitor, Moon, Sun, Check } from "lucide-react";
export function SettingsForm({
  profile,
  email,
  enabled,
}: {
  profile: Profile;
  email?: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(saveProfile, {
    error: "",
    success: "",
  });
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <section className="card">
        <h2 className="text-lg font-bold">개인 계정 정보</h2>
        <p className="mt-2 mb-7 text-sm subtle">
          시간대와 단위는 계정에 저장됩니다.
        </p>
        <form action={action}>
          <div className="field">
            <label htmlFor="account-email">이메일</label>
            <input
              id="account-email"
              value={email || "로그인 후 확인 가능"}
              disabled
              readOnly
            />
            <p className="mt-2 text-xs subtle">
              이메일 변경은 현재 지원하지 않습니다.
            </p>
          </div>
          <div className="field">
            <label htmlFor="display_name">이름</label>
            <input
              id="display_name"
              name="display_name"
              defaultValue={profile.display_name}
              maxLength={40}
              required
              disabled={!enabled}
              placeholder="나의 이름"
            />
          </div>
          <div className="field">
            <label htmlFor="timezone">기본 시간대</label>
            <input
              id="timezone"
              name="timezone"
              defaultValue={profile.timezone}
              list="timezones"
              required
              disabled={!enabled}
            />
            <datalist id="timezones">
              {[
                "Asia/Seoul",
                "Asia/Tokyo",
                "America/New_York",
                "America/Los_Angeles",
                "Europe/London",
                "UTC",
              ].map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
            <p className="mt-2 text-xs subtle">
              예: Asia/Seoul · 날짜 표시 기준으로 사용됩니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label htmlFor="weight_unit">체중 단위</label>
              <select
                id="weight_unit"
                name="weight_unit"
                defaultValue={profile.weight_unit}
                disabled={!enabled}
              >
                <option value="kg">킬로그램 (kg)</option>
                <option value="lb">파운드 (lb)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="height_unit">신장 단위</label>
              <select
                id="height_unit"
                name="height_unit"
                defaultValue={profile.height_unit}
                disabled={!enabled}
              >
                <option value="cm">센티미터 (cm)</option>
                <option value="in">인치 (in)</option>
              </select>
            </div>
          </div>
          {state.error && (
            <p role="alert" className="mb-4 text-sm text-red-500">
              {state.error}
            </p>
          )}
          {state.success && (
            <p
              role="status"
              className="mb-4 flex items-center gap-2 text-sm text-emerald-600"
            >
              <Check size={17} />
              {state.success}
            </p>
          )}
          <Button disabled={!enabled || pending}>
            {pending ? "저장 중…" : "변경사항 저장"}
          </Button>
          {!enabled && (
            <p className="mt-4 text-xs subtle">
              Supabase 연결 및 로그인 후 저장할 수 있습니다.
            </p>
          )}
        </form>
      </section>
      <div className="space-y-6">
        <section className="card">
          <h2 className="text-lg font-bold">화면 설정</h2>
          <p className="mt-2 text-sm subtle">
            이 기기에 적용되는 테마를 선택하세요.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              ["light", "라이트", Sun],
              ["dark", "다크", Moon],
              ["system", "시스템", Monitor],
            ].map(([value, label, Icon]) => {
              const I = Icon as typeof Sun;
              return (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={mounted && theme === value}
                  onClick={() => setTheme(String(value))}
                  className={`flex flex-col items-center gap-3 rounded-xl border px-2 py-4 text-xs ${mounted && theme === value ? "border-blue-500 bg-blue-500/10 text-blue-600" : "border-[var(--border)] subtle"}`}
                >
                  <I size={21} />
                  {String(label)}
                </button>
              );
            })}
          </div>
        </section>
        <section className="card">
          <h2 className="text-lg font-bold">개인정보 보호</h2>
          <Link
            href="/account/password"
            className="mt-4 inline-block text-sm font-semibold text-blue-600"
          >
            비밀번호 변경
          </Link>
          <p className="mt-3 text-sm leading-6 subtle">
            개인 기록은 계정별 접근 정책으로 보호됩니다. 아래에서 기록
            내보내기·백업·복구와 계정 삭제를 관리할 수 있습니다.
          </p>
        </section>
      </div>
    </div>
  );
}
