"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Home,
  Utensils,
  Dumbbell,
  CalendarDays,
  ChartNoAxesCombined,
  Settings,
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import { appName } from "@/lib/config";
const links = [
  ["/", "홈", Home],
  ["/diet", "식단", Utensils],
  ["/workout", "운동", Dumbbell],
  ["/calendar", "캘린더", CalendarDays],
  ["/analytics", "분석", ChartNoAxesCombined],
  ["/settings", "설정", Settings],
] as const;
export function Shell({
  children,
  email,
  connected,
}: {
  children: React.ReactNode;
  email?: string;
  connected: boolean;
}) {
  const path = usePathname();
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-[var(--border)] bg-[var(--card)] px-6 py-8 lg:flex lg:flex-col">
        <Link
          href="/"
          className="flex items-center gap-3 text-2xl font-extrabold tracking-tight"
        >
          <span className="rounded-xl bg-blue-600 p-2 text-white">
            <Activity size={23} />
          </span>
          {appName}
        </Link>
        <p className="mt-3 text-xs subtle">나의 건강을 차곡차곡</p>
        <nav aria-label="주 메뉴" className="mt-12 space-y-2">
          {links.map(([url, label, Icon]) => (
            <Link
              key={url}
              href={url}
              aria-current={path === url ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${path === url ? "bg-blue-600 text-white" : "subtle hover:bg-[var(--muted)]"}`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-[var(--muted)] p-4">
          <p className="text-sm font-semibold">작은 변화, 꾸준한 기록</p>
          <p className="mt-2 text-xs subtle leading-5">
            오늘의 나를 알아가는 첫걸음
          </p>
        </div>
      </aside>
      <div className="lg:ml-60">
        <header className="flex h-20 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-5 sm:px-9">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold lg:hidden"
          >
            <Activity className="text-blue-600" />
            {appName}
          </Link>
          <span className="hidden text-sm subtle lg:block">
            MY HEALTH SPACE
          </span>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${connected ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}
            >
              {connected ? "개인 계정" : "미연결 · 미리보기"}
            </span>
            {connected ? (
              <form action="/auth/signout" method="post">
                <button aria-label="로그아웃" className="p-2">
                  <LogOut size={19} />
                </button>
              </form>
            ) : (
              <Link
                className="text-sm font-semibold text-blue-600"
                href="/login"
              >
                로그인 <ArrowUpRight size={14} className="inline" />
              </Link>
            )}
            <span
              title={email}
              className="hidden rounded-full bg-blue-500/10 p-2 text-sm font-bold text-blue-600 sm:block"
            >
              {email ? email.slice(0, 1).toUpperCase() : "F"}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8 pb-28 sm:px-9 lg:py-10">
          {!connected && (
            <div
              role="status"
              className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm subtle"
            >
              Supabase가 연결되지 않았습니다. 현재 화면은 빈 상태 미리보기이며
              실제 개인 기록이나 데모 수치를 표시하지 않습니다.
            </div>
          )}
          {children}
        </main>
      </div>
      <nav
        aria-label="모바일 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[var(--border)] bg-[var(--card)] px-1 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden"
      >
        {links.map(([url, label, Icon]) => (
          <Link
            key={url}
            href={url}
            aria-current={path === url ? "page" : undefined}
            className={`flex flex-col items-center gap-1.5 text-[10px] font-semibold ${path === url ? "text-blue-600" : "subtle"}`}
          >
            <Icon size={21} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
