"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  dailyPoints,
  weeklyWeights,
  comparison,
  metrics,
  ranges,
  type Range,
  type BodyPoint,
} from "@/lib/wellness/model";
import { fmt } from "@/lib/diet/nutrition";
type ChartRow = {
  date: string;
  weight_kg?: number | null;
  muscle_mass_kg?: number | null;
  body_fat_percent?: number | null;
};
function Trend({
  rows,
  field,
  label,
  unit,
}: {
  rows: ChartRow[];
  field: "weight_kg" | "muscle_mass_kg" | "body_fat_percent";
  label: string;
  unit: string;
}) {
  const count = rows.filter((r) => r[field] != null).length;
  const multipleYears =
    rows.at(0)?.date.slice(0, 4) !== rows.at(-1)?.date.slice(0, 4);
  if (!count)
    return (
      <p className="flex min-h-64 items-center justify-center text-sm subtle">
        이 기간에 {label} 측정값이 없습니다.
      </p>
    );
  return (
    <div
      className="h-72 min-w-0"
      role="img"
      aria-label={`${label} 그래프 · ${count}개 측정 · 미측정일은 빈 값`}
      data-testid={`${field}-chart`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart
          data={rows}
          margin={{ top: 20, right: 16, left: 0, bottom: 12 }}
          accessibilityLayer
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => String(v).slice(multipleYears ? 2 : 5)}
            minTickGap={35}
            tick={{ fontSize: 11, fill: "var(--subtle)" }}
          />
          <YAxis
            domain={["auto", "auto"]}
            width={45}
            tick={{ fontSize: 11, fill: "var(--subtle)" }}
            tickFormatter={(v) => fmt(Number(v))}
          />
          <Tooltip
            labelFormatter={(v) => String(v)}
            formatter={(v) => [`${fmt(Number(v))}${unit}`, label]}
            contentStyle={{
              background: "var(--card)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
          <Line
            type="linear"
            dataKey={field}
            name={label}
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function BodyCharts({
  rows,
  end,
  range,
  enabled,
  toolbar,
}: {
  rows: BodyPoint[];
  end: string;
  range: Range;
  enabled: boolean;
  toolbar?: React.ReactNode;
}) {
  const [weightView, setWeightView] = useState<"daily" | "weekly">("daily");
  const daily = dailyPoints(rows, end, range),
    weekly = weeklyWeights(daily);
  const available = rows.filter((r) => metrics.some((m) => r[m.key] !== null));
  return (
    <>
      <p className="text-sm subtle">BODY COMPOSITION</p>
      <h1 className="mt-3 text-3xl font-bold">분석</h1>
      <p className="mt-3 subtle">기록한 체성분의 변화를 확인하세요.</p>
      {toolbar}
      <section className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">체성분 추이</h2>
            <p className="mt-2 text-xs subtle">
              {daily.at(0) ? `${daily[0].date} ~ ${end}` : `종료일 ${end}`} ·
              한국 날짜 · kg / cm
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/calendar?date=${end}`}>측정 기록 관리</Link>
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="분석 기간">
          {ranges.map((r) => (
            <Button
              asChild
              key={r}
              variant={range === r ? "default" : "outline"}
              size="sm"
            >
              <Link
                aria-current={range === r ? "true" : undefined}
                href={`/analytics?end=${end}&range=${r}`}
              >
                {r === "all" ? "전체 기간" : `${r}일`}
              </Link>
            </Button>
          ))}
        </div>
        <form action="/analytics" className="mt-4 flex items-end gap-3">
          <input type="hidden" name="range" value={range} />
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label htmlFor="analysis-end">기간 종료일</label>
            <input
              id="analysis-end"
              name="end"
              type="date"
              required
              min="1900-01-01"
              max="2100-12-31"
              defaultValue={end}
            />
          </div>
          <Button type="submit" variant="outline">
            기간 조회
          </Button>
        </form>
        <p className="mt-4 text-xs leading-5 subtle">
          같은 날짜에 여러 측정이 있으면 최근 등록 측정을 사용합니다. 빈
          항목·미측정일은 0으로 채우거나 다른 날짜 값으로 대체하지 않습니다.
          전체 기간도 선택한 종료일까지 조회합니다.
        </p>
      </section>
      {!enabled && (
        <p className="card mt-5 text-sm subtle">
          Supabase 연결 후 실제 측정 기록의 그래프를 제공합니다. 데모 측정값은
          표시하지 않습니다.
        </p>
      )}
      {enabled && !available.length && (
        <p role="status" className="card mt-5 text-sm subtle">
          선택한 기간에 측정값이 없습니다. 캘린더에서 측정값을 기록하세요.
        </p>
      )}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="card min-w-0 lg:col-span-2" aria-label="체중 변화">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              체중 변화 <span className="text-xs font-normal subtle">kg</span>
            </h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={weightView === "daily" ? "default" : "outline"}
                aria-pressed={weightView === "daily"}
                onClick={() => setWeightView("daily")}
              >
                일별
              </Button>
              <Button
                size="sm"
                variant={weightView === "weekly" ? "default" : "outline"}
                aria-pressed={weightView === "weekly"}
                onClick={() => setWeightView("weekly")}
              >
                주간 평균
              </Button>
            </div>
          </div>
          <Trend
            rows={weightView === "daily" ? daily : weekly}
            field="weight_kg"
            label={weightView === "daily" ? "체중" : "주간 평균 체중"}
            unit="kg"
          />
          <p className="mt-3 text-xs leading-5 subtle">
            주간 평균은 월요일~일요일 중 선택 기간에 속한 체중 측정일만
            계산합니다. 부분 주도 포함하며 측정이 없는 주는 비워 둡니다.
          </p>
          {weightView === "weekly" && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-semibold">
                주간 평균값 보기
              </summary>
              <ul className="mt-3 space-y-2">
                {weekly
                  .filter((w) => w.count > 0)
                  .map((w) => (
                    <li key={w.date}>
                      {w.date} 주 · {fmt(w.weight_kg!)}kg · {w.count}일 측정
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>
        <section className="card min-w-0" aria-label="골격근량 변화">
          <h2 className="mb-4 text-lg font-bold">
            골격근량 변화 <span className="text-xs font-normal subtle">kg</span>
          </h2>
          <Trend
            rows={daily}
            field="muscle_mass_kg"
            label="골격근량"
            unit="kg"
          />
        </section>
        <section className="card min-w-0" aria-label="체지방률 변화">
          <h2 className="mb-4 text-lg font-bold">
            체지방률 변화 <span className="text-xs font-normal subtle">%</span>
          </h2>
          <Trend
            rows={daily}
            field="body_fat_percent"
            label="체지방률"
            unit="%"
          />
        </section>
      </div>
      <section className="card mt-5" aria-label="기간별 체성분 비교">
        <h2 className="text-lg font-bold">기간별 체성분 비교</h2>
        <p className="mt-2 text-xs leading-5 subtle">
          항목별 첫 측정과 마지막 측정을 비교합니다. 항목마다 측정 날짜가 다를
          수 있으며 2일 이상 측정했을 때 변화를 표시합니다.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              선택 기간의 항목별 첫 측정·마지막 측정·변화
            </caption>
            <thead className="text-xs subtle">
              <tr>
                <th className="pb-3 pr-3">항목</th>
                <th className="pb-3 pr-3">첫 측정</th>
                <th className="pb-3 pr-3">마지막</th>
                <th className="pb-3">변화</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const c = comparison(daily, m.key);
                const value = (point: BodyPoint | undefined) =>
                  point ? (
                    <>
                      <span className="whitespace-nowrap font-semibold">
                        {fmt(point[m.key]!)}
                        {m.unit}
                      </span>
                      <span className="mt-1 block text-[10px] subtle">
                        {point.date}
                        {m.key === "fat_mass_kg"
                          ? ` · ${point.fat_mass_source === "calculated" ? "계산" : "실측"}`
                          : ""}
                      </span>
                    </>
                  ) : (
                    <span className="subtle">미측정</span>
                  );
                return (
                  <tr key={m.key} className="border-t border-[var(--border)]">
                    <th className="py-4 pr-2 text-xs font-semibold">
                      {m.label}
                    </th>
                    <td className="py-4 pr-2">{value(c.first)}</td>
                    <td className="py-4 pr-2">{value(c.last)}</td>
                    <td className="py-4 text-xs font-semibold">
                      {c.count < 2
                        ? "비교 불가"
                        : `${c.delta! > 0 ? "+" : ""}${fmt(c.delta!)}${m.key === "body_fat_percent" ? "%p" : m.unit}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card mt-5">
        <details>
          <summary className="cursor-pointer font-semibold">
            날짜별 측정값 보기
          </summary>
          <p className="my-3 text-xs subtle">
            최근 100일의 등록 측정만 표에 표시합니다. 그래프는 선택한 기간
            전체입니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <caption className="sr-only">
                실제 날짜별 체성분과 체지방량 출처
              </caption>
              <thead>
                <tr>
                  <th className="py-3">날짜</th>
                  {metrics.map((m) => (
                    <th key={m.key} className="py-3">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .reverse()
                  .slice(0, 100)
                  .map((r) => (
                    <tr
                      key={r.date}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="py-3">
                        <Link
                          className="text-blue-600"
                          href={`/calendar?date=${r.date}`}
                        >
                          {r.date}
                        </Link>
                      </td>
                      {metrics.map((m) => (
                        <td key={m.key} className="py-3">
                          {r[m.key] === null
                            ? "미측정"
                            : `${fmt(r[m.key]!)}${m.unit}`}
                          {m.key === "fat_mass_kg" && r.fat_mass_source && (
                            <span className="block subtle">
                              {r.fat_mass_source === "calculated"
                                ? "계산값"
                                : "실측값"}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <p className="mt-5 text-xs subtle">
        영양·운동 성장 분석은 위 분석 종류에서 선택할 수 있습니다.
      </p>
    </>
  );
}
