"use client";
import Link from "next/link";
import { GoalControl } from "./goals";
import {
  datesIn,
  offsetDate,
  goalAt,
  progress,
  nutritionMetrics,
  nutritionStats,
  exerciseSummary,
  type AnalysisData,
} from "@/lib/analysis/model";
import { fmt } from "@/lib/diet/nutrition";
export function HomeDashboard({
  data,
  today,
  enabled,
}: {
  data: AnalysisData;
  today: string;
  enabled: boolean;
}) {
  const start = offsetDate(today, -6),
    weekNutrition = data.nutrition.filter((r) => r.date >= start),
    weekSessions = data.sessions.filter((r) => r.date >= start),
    stats = nutritionStats(weekNutrition);
  const day = data.nutrition.find((n) => n.date === today),
    goal = goalAt(data.goals, today),
    weights = data.body.filter((b) => b.weight_kg !== null),
    latest = weights.at(-1),
    recentWeights = weights.filter((w) => w.date >= start),
    weightDelta =
      recentWeights.length >= 2
        ? recentWeights.at(-1)!.weight_kg! - recentWeights[0].weight_kg!
        : null;
  const growth = [...new Set(data.workouts.map((w) => w.exercise_id))]
    .map((id) => ({
      id,
      s: exerciseSummary(data.workouts.filter((w) => w.exercise_id === id)),
    }))
    .filter((g) => g.s.first && g.s.last && g.s.first.date !== g.s.last.date)
    .sort((a, b) => b.s.last!.date.localeCompare(a.s.last!.date))
    .slice(0, 3);
  return (
    <>
      <p className="mt-5 text-xs subtle">
        집계 날짜 {today} · 한국 날짜 기준 · 실제 저장 기록
      </p>
      <section
        className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4"
        aria-label="건강 요약"
      >
        {[
          {
            label: "오늘 열량 달성률",
            value:
              day &&
              goal?.is_active &&
              progress(day.calories, goal.calories) !== null
                ? `${fmt(progress(day.calories, goal.calories)!)}%`
                : "—",
            detail: !enabled
              ? "연결 후 조회"
              : !day
                ? "식단 미기록"
                : !goal?.calories
                  ? "열량 목표 미설정"
                  : `${fmt(day.calories)} / ${fmt(goal.calories)}kcal`,
            href: `/diet?date=${today}`,
          },
          {
            label: "최근 측정 체중",
            value: latest ? `${fmt(latest.weight_kg!)}kg` : "—",
            detail: latest
              ? `${latest.date} · 최근 30일 최신 측정`
              : "최근 30일 체중 미측정",
            href: `/calendar?date=${today}`,
          },
          {
            label: "최근 7일 체중 변화",
            value:
              weightDelta === null
                ? "—"
                : `${weightDelta > 0 ? "+" : ""}${fmt(weightDelta)}kg`,
            detail:
              weightDelta === null
                ? "두 날짜 이상의 측정 필요"
                : "7일 내 첫·최근 측정 차이",
            href: `/analytics?end=${today}&range=7&tab=body`,
          },
          {
            label: "최근 7일 운동",
            value: enabled
              ? `${new Set(weekSessions.map((s) => s.date)).size}일`
              : "—",
            detail: enabled
              ? `${weekSessions.length}세션 · 완료 본세트 기준`
              : "연결 후 조회",
            href: `/analytics?end=${today}&range=7&tab=workout`,
          },
        ].map((f) => (
          <article key={f.label} className="card">
            <p className="text-xs subtle">{f.label}</p>
            <p className="mt-5 text-3xl font-bold">{f.value}</p>
            <p className="mt-3 text-xs leading-5 subtle">{f.detail}</p>
            <Link
              className="mt-4 inline-block text-xs font-semibold text-blue-600"
              href={f.href}
            >
              기록 확인 →
            </Link>
          </article>
        ))}
      </section>
      <GoalControl goal={data.current_goal} enabled={enabled} />
      <section className="card mt-5" aria-label="오늘 영양소 달성률">
        <div className="flex flex-wrap justify-between gap-3">
          <h2 className="text-lg font-bold">오늘의 영양 목표</h2>
          <Link
            className="text-sm font-semibold text-blue-600"
            href={`/analytics?end=${today}&range=30&tab=nutrition`}
          >
            영양 분석 →
          </Link>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {nutritionMetrics.map((m) => {
            const t = goal?.is_active ? goal[m.key] : null,
              p = progress(day?.[m.key], t);
            return (
              <div key={m.key}>
                <h3 className="text-sm font-semibold">{m.label}</h3>
                <p className="mt-3 text-2xl font-bold">
                  {day ? `${fmt(day[m.key])}${m.unit}` : "미기록"}
                </p>
                <p className="mt-2 text-xs subtle">
                  {t === null ? "목표 미설정" : `목표 ${fmt(t)}${m.unit}`}
                  {p === null ? "" : ` · ${fmt(p)}%`}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width: `${p === null ? 0 : Math.max(0, Math.min(p, 100))}%`,
                    }}
                  />
                </div>
                {day && t !== null && (
                  <p className="mt-2 text-xs subtle">
                    {day[m.key] > t
                      ? `초과 ${fmt(day[m.key] - t)}${m.unit}`
                      : `남은 ${fmt(t - day[m.key])}${m.unit}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-5 subtle">
          미기록은 0 섭취로 간주하지 않습니다. 오늘 마지막 목표 기준이며
          수치·달성률은 기록한 식사만 반영합니다.
        </p>
      </section>
      <section className="card mt-5" aria-label="최근 7일 기록 요약">
        <h2 className="text-lg font-bold">최근 7일 기록 요약</h2>
        <p className="mt-2 text-sm subtle">
          {start} ~ {today} · 식단 {stats.days}/7일 · 기록일 평균{" "}
          {stats.average.calories === null
            ? "미기록"
            : `${fmt(stats.average.calories)}kcal`}
        </p>
        <div className="mt-5 grid grid-cols-7 gap-1">
          {datesIn(start, today).map((date) => {
            const food = data.nutrition.some((n) => n.date === date),
              work = data.sessions.some((s) => s.date === date),
              body = data.body.some((b) => b.date === date);
            return (
              <Link
                key={date}
                href={`/calendar?date=${date}`}
                className="min-w-0 rounded-xl bg-[var(--muted)] px-1 py-3 text-center"
                aria-label={`${date} · ${food ? "식단" : "식단 미기록"} · ${work ? "완료 운동" : "운동 미기록"} · ${body ? "측정" : "측정 미기록"}`}
              >
                <p className="text-[10px] subtle">{date.slice(5)}</p>
                <p className="mt-2 text-xs text-blue-600">
                  {food ? "식" : "—"}
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  {work ? "운" : "—"}
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  {body ? "체" : "—"}
                </p>
              </Link>
            );
          })}
        </div>
        <p className="mt-3 text-xs subtle">
          —는 저장 기록 없음입니다. 실제 섭취·운동 여부나 휴식 여부를 단정하지
          않습니다.
        </p>
      </section>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="card" aria-label="운동 성장 지표">
          <h2 className="text-lg font-bold">운동 성장 지표 · 최근 30일</h2>
          <p className="mt-2 text-xs subtle">
            종목별 기간 첫·최근 날짜의 요약 비교
          </p>
          {growth.map((g) => {
            const first = g.s.first!,
              last = g.s.last!,
              delta =
                first.estimated_1rm !== null && last.estimated_1rm !== null
                  ? last.estimated_1rm - first.estimated_1rm
                  : null;
            return (
              <Link
                className="mt-4 block rounded-xl border border-[var(--border)] p-4"
                key={g.id}
                href={`/analytics?end=${today}&range=30&tab=workout&exercise=${g.id}`}
              >
                <h3 className="text-sm font-semibold text-blue-600">
                  {last.name}
                </h3>
                <p className="mt-2 text-sm">
                  추정 1RM 변화{" "}
                  {delta === null
                    ? "비교 불가"
                    : `${delta > 0 ? "+" : ""}${fmt(delta)}kg`}
                </p>
                <p className="mt-1 text-xs subtle">
                  {first.date} → {last.date} · 최근 최고 중량{" "}
                  {fmt(last.max_weight)}kg
                </p>
              </Link>
            );
          })}
          {!growth.length && (
            <p className="mt-5 text-sm subtle">
              같은 종목의 두 날짜 이상 완료 본세트 기록이 필요합니다.
            </p>
          )}
          <p className="mt-4 text-xs leading-5 subtle">
            Epley 중량×(1+반복/30), 2~10회 추정. 1회는 기록 중량, 0kg/11회 이상
            미추정. 실제 1RM과 다를 수 있습니다.
          </p>
        </section>
        <section className="card" aria-label="최근 개인 기록">
          <h2 className="text-lg font-bold">최근 개인 기록 · 최근 30일</h2>
          {data.personal_records.slice(0, 5).map((r) => (
            <Link
              key={`${r.session_id}:${r.exercise_id}`}
              href={`/workout?date=${r.date}&session=${r.session_id}`}
              className="mt-4 block rounded-xl border border-[var(--border)] p-4"
            >
              <h3 className="text-sm font-semibold text-blue-600">
                {r.name} · {r.date}
              </h3>
              <p className="mt-2 text-xs subtle">
                {r.previous_weight === null
                  ? "첫 기록 · 과거 비교 없음"
                  : `최고 중량 ${fmt(r.max_weight)}kg · 최고 반복 ${r.max_reps}회`}
              </p>
              <p className="mt-1 text-xs subtle">
                추정 1RM{" "}
                {r.estimated_1rm === null
                  ? "미추정"
                  : `${fmt(r.estimated_1rm)}kg`}
              </p>
            </Link>
          ))}
          {!data.personal_records.length && (
            <p className="mt-5 text-sm subtle">
              이 기간에 새 개인 최고 기록이 없습니다.
            </p>
          )}
          <p className="mt-4 text-xs leading-5 subtle">
            첫 기록과 실제 갱신을 구분합니다. 중량·반복·1RM의 최고값은 서로 다른
            세트에서 나올 수 있습니다.
          </p>
        </section>
      </div>
    </>
  );
}
