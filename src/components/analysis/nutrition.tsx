"use client";
import {
  nutritionStats,
  nutritionSeries,
  weeklySeries,
  periodStart,
  progress,
  nutritionMetrics,
  withinGoal,
  goalInsight,
  goalModes,
  type AnalysisData,
} from "@/lib/analysis/model";
import { fmt } from "@/lib/diet/nutrition";
import type { Range } from "@/lib/wellness/model";
import { MetricChart } from "./chart";
export function NutritionAnalysis({
  data,
  end,
  range,
  enabled,
}: {
  data: AnalysisData;
  end: string;
  range: Range;
  enabled: boolean;
}) {
  const start = periodStart(end, range, data),
    stats = nutritionStats(data.nutrition),
    daily = nutritionSeries(data.nutrition, start, end),
    weeks = weeklySeries(data, start, end),
    insight = goalInsight(data, end);
  return (
    <>
      <section
        className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4"
        aria-label="영양 통계"
      >
        {[
          {
            label: "기록일 평균 열량",
            value:
              stats.average.calories === null
                ? "—"
                : fmt(stats.average.calories),
            detail: `kcal · ${stats.days}일 기록 기준`,
          },
          {
            label: "식단 기록일",
            value: enabled ? String(stats.days) : "—",
            detail: `${start} ~ ${end}`,
          },
          {
            label: "전체 영양 목표 범위",
            value:
              enabled && stats.assessed
                ? `${stats.achieved}/${stats.assessed}`
                : "—",
            detail: "당시 설정 항목 모두 ±10%인 일수",
          },
          {
            label: "열량 목표 범위",
            value:
              enabled && stats.calorieDays
                ? `${stats.calorieAchieved}/${stats.calorieDays}`
                : "—",
            detail: "열량 목표 ±10%인 일수",
          },
        ].map((f) => (
          <article className="card" key={f.label}>
            <p className="text-xs subtle">{f.label}</p>
            <p className="mt-4 text-3xl font-bold">{f.value}</p>
            <p className="mt-3 text-xs leading-5 subtle">{f.detail}</p>
          </article>
        ))}
      </section>
      <p className="mt-4 text-xs leading-5 subtle">
        하루 평균은 음식 항목이 있는 날짜의 합계를 기록일 수로 나눕니다. 빈
        식사·미기록일은 제외하고 실제 0kcal 음식 기록일은 포함합니다. 기록일에도
        하루 전체 식사가 입력됐는지는 확인할 수 없습니다. 목표 범위는 당시
        설정된 각 항목의 90~110%이며 목표가 알려지지 않은 날은 평가하지
        않습니다.
      </p>
      {!enabled && (
        <p className="card mt-5 text-sm subtle">
          Supabase 연결 후 실제 식단 분석을 제공합니다.
        </p>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section
          className="card min-w-0 lg:col-span-2"
          aria-label="일별 열량과 목표"
        >
          <h2 className="mb-4 text-lg font-bold">일별 열량 · 당시 목표</h2>
          <MetricChart
            rows={daily}
            testId="calorie-trend"
            label="열량"
            series={[
              {
                key: "calories",
                name: "기록 열량",
                color: "#2563eb",
                unit: "kcal",
              },
              {
                key: "target_calories",
                name: "당시 목표",
                color: "#94a3b8",
                unit: "kcal",
              },
            ]}
          />
        </section>
        <section className="card min-w-0" aria-label="탄단지 섭취 추이">
          <h2 className="mb-4 text-lg font-bold">탄수화물·단백질·지방 추이</h2>
          <MetricChart
            rows={daily}
            testId="macro-trend"
            label="탄단지"
            series={[
              { key: "carbs_g", name: "탄수화물", color: "#2563eb", unit: "g" },
              { key: "protein_g", name: "단백질", color: "#10b981", unit: "g" },
              { key: "fat_g", name: "지방", color: "#f59e0b", unit: "g" },
            ]}
          />
        </section>
        <section className="card min-w-0" aria-label="주간 체중과 열량">
          <h2 className="mb-4 text-lg font-bold">주간 평균 체중 · 기록 열량</h2>
          <MetricChart
            rows={weeks}
            testId="weight-calorie-trend"
            label="체중·열량"
            series={[
              {
                key: "calories",
                name: "열량 · 왼쪽",
                color: "#2563eb",
                unit: "kcal",
              },
              {
                key: "weight_kg",
                name: "체중 · 오른쪽",
                color: "#10b981",
                unit: "kg",
                axis: "right",
              },
            ]}
          />
          <p className="mt-3 text-xs subtle">
            단위와 축이 서로 다릅니다. 각 평균의 기록일 수는 아래 표에서
            확인하세요.
          </p>
        </section>
      </div>
      <section className="card mt-5" aria-label="주간 영양 평균">
        <h2 className="text-lg font-bold">주간 평균과 기록 수</h2>
        <p className="mt-2 text-xs leading-5 subtle">
          월요일~일요일 중 선택 기간에 속한 기록만 포함합니다. 첫째·마지막 주는
          부분 주일 수 있고 체중과 식단의 기록일이 다를 수 있습니다.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[450px] text-left text-sm">
            <thead className="text-xs subtle">
              <tr>
                <th className="py-3">주 시작</th>
                <th>평균 열량</th>
                <th>식단 일수</th>
                <th>평균 체중</th>
                <th>측정 일수</th>
                <th>전주 차이</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => {
                const prev = weeks[i - 1],
                  delta =
                    w.weight_kg !== null && prev?.weight_kg != null
                      ? w.weight_kg - prev.weight_kg
                      : null;
                return (
                  <tr key={w.date} className="border-t border-[var(--border)]">
                    <td className="py-3">{w.date}</td>
                    <td>
                      {w.calories === null
                        ? "미기록"
                        : `${fmt(w.calories)}kcal`}
                    </td>
                    <td>{w.nutrition_days}</td>
                    <td>
                      {w.weight_kg === null
                        ? "미측정"
                        : `${fmt(w.weight_kg)}kg`}
                    </td>
                    <td>{w.weight_days}</td>
                    <td>
                      {delta === null
                        ? "비교 불가"
                        : `${delta > 0 ? "+" : ""}${fmt(delta)}kg`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card mt-5" aria-label="개인 목표 참고 분석">
        <h2 className="text-lg font-bold">개인 목표 참고 분석</h2>
        <p className="mt-2 text-sm">
          종료일 목표:{" "}
          {insight.goal?.is_active
            ? goalModes[insight.goal.goal_mode]
            : "알려진 목표 없음"}
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            체중: {insight.weightTrend}
            {insight.weightDelta === null
              ? ""
              : ` (${insight.weightDelta > 0 ? "+" : ""}${fmt(insight.weightDelta)}kg)`}
          </li>
          <li>섭취: {insight.intake}</li>
          <li className="text-xs subtle">
            최근 두 7일 구간의 체중 {insight.previousDays}일 /{" "}
            {insight.recentDays}일 · 당시 열량 목표와 비교 가능한 식단{" "}
            {insight.nutritionDays}/14일
          </li>
        </ul>
        <p className="mt-4 rounded-xl bg-blue-500/10 p-4 text-sm leading-6 text-blue-600">
          {insight.guidance}
        </p>
        <p className="mt-3 text-xs leading-5 subtle">
          참고 조건: 최근 두 7일 구간 각각 체중 3일 이상, 식단/열량 목표 10일
          이상, 14일 동안 목표 유형·열량 동일. 부족하거나 목표가 바뀌면 조절
          방향을 제안하지 않습니다. 0.2kg 미만 차이는 작은 변화로 분류하는 표시
          기준일 뿐이며 단기간 변화·누락 기록으로 확정하거나 섭취량과 인과관계를
          판단하지 않습니다.
        </p>
      </section>
      <section className="card mt-5">
        <details>
          <summary className="cursor-pointer font-semibold">
            날짜별 목표 대비 섭취량
          </summary>
          <p className="mt-3 text-xs subtle">
            기록 날짜의 마지막 목표 기준 · 최근 100개 기록일
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-xs">
              <thead>
                <tr>
                  <th className="py-3">날짜</th>
                  {nutritionMetrics.map((m) => (
                    <th key={m.key}>{m.label} / 목표 / 달성률</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data.nutrition]
                  .reverse()
                  .slice(0, 100)
                  .map((r) => (
                    <tr
                      key={r.date}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="py-3">{r.date}</td>
                      {nutritionMetrics.map((m) => {
                        const target = r.goal?.is_active ? r.goal[m.key] : null,
                          p = progress(r[m.key], target);
                        return (
                          <td key={m.key}>
                            {fmt(r[m.key])}
                            {m.unit} /{" "}
                            {target == null
                              ? "목표 미상"
                              : `${fmt(target)}${m.unit}`}{" "}
                            / {p === null ? "—" : `${fmt(p)}%`}
                            {target !== null &&
                              withinGoal(r[m.key], target) && (
                                <span className="block text-emerald-600">
                                  ±10% 범위
                                </span>
                              )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </>
  );
}
