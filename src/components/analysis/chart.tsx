"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { fmt } from "@/lib/diet/nutrition";
export type SeriesRow = {
  date: string;
  [key: string]: string | number | null | undefined;
};
export function MetricChart({
  rows,
  series,
  label,
  testId,
}: {
  rows: SeriesRow[];
  series: {
    key: string;
    name: string;
    color: string;
    unit: string;
    axis?: "left" | "right";
  }[];
  label: string;
  testId: string;
}) {
  if (!rows.length || !rows.some((r) => series.some((s) => r[s.key] != null)))
    return (
      <p className="flex min-h-56 items-center justify-center text-sm subtle">
        이 기간에 {label} 기록이 없습니다.
      </p>
    );
  const years = rows.at(0)?.date.slice(0, 4) !== rows.at(-1)?.date.slice(0, 4),
    right = series.some((s) => s.axis === "right");
  return (
    <>
      <div
        className="h-72 min-w-0"
        role="img"
        aria-label={`${label} · 실제 기록 그래프`}
        data-testid={testId}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart
            data={rows}
            margin={{ top: 15, right: 8, left: 0, bottom: 10 }}
            accessibilityLayer
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              minTickGap={35}
              tick={{ fontSize: 10, fill: "var(--subtle)" }}
              tickFormatter={(v) => String(v).slice(years ? 2 : 5)}
            />
            <YAxis
              yAxisId="left"
              domain={["auto", "auto"]}
              width={44}
              tick={{ fontSize: 10, fill: "var(--subtle)" }}
              tickFormatter={(v) => fmt(Number(v))}
            />
            {right && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={["auto", "auto"]}
                width={44}
                tick={{ fontSize: 10, fill: "var(--subtle)" }}
                tickFormatter={(v) => fmt(Number(v))}
              />
            )}
            <Tooltip
              labelFormatter={(v) => String(v)}
              formatter={(v, name) => {
                const s = series.find((s) => s.name === name);
                return [`${fmt(Number(v))}${s?.unit || ""}`, name];
              }}
              contentStyle={{
                background: "var(--card)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: 12,
              }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                yAxisId={s.axis || "left"}
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
                type="linear"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs subtle">
        {series.map((s) => (
          <span key={s.key}>
            <span style={{ color: s.color }}>●</span> {s.name} ({s.unit})
          </span>
        ))}
      </div>
    </>
  );
}
