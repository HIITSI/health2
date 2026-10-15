"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MetricChart } from "./chart";
import {
  exerciseSummary,
  weeklySeries,
  periodStart,
  datesIn,
  type AnalysisData,
} from "@/lib/analysis/model";
import { fmt } from "@/lib/diet/nutrition";
import type { Range } from "@/lib/wellness/model";
export function WorkoutAnalysis({
  data,
  end,
  range,
  exercise,
  enabled,
}: {
  data: AnalysisData;
  end: string;
  range: Range;
  exercise?: string;
  enabled: boolean;
}) {
  const start = periodStart(end, range, data),
    summary = exerciseSummary(data.workouts),
    weeks = weeklySeries(data, start, end),
    best = exercise
      ? data.best.find((b) => b.exercise_id === exercise)
      : undefined;
  const grouped = [...new Set(data.workouts.map((w) => w.exercise_id))].map(
    (id) => ({
      id,
      summary: exerciseSummary(
        data.workouts.filter((w) => w.exercise_id === id),
      ),
    }),
  );
  const map = new Map(data.workouts.map((w) => [w.date, w])),
    series = exercise
      ? datesIn(start, end).map((date) => {
          const w = map.get(date);
          return {
            date,
            max_weight: w?.max_weight ?? null,
            estimated_1rm: w?.estimated_1rm ?? null,
            volume: w?.volume ?? null,
          };
        })
      : [];
  const parts = new Map<string, number>();
  data.parts.forEach((p) =>
    parts.set(
      p.muscle_group,
      (parts.get(p.muscle_group) || 0) + p.working_sets,
    ),
  );
  return (
    <>
      <section className="card mt-5">
        <form action="/analytics" className="flex items-end gap-3">
          <input type="hidden" name="tab" value="workout" />
          <input type="hidden" name="end" value={end} />
          <input type="hidden" name="range" value={range} />
          <div className="min-w-0 flex-1">
            <label htmlFor="exercise-analysis">분석 종목</label>
            <select
              id="exercise-analysis"
              name="exercise"
              defaultValue={exercise || ""}
            >
              <option value="">전체 종목 · 빈도/운동량</option>
              {data.exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.muscle_group}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="outline" disabled={!enabled}>
            종목 조회
          </Button>
        </form>
        <p className="mt-3 text-xs subtle">
          종목별 최고 기록·성장 그래프는 종목을 선택해 확인하세요.
        </p>
      </section>
      <section
        className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4"
        aria-label="운동 통계"
      >
        {[
          {
            label: "기록 운동량",
            value: enabled ? fmt(summary.volume) : "—",
            unit: "kg·회 · 선택 기간",
          },
          {
            label: "완료 본세트",
            value: enabled ? String(summary.sets) : "—",
            unit: "세트 · 워밍업 제외",
          },
          {
            label: exercise ? "종목 수행일" : "운동 기록일",
            value: enabled
              ? String(new Set(data.sessions.map((s) => s.date)).size)
              : "—",
            unit: "일 · 완료 본세트 있는 날",
          },
          {
            label: "운동 세션",
            value: enabled ? String(data.sessions.length) : "—",
            unit: exercise ? "선택 종목 포함 세션" : "완료 본세트 포함 세션",
          },
        ].map((f) => (
          <article className="card" key={f.label}>
            <p className="text-xs subtle">{f.label}</p>
            <p className="mt-4 text-3xl font-bold">{f.value}</p>
            <p className="mt-3 text-xs subtle">{f.unit}</p>
          </article>
        ))}
      </section>
      <p className="mt-4 text-xs leading-5 subtle">
        {start} ~ {end} · 완료된 세션의 완료 본세트만
        집계합니다(탑·백오프·일반·드롭). 운동량 = 세트별 외부 중량(kg) × 반복
        횟수의 합계이며 자체 체중은 포함하지 않습니다. 중량·반복이 유효하지 않은
        기록과 워밍업·미완료 세트/세션은 제외합니다.
      </p>
      {!enabled && (
        <p className="card mt-5 text-sm subtle">
          Supabase 연결 후 실제 운동 성장 분석을 제공합니다.
        </p>
      )}
      {exercise && (
        <>
          <section className="card mt-5" aria-label="종목별 최고 기록">
            <h2 className="text-lg font-bold">선택 기간 최고 기록</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                {
                  label: "최고 중량",
                  value:
                    summary.maxWeight === null
                      ? "—"
                      : `${fmt(summary.maxWeight)}kg`,
                },
                {
                  label: "최고 반복",
                  value:
                    summary.maxReps === null ? "—" : `${summary.maxReps}회`,
                },
                {
                  label: "추정 1RM",
                  value:
                    summary.estimated === null
                      ? "—"
                      : `${fmt(summary.estimated)}kg`,
                },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-xs subtle">{f.label}</p>
                  <p className="mt-2 text-xl font-bold">{f.value}</p>
                </div>
              ))}
            </div>
            {best && (
              <p className="mt-5 text-sm subtle">
                종료일까지 최고(선택 기간 이전 포함): {fmt(best.max_weight)}kg ·
                최고 반복 {best.max_reps}회 · 추정 1RM{" "}
                {best.estimated_1rm === null
                  ? "미추정"
                  : `${fmt(best.estimated_1rm)}kg`}
              </p>
            )}
            <p className="mt-3 text-xs leading-5 subtle">
              최고 중량·반복·추정 1RM은 서로 다른 세트에서 나올 수 있습니다.
              Epley: 중량 × (1 + 반복/30), 2~10회만 추정합니다. 1회는 기록 중량,
              0kg·11회 이상은 미추정입니다. 추정치는 실제 1RM과 다를 수
              있습니다.
            </p>
          </section>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="card min-w-0">
              <h2 className="mb-4 text-lg font-bold">중량·추정 1RM 성장</h2>
              <MetricChart
                rows={series}
                testId="strength-trend"
                label="중량·1RM"
                series={[
                  {
                    key: "max_weight",
                    name: "일별 최고 중량",
                    unit: "kg",
                    color: "#2563eb",
                  },
                  {
                    key: "estimated_1rm",
                    name: "일별 최고 추정 1RM",
                    unit: "kg",
                    color: "#10b981",
                  },
                ]}
              />
            </section>
            <section className="card min-w-0">
              <h2 className="mb-4 text-lg font-bold">종목별 일일 운동량</h2>
              <MetricChart
                rows={series}
                testId="exercise-volume"
                label="종목 운동량"
                series={[
                  {
                    key: "volume",
                    name: "기록 운동량",
                    unit: "kg·회",
                    color: "#2563eb",
                  },
                ]}
              />
            </section>
          </div>
          <section className="card mt-5" aria-label="최근 과거 운동 비교">
            <h2 className="text-lg font-bold">기간 첫 기록 · 최근 기록 비교</h2>
            {summary.first && summary.last && data.workouts.length >= 2 ? (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: "기간 첫 기록", r: summary.first },
                  { label: "최근 기록", r: summary.last },
                ].map(({ label, r }) => (
                  <div key={label} className="rounded-xl bg-[var(--muted)] p-4">
                    <h3 className="text-sm font-semibold">
                      {label} · {r.date}
                    </h3>
                    <p className="mt-3 text-sm">
                      최고 중량 {fmt(r.max_weight)}kg
                    </p>
                    <p className="mt-1 text-sm">최고 반복 {r.max_reps}회</p>
                    <p className="mt-1 text-sm">
                      추정 1RM{" "}
                      {r.estimated_1rm === null
                        ? "미추정"
                        : `${fmt(r.estimated_1rm)}kg`}
                    </p>
                    <p className="mt-1 text-sm">운동량 {fmt(r.volume)}kg·회</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm subtle">
                두 날짜 이상의 완료 본세트 기록이 필요합니다.
              </p>
            )}
            <p className="mt-3 text-xs subtle">
              선택 기간의 각 날짜 요약을 비교하며 개별 세트 비교는 운동 기록
              화면에서 확인합니다.
            </p>
          </section>
        </>
      )}
      {!exercise && (
        <section className="card mt-5">
          <h2 className="text-lg font-bold">종목별 기간 기록</h2>
          {!grouped.length && (
            <p className="mt-4 text-sm subtle">
              선택 기간의 완료 본세트가 없습니다.
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {grouped.map((g) => (
              <Link
                key={g.id}
                className="rounded-xl border border-[var(--border)] p-4 hover:border-blue-500"
                href={`/analytics?end=${end}&range=${range}&tab=workout&exercise=${g.id}`}
              >
                <h3 className="font-semibold text-blue-600">
                  {g.summary.last!.name}
                </h3>
                <p className="mt-2 text-xs subtle">
                  최고 중량 {fmt(g.summary.maxWeight!)}kg · 최고 반복{" "}
                  {g.summary.maxReps}회
                </p>
                <p className="mt-1 text-xs subtle">
                  추정 1RM{" "}
                  {g.summary.estimated === null
                    ? "미추정"
                    : `${fmt(g.summary.estimated)}kg`}{" "}
                  · {g.summary.sets}세트
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="card mt-5">
        <h2 className="mb-4 text-lg font-bold">주간 기록 운동량</h2>
        <MetricChart
          rows={weeks}
          testId="weekly-volume"
          label="주간 운동량"
          series={[
            {
              key: "volume",
              name: exercise ? "선택 종목 운동량" : "전체 종목 운동량",
              color: "#2563eb",
              unit: "kg·회",
            },
          ]}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[380px] text-left text-sm">
            <thead className="text-xs subtle">
              <tr>
                <th className="py-3">주 시작</th>
                <th>{exercise ? "수행일" : "운동일"}</th>
                <th>세션</th>
                <th>본세트</th>
                <th>기록 운동량</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.date} className="border-t border-[var(--border)]">
                  <td className="py-3">{w.date}</td>
                  <td>{w.workout_days}일</td>
                  <td>{w.sessions}회</td>
                  <td>{w.working_sets}세트</td>
                  <td>{fmt(w.volume)}kg·회</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 subtle">
          월~일 중 선택 기간 안의 완료 본세트 기록만 합산합니다. 부분 주를 전체
          7일 운동량으로 환산하지 않습니다. 0은 해당 범위의 저장된 본세트가
          없다는 뜻이며 실제 운동 여부를 단정하지 않습니다.
        </p>
      </section>
      <section className="card mt-5" aria-label="부위별 본세트">
        <h2 className="text-lg font-bold">
          부위별 본세트 수 · 선택 기간{exercise ? "/선택 종목" : ""}
        </h2>
        <ul className="mt-4 space-y-3">
          {[...parts].map(([part, count]) => (
            <li
              key={part}
              className="flex justify-between rounded-xl bg-[var(--muted)] p-3 text-sm"
            >
              <span>{part}</span>
              <strong>{count}세트</strong>
            </li>
          ))}
        </ul>
        {!parts.size && (
          <p className="mt-3 text-sm subtle">완료 본세트가 없습니다.</p>
        )}
        <p className="mt-3 text-xs subtle">
          기록 당시 부위명 기준이며 복합 부위명은 하나의 범주로 셉니다. 한
          세트를 여러 부위에 중복 합산하지 않습니다.
        </p>
      </section>
      <section className="card mt-5" aria-label="최근 개인 기록">
        <h2 className="text-lg font-bold">
          기간 내 최근 개인 기록 · 최대 10건
        </h2>
        <p className="mt-2 text-xs subtle">
          종료일까지 과거 기록을 비교해 갱신을 찾습니다. 첫 기록은 비교 기준이
          없어 별도 표시합니다.
        </p>
        <ul className="mt-4 space-y-3">
          {data.personal_records.map((r) => (
            <li
              key={`${r.session_id}:${r.exercise_id}`}
              className="rounded-xl border border-[var(--border)] p-4"
            >
              <Link
                className="text-sm font-semibold text-blue-600"
                href={`/workout?date=${r.date}&session=${r.session_id}`}
              >
                {r.name} · {r.date}
              </Link>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {r.previous_weight === null ? (
                  <span>첫 기록 · 비교 없음</span>
                ) : (
                  <>
                    {r.max_weight > r.previous_weight && (
                      <span>최고 중량 갱신 {fmt(r.max_weight)}kg</span>
                    )}
                    {r.previous_reps !== null &&
                      r.max_reps > r.previous_reps && (
                        <span>최고 반복 갱신 {r.max_reps}회</span>
                      )}
                    {r.estimated_1rm !== null &&
                      (r.previous_1rm === null ||
                        r.estimated_1rm > r.previous_1rm) && (
                        <span>추정 1RM 갱신 {fmt(r.estimated_1rm)}kg</span>
                      )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        {!data.personal_records.length && (
          <p className="mt-4 text-sm subtle">
            이 기간에 새 최고 기록이 없습니다.
          </p>
        )}
      </section>
    </>
  );
}
