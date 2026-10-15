"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  calculatedFat,
  type BodyInput,
  type BodyRecord,
  type ConditionInput,
  type ConditionRecord,
} from "@/lib/wellness/model";
import { fmt } from "@/lib/diet/nutrition";
const str = (value: number | null | undefined) =>
  value == null ? "" : String(value);
const number = (value: string) => (value === "" ? null : Number(value));
export function BodyForm({
  date,
  record,
  busy,
  onSave,
}: {
  date: string;
  record?: BodyRecord;
  busy: boolean;
  onSave: (date: string, input: BodyInput) => void;
}) {
  const [day, setDay] = useState(record?.measured_date || date);
  const [v, setV] = useState({
    weight_kg: str(record?.weight_kg),
    muscle_mass_kg: str(record?.muscle_mass_kg),
    body_fat_percent: str(record?.body_fat_percent),
    fat_mass_kg: str(record?.fat_mass_kg),
    waist_cm: str(record?.waist_cm),
    note: record?.note || "",
  });
  const [mode, setMode] = useState(record?.fat_mass_source || "none");
  const calculated = calculatedFat(
    number(v.weight_kg),
    number(v.body_fat_percent),
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(day, {
          weight_kg: number(v.weight_kg),
          muscle_mass_kg: number(v.muscle_mass_kg),
          body_fat_percent: number(v.body_fat_percent),
          fat_mass_kg:
            mode === "calculated"
              ? calculated
              : mode === "measured"
                ? number(v.fat_mass_kg)
                : null,
          fat_mass_source:
            mode === "none" ? null : (mode as "calculated" | "measured"),
          waist_cm: number(v.waist_cm),
          note: v.note,
        });
      }}
    >
      <fieldset disabled={busy}>
        <label htmlFor="body-date">측정 날짜</label>
        <input
          id="body-date"
          type="date"
          required
          min="1900-01-01"
          max="2100-12-31"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
        <p className="my-4 text-xs leading-5 subtle">
          측정하지 않은 항목은 비워 두세요. 체중·골격근량은 kg, 허리둘레는 cm
          기준입니다.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              { key: "weight_kg", label: "체중 (kg)", min: 0.01, max: 1000 },
              {
                key: "muscle_mass_kg",
                label: "골격근량 (kg)",
                min: 0.01,
                max: 1000,
              },
              {
                key: "body_fat_percent",
                label: "체지방률 (%)",
                min: 0,
                max: 100,
              },
              { key: "waist_cm", label: "허리둘레 (cm)", min: 0.01, max: 500 },
            ] as const
          ).map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key}>{f.label}</label>
              <input
                id={f.key}
                type="number"
                inputMode="decimal"
                step="any"
                min={f.min}
                max={f.max}
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <label className="mt-5" htmlFor="fat-source">
          체지방량 입력 방식
        </label>
        <select
          id="fat-source"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setV({ ...v, fat_mass_kg: "" });
          }}
        >
          <option value="none">미입력</option>
          <option value="measured">실제 측정값 직접 입력</option>
          <option value="calculated">체중 × 체지방률로 계산</option>
        </select>
        {mode === "measured" && (
          <div className="mt-4">
            <label htmlFor="fat-mass">실제 체지방량 (kg)</label>
            <input
              id="fat-mass"
              type="number"
              inputMode="decimal"
              min="0"
              max="1000"
              step="any"
              required
              value={v.fat_mass_kg}
              onChange={(e) => setV({ ...v, fat_mass_kg: e.target.value })}
            />
          </div>
        )}
        {mode === "calculated" && (
          <p
            className="mt-3 rounded-xl bg-blue-500/10 p-3 text-sm text-blue-600"
            role="status"
          >
            계산 체지방량:{" "}
            {calculated === null
              ? "체중·체지방률을 입력하세요."
              : `${fmt(calculated)}kg`}
            <span className="mt-1 block text-xs">
              계산값으로 저장하며 실제 측정값과 구분합니다.
            </span>
          </p>
        )}
        <label className="mt-5" htmlFor="body-note">
          측정 메모
        </label>
        <textarea
          id="body-note"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"
          maxLength={2000}
          rows={3}
          value={v.note}
          onChange={(e) => setV({ ...v, note: e.target.value })}
        />
        <Button className="mt-5 w-full" type="submit" disabled={busy}>
          {busy ? "저장 중…" : "체성분 저장"}
        </Button>
      </fieldset>
    </form>
  );
}
export function ConditionForm({
  date,
  record,
  busy,
  onSave,
}: {
  date: string;
  record: ConditionRecord | null;
  busy: boolean;
  onSave: (input: ConditionInput) => void;
}) {
  const [v, setV] = useState({
    sleep_hours: str(record?.sleep_hours),
    fatigue: str(record?.fatigue),
    workout_satisfaction: str(record?.workout_satisfaction),
    pain_areas: record?.pain_areas || "",
    pain_intensity: str(record?.pain_intensity),
    note: record?.note || "",
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...v,
          sleep_hours: number(v.sleep_hours),
          fatigue: number(v.fatigue),
          workout_satisfaction: number(v.workout_satisfaction),
          pain_intensity: number(v.pain_intensity),
        });
      }}
    >
      <fieldset disabled={busy}>
        <p className="mb-4 text-sm subtle">
          {date} · 한국 날짜 · 모든 항목 선택 입력
        </p>
        <label htmlFor="sleep-hours">수면 시간 (시간)</label>
        <input
          id="sleep-hours"
          type="number"
          inputMode="decimal"
          min="0"
          max="24"
          step="any"
          value={v.sleep_hours}
          onChange={(e) => setV({ ...v, sleep_hours: e.target.value })}
        />
        <div className="mt-4 grid grid-cols-2 gap-4">
          {(
            [
              {
                key: "fatigue",
                label: "피로도",
                low: "매우 낮음",
                high: "매우 높음",
              },
              {
                key: "workout_satisfaction",
                label: "운동 만족도",
                low: "매우 낮음",
                high: "매우 높음",
              },
            ] as const
          ).map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key}>{f.label}</label>
              <select
                id={f.key}
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              >
                <option value="">미입력</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                    {n === 1 ? ` · ${f.low}` : n === 5 ? ` · ${f.high}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <label className="mt-4" htmlFor="pain-areas">
          통증 부위
        </label>
        <input
          id="pain-areas"
          placeholder="예: 오른쪽 어깨, 허리"
          maxLength={300}
          value={v.pain_areas}
          onChange={(e) => setV({ ...v, pain_areas: e.target.value })}
        />
        <label className="mt-4" htmlFor="pain-intensity">
          통증 강도 (0~10)
        </label>
        <select
          id="pain-intensity"
          value={v.pain_intensity}
          onChange={(e) => setV({ ...v, pain_intensity: e.target.value })}
        >
          <option value="">미입력</option>
          {Array.from({ length: 11 }, (_, n) => (
            <option key={n} value={n}>
              {n}
              {n === 0 ? " · 없음" : n === 10 ? " · 매우 심함" : ""}
            </option>
          ))}
        </select>
        <label className="mt-4" htmlFor="condition-note">
          컨디션 메모
        </label>
        <textarea
          id="condition-note"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"
          maxLength={2000}
          rows={3}
          value={v.note}
          onChange={(e) => setV({ ...v, note: e.target.value })}
        />
        {((record?.energy !== null && record?.energy !== undefined) ||
          (record?.mood !== null && record?.mood !== undefined)) && (
          <p className="mt-3 text-xs subtle">
            기존 활력 {record?.energy ?? "미입력"} · 기분{" "}
            {record?.mood ?? "미입력"} 기록은 유지됩니다.
          </p>
        )}
        <Button className="mt-5 w-full" type="submit" disabled={busy}>
          {busy ? "저장 중…" : "컨디션 저장"}
        </Button>
      </fieldset>
    </form>
  );
}
