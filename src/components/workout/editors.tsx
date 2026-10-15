"use client";
import { Button } from "@/components/ui/button";
import { useAutosave } from "./use-autosave";
import {
  setLabels,
  setTypes,
  increases,
  type WorkoutSet,
  type Entry,
} from "@/lib/workout/model";
import { fmt } from "@/lib/diet/nutrition";
import { useRef } from "react";
function SaveStatus({
  save,
}: {
  save: {
    status: string;
    conflict: Record<string, unknown> | null;
    resolve: (mine: boolean) => void;
    retry: () => void;
  };
}) {
  return (
    <div className="mt-3 text-xs" role="status">
      <p
        className={
          save.status.includes("완료") || save.status === "DB 저장됨"
            ? "text-emerald-600"
            : "text-amber-600"
        }
      >
        {save.status}
      </p>
      {save.conflict ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => save.resolve(false)}
          >
            서버 값 사용
          </Button>
          <Button size="sm" onClick={() => save.resolve(true)}>
            내 입력으로 다시 저장
          </Button>
        </div>
      ) : (
        !save.status.includes("완료") &&
        save.status !== "DB 저장됨" && (
          <button
            className="mt-2 font-semibold underline"
            onClick={save.retry}
            type="button"
          >
            지금 저장 / 재시도
          </button>
        )
      )}
    </div>
  );
}
const str = (n: number | null | undefined) => (n == null ? "" : String(n));
export function SetEditor({
  row,
  userId,
  previous,
  onPending,
  onDelete,
  onDuplicate,
  disabled,
  mutationsDisabled,
  onCompleted,
}: {
  row: WorkoutSet;
  userId: string;
  previous?: WorkoutSet;
  onPending: (id: string, b: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  disabled: boolean;
  mutationsDisabled: boolean;
  onCompleted?: (seconds: number | null) => void;
}) {
  const initial = {
    weight_kg: str(row.weight_kg),
    reps: str(row.reps),
    set_type: row.set_type,
    effort_type: row.effort_type,
    effort_value: str(row.effort_value),
    rest_seconds: str(row.rest_seconds),
    completed: row.completed,
  };
  const accepted = useRef(row.completed);
  const save = useAutosave(
    "set",
    `fitlog:workout:${userId}:set:${row.id}`,
    row.id,
    initial,
    row.version,
    onPending,
    (values) => {
      if (values.completed && !accepted.current)
        onCompleted?.(
          values.rest_seconds === "" ? null : Number(values.rest_seconds),
        );
      accepted.current = values.completed;
    },
  );
  const v = save.values;
  const asRow = {
    ...row,
    completed: v.completed,
    set_type: v.set_type,
    weight_kg: v.weight_kg === "" ? null : Number(v.weight_kg),
    reps: v.reps === "" ? null : Number(v.reps),
  };
  const diff = increases(asRow, previous);
  function adjust(field: "weight_kg" | "reps", delta: number) {
    save.change(
      { ...v, [field]: String(Math.max(0, Number(v[field] || 0) + delta)) },
      true,
    );
  }
  return (
    <article
      aria-label={`${row.set_number}세트`}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
    >
      <header className="flex items-center justify-between gap-3">
        <span className="font-bold">{row.set_number}세트</span>
        <label
          className={`!m-0 flex min-h-11 items-center gap-2 rounded-xl px-3 ${v.completed ? "bg-blue-600 text-white" : "bg-[var(--muted)]"}`}
        >
          <input
            type="checkbox"
            className="!w-5"
            checked={v.completed}
            disabled={disabled}
            onChange={(e) =>
              save.change({ ...v, completed: e.target.checked }, true)
            }
          />
          완료
        </label>
      </header>
      <label className="mt-3" htmlFor={`type-${row.id}`}>
        세트 종류
      </label>
      <select
        id={`type-${row.id}`}
        value={v.set_type}
        disabled={disabled}
        onChange={(e) =>
          save.change(
            { ...v, set_type: e.target.value as WorkoutSet["set_type"] },
            true,
          )
        }
      >
        {setTypes.map((t) => (
          <option key={t} value={t}>
            {setLabels[t]}
          </option>
        ))}
      </select>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`weight-${row.id}`}>중량 (kg)</label>
          <input
            id={`weight-${row.id}`}
            type="number"
            inputMode="decimal"
            min="0"
            max="2000"
            step="any"
            disabled={disabled}
            value={v.weight_kg}
            onChange={(e) => save.change({ ...v, weight_kg: e.target.value })}
          />
          <div className="mt-2 grid grid-cols-2 gap-1">
            <button
              className="min-h-10 rounded-lg bg-[var(--muted)] text-xs"
              aria-label="중량 2.5kg 감소"
              disabled={disabled}
              onClick={() => adjust("weight_kg", -2.5)}
            >
              -2.5
            </button>
            <button
              className="min-h-10 rounded-lg bg-blue-500/10 text-xs text-blue-600"
              aria-label="중량 2.5kg 증가"
              disabled={disabled}
              onClick={() => adjust("weight_kg", 2.5)}
            >
              +2.5
            </button>
          </div>
        </div>
        <div>
          <label htmlFor={`reps-${row.id}`}>반복 (회)</label>
          <input
            id={`reps-${row.id}`}
            type="number"
            inputMode="numeric"
            min="0"
            max="1000"
            step="1"
            disabled={disabled}
            value={v.reps}
            onChange={(e) => save.change({ ...v, reps: e.target.value })}
          />
          <div className="mt-2 grid grid-cols-2 gap-1">
            <button
              className="min-h-10 rounded-lg bg-[var(--muted)] text-xs"
              aria-label="반복 1회 감소"
              disabled={disabled}
              onClick={() => adjust("reps", -1)}
            >
              -1
            </button>
            <button
              className="min-h-10 rounded-lg bg-blue-500/10 text-xs text-blue-600"
              aria-label="반복 1회 증가"
              disabled={disabled}
              onClick={() => adjust("reps", 1)}
            >
              +1
            </button>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`effort-${row.id}`}>강도 기준</label>
          <select
            id={`effort-${row.id}`}
            value={v.effort_type}
            disabled={disabled}
            onChange={(e) =>
              save.change(
                {
                  ...v,
                  effort_type: e.target.value as WorkoutSet["effort_type"],
                },
                true,
              )
            }
          >
            <option value="none">미입력</option>
            <option value="rpe">RPE</option>
            <option value="rir">RIR</option>
          </select>
          {v.effort_type !== "none" && (
            <>
              <label className="mt-2" htmlFor={`effortval-${row.id}`}>
                {v.effort_type.toUpperCase()} 값
              </label>
              <input
                id={`effortval-${row.id}`}
                type="number"
                inputMode="decimal"
                step="0.5"
                min={v.effort_type === "rpe" ? 1 : 0}
                max="10"
                disabled={disabled}
                value={v.effort_value}
                onChange={(e) =>
                  save.change({ ...v, effort_value: e.target.value })
                }
              />
            </>
          )}
        </div>
        <div>
          <label htmlFor={`rest-${row.id}`}>휴식 (초)</label>
          <input
            id={`rest-${row.id}`}
            type="number"
            inputMode="numeric"
            min="0"
            max="3600"
            step="1"
            disabled={disabled}
            value={v.rest_seconds}
            onChange={(e) =>
              save.change({ ...v, rest_seconds: e.target.value })
            }
          />
        </div>
      </div>
      {previous && (
        <p className="mt-4 rounded-lg bg-[var(--muted)] p-3 text-xs subtle">
          지난 {setLabels[previous.set_type]} ·{" "}
          {previous.weight_kg === null ? "—" : fmt(previous.weight_kg)}kg ×{" "}
          {previous.reps ?? "—"}회
        </p>
      )}
      {diff && (diff.weight > 0 || diff.reps > 0) && (
        <p className="mt-2 text-xs font-semibold text-blue-600">
          {diff.weight > 0
            ? `지난 기록 대비 중량 +${fmt(diff.weight)}kg`
            : `같은 중량에서 반복 +${diff.reps}회`}
        </p>
      )}
      <SaveStatus save={save} />
      <footer className="mt-4 flex justify-between gap-3">
        <button
          className="min-h-10 text-xs font-semibold text-blue-600"
          disabled={disabled || mutationsDisabled}
          onClick={onDuplicate}
        >
          이 세트 입력 복제
        </button>
        <button
          className="min-h-10 text-xs text-red-500"
          disabled={disabled || mutationsDisabled}
          onClick={onDelete}
        >
          세트 삭제
        </button>
      </footer>
    </article>
  );
}
export function EntryTargets({
  entry,
  userId,
  onPending,
}: {
  entry: Entry;
  userId: string;
  onPending: (id: string, b: boolean) => void;
}) {
  const initial = {
    target_weight: str(entry.target_weight),
    target_reps: str(entry.target_reps),
    target_sets: String(entry.target_sets),
    note: entry.note,
  };
  const save = useAutosave(
    "entry",
    `fitlog:workout:${userId}:entry:${entry.id}`,
    entry.id,
    initial,
    entry.version,
    onPending,
  );
  const v = save.values;
  return (
    <details className="mt-4 rounded-xl bg-[var(--muted)] p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        이번 운동 목표 · 운동 메모
      </summary>
      <p className="mt-3 text-xs subtle">
        지난 기록 또는 루틴에서 가져온 목표를 직접 수정하세요. 목표는 실제 수행
        기록으로 계산하지 않습니다.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div>
          <label htmlFor={`tw-${entry.id}`} className="!text-xs">
            목표 kg
          </label>
          <input
            id={`tw-${entry.id}`}
            type="number"
            min="0"
            max="2000"
            step="any"
            inputMode="decimal"
            value={v.target_weight}
            onChange={(e) =>
              save.change({ ...v, target_weight: e.target.value })
            }
          />
        </div>
        <div>
          <label htmlFor={`tr-${entry.id}`} className="!text-xs">
            목표 반복
          </label>
          <input
            id={`tr-${entry.id}`}
            type="number"
            min="0"
            max="1000"
            inputMode="numeric"
            value={v.target_reps}
            onChange={(e) => save.change({ ...v, target_reps: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`ts-${entry.id}`} className="!text-xs">
            목표 세트
          </label>
          <input
            id={`ts-${entry.id}`}
            type="number"
            min="1"
            max="100"
            inputMode="numeric"
            value={v.target_sets}
            onChange={(e) => save.change({ ...v, target_sets: e.target.value })}
          />
        </div>
      </div>
      <label className="mt-4" htmlFor={`enote-${entry.id}`}>
        운동 메모
      </label>
      <textarea
        id={`enote-${entry.id}`}
        value={v.note}
        maxLength={2000}
        rows={2}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"
        onChange={(e) => save.change({ ...v, note: e.target.value })}
      />
      <SaveStatus save={save} />
    </details>
  );
}
export function SessionNote({
  id,
  version,
  note,
  userId,
  onPending,
}: {
  id: string;
  version: number;
  note: string;
  userId: string;
  onPending: (id: string, b: boolean) => void;
}) {
  const save = useAutosave(
    "session",
    `fitlog:workout:${userId}:session:${id}`,
    id,
    { note: note || "" },
    version,
    onPending,
  );
  return (
    <section className="card mt-5">
      <label htmlFor="session-note">전체 운동 메모</label>
      <textarea
        id="session-note"
        rows={2}
        maxLength={2000}
        value={save.values.note}
        onChange={(e) => save.change({ note: e.target.value })}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"
      />
      <SaveStatus save={save} />
    </section>
  );
}
