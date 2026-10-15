"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DietDialog } from "@/components/diet/dialog";
import { saveAnalysisGoal } from "@/app/(app)/analytics/actions";
import { goalModes, activities, type Goal } from "@/lib/analysis/model";
import { fmt } from "@/lib/diet/nutrition";
export function GoalControl({
  goal,
  enabled,
}: {
  goal: Goal | null;
  enabled: boolean;
}) {
  const router = useRouter(),
    [open, setOpen] = useState(false),
    [busy, startTransition] = useTransition(),
    [message, setMessage] = useState<{
      error?: string;
      success?: string;
      conflict?: boolean;
    }>({});
  return (
    <section className="card mt-5" aria-label="현재 목표 설정">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            현재 목표 · {goal ? goalModes[goal.goal_mode] : "미설정"}
          </h2>
          <p className="mt-2 text-xs subtle">
            {goal?.target_weight
              ? `목표 체중 ${fmt(goal.target_weight)}kg`
              : "목표 체중 미설정"}
            {goal?.target_date
              ? ` · ${goal.target_date}`
              : " · 목표 날짜 선택 가능"}
            {goal?.calories ? ` · 하루 ${fmt(goal.calories)}kcal` : ""}
          </p>
        </div>
        <Button
          disabled={!enabled || busy}
          onClick={() => {
            setMessage({});
            setOpen(true);
          }}
        >
          {goal ? "목표 수정" : "목표 설정"}
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 subtle">
        현재 입력한 목표는 식단에도 적용됩니다. 활동 수준은 저장 정보이며 열량을
        자동 계산하지 않습니다. 과거 분석은 당시 저장된 목표와 비교합니다.
      </p>
      {message.success && !open && (
        <p role="status" className="mt-3 text-sm text-emerald-600">
          {message.success}
        </p>
      )}
      {open && (
        <DietDialog
          title="개인 목표 설정"
          busy={busy}
          onClose={() => setOpen(false)}
        >
          {message.error && (
            <p role="alert" className="mb-4 text-sm text-red-500">
              {message.error}
            </p>
          )}
          {message.conflict && (
            <Button
              className="mb-4"
              variant="outline"
              onClick={() => {
                setOpen(false);
                router.refresh();
              }}
            >
              최신 목표 불러오기
            </Button>
          )}
          <GoalForm
            goal={goal}
            busy={busy}
            onSubmit={(data) =>
              startTransition(async () => {
                const r = await saveAnalysisGoal(data, goal?.version ?? null);
                setMessage(r);
                if (r.success) setOpen(false);
              })
            }
          />
        </DietDialog>
      )}
    </section>
  );
}
function GoalForm({
  goal,
  busy,
  onSubmit,
}: {
  goal: Goal | null;
  busy: boolean;
  onSubmit: (data: unknown) => void;
}) {
  const str = (n: number | null | undefined) => (n == null ? "" : String(n));
  const [mode, setMode] = useState(goal?.goal_mode || "custom"),
    [activity, setActivity] = useState(goal?.activity_level || "");
  const [v, setV] = useState({
    current_weight: str(goal?.current_weight),
    target_weight: str(goal?.target_weight),
    target_date: goal?.target_date || "",
    calories: str(goal?.calories),
    carbs_g: str(goal?.carbs_g),
    protein_g: str(goal?.protein_g),
    fat_g: str(goal?.fat_g),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          ...v,
          goal_mode: mode,
          activity_level: activity,
          current_weight: Number(v.current_weight),
          target_weight: Number(v.target_weight),
          target_date: v.target_date || null,
          calories: Number(v.calories),
          carbs_g: Number(v.carbs_g),
          protein_g: Number(v.protein_g),
          fat_g: Number(v.fat_g),
        });
      }}
    >
      <fieldset disabled={busy}>
        <label htmlFor="goal-mode">목표 유형</label>
        <select
          id="goal-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
        >
          {Object.entries(goalModes).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {(
            [
              { key: "current_weight", label: "현재 체중 (kg)" },
              { key: "target_weight", label: "목표 체중 (kg)" },
            ] as const
          ).map((f) => (
            <div key={f.key}>
              <label htmlFor={`goal-${f.key}`}>{f.label}</label>
              <input
                id={`goal-${f.key}`}
                type="number"
                inputMode="decimal"
                min="0.01"
                max="1000"
                step="any"
                required
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <label className="mt-4" htmlFor="goal-date">
          목표 날짜 (선택)
        </label>
        <input
          id="goal-date"
          type="date"
          min="1900-01-01"
          max="2100-12-31"
          value={v.target_date}
          onChange={(e) => setV({ ...v, target_date: e.target.value })}
        />
        <label className="mt-4" htmlFor="goal-activity">
          활동 수준
        </label>
        <select
          id="goal-activity"
          required
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        >
          <option value="">선택하세요</option>
          {Object.entries(activities).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <div className="mt-5 grid grid-cols-2 gap-4">
          {(
            [
              { key: "calories", label: "하루 목표 칼로리 (kcal)" },
              { key: "carbs_g", label: "하루 목표 탄수화물 (g)" },
              { key: "protein_g", label: "하루 목표 단백질 (g)" },
              { key: "fat_g", label: "하루 목표 지방 (g)" },
            ] as const
          ).map((f) => (
            <div key={f.key}>
              <label htmlFor={`goal-${f.key}`}>{f.label}</label>
              <input
                id={`goal-${f.key}`}
                type="number"
                inputMode="decimal"
                min="0.1"
                max="100000"
                step="any"
                required
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 subtle">
          직접 선택한 수치를 저장합니다. 현재 체중 입력은 측정 기록을 변경하지
          않습니다. 목표 변경은 한국 날짜 기준 변경일부터 적용하며 같은 날에는
          마지막 목표를 사용합니다.
        </p>
        <Button className="mt-5 w-full" type="submit" disabled={busy}>
          {busy ? "저장 중…" : "목표 저장"}
        </Button>
      </fieldset>
    </form>
  );
}
