"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  exampleDays,
  type Exercise,
  type Routine,
  type RoutineInput,
} from "@/lib/workout/model";
type DayDraft = {
  name: string;
  is_rest: boolean;
  exercises: {
    exercise_id: string;
    target_weight: string;
    target_reps: string;
    target_sets: string;
  }[];
};
export function RoutineEditor({
  routine,
  exercises,
  busy,
  onSave,
}: {
  routine?: Routine;
  exercises: Exercise[];
  busy: boolean;
  onSave: (input: RoutineInput) => void;
}) {
  const [name, setName] = useState(routine?.name || "");
  const [days, setDays] = useState<DayDraft[]>(
    routine
      ? [...routine.workout_routine_days]
          .sort((a, b) => a.day_index - b.day_index)
          .map((d) => ({
            name: d.name,
            is_rest: d.is_rest,
            exercises: [...d.routine_exercises]
              .sort((a, b) => a.position - b.position)
              .map((e) => ({
                exercise_id: e.exercise_id,
                target_weight:
                  e.target_weight == null ? "" : String(e.target_weight),
                target_reps: e.target_reps == null ? "" : String(e.target_reps),
                target_sets: String(e.target_sets),
              })),
          }))
      : exampleDays.map((d) => ({ ...d, exercises: [] })),
  );
  function changeDay(index: number, day: DayDraft) {
    setDays(days.map((d, i) => (i === index ? day : d)));
  }
  function length(n: number) {
    if (!Number.isInteger(n) || n < 1 || n > 60) return;
    setDays(
      Array.from(
        { length: n },
        (_, i) =>
          days[i] || { name: `${i + 1}일차`, is_rest: false, exercises: [] },
      ),
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          name,
          days: days.map((d) => ({
            ...d,
            exercises: d.exercises.map((x) => ({
              ...x,
              target_weight:
                x.target_weight === "" ? null : Number(x.target_weight),
              target_reps: x.target_reps === "" ? null : Number(x.target_reps),
              target_sets: Number(x.target_sets),
            })),
          })),
        });
      }}
    >
      <label htmlFor="routine-name">루틴 이름</label>
      <input
        id="routine-name"
        required
        maxLength={120}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="cycle-length">주기 (일)</label>
          <input
            id="cycle-length"
            type="number"
            min="1"
            max="60"
            value={days.length}
            onChange={(e) => length(Number(e.target.value))}
            className="!w-24"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() =>
            setDays(exampleDays.map((d) => ({ ...d, exercises: [] })))
          }
        >
          8일 예시 배치
        </Button>
      </div>
      <p className="my-4 text-xs leading-5 subtle">
        1~60일 주기를 설정할 수 있습니다. 예시는 운동 부위만 배치하며
        종목·목표는 직접 지정합니다. 루틴 수정은 이미 수행한 기록을 바꾸지
        않습니다.
      </p>
      <div className="space-y-5">
        {days.map((day, index) => (
          <section
            key={index}
            className="rounded-xl border border-[var(--border)] p-4"
          >
            <h3 className="mb-3 font-bold">{index + 1}일차</h3>
            <label className="sr-only" htmlFor={`day-name-${index}`}>
              {index + 1}일차 이름
            </label>
            <input
              id={`day-name-${index}`}
              value={day.name}
              required
              maxLength={120}
              onChange={(e) =>
                changeDay(index, { ...day, name: e.target.value })
              }
            />
            <label className="mt-3 flex min-h-10 items-center gap-2">
              <input
                type="checkbox"
                className="!w-5"
                checked={day.is_rest}
                onChange={(e) =>
                  changeDay(index, {
                    ...day,
                    is_rest: e.target.checked,
                    exercises: e.target.checked ? [] : day.exercises,
                  })
                }
              />
              휴식일
            </label>
            {!day.is_rest && (
              <>
                <label className="mt-3" htmlFor={`add-routine-${index}`}>
                  {index + 1}일차 운동 추가
                </label>
                <select
                  id={`add-routine-${index}`}
                  value=""
                  disabled={day.exercises.length >= 50}
                  onChange={(e) => {
                    if (e.target.value)
                      changeDay(index, {
                        ...day,
                        exercises: [
                          ...day.exercises,
                          {
                            exercise_id: e.target.value,
                            target_weight: "",
                            target_reps: "",
                            target_sets: "1",
                          },
                        ],
                      });
                  }}
                >
                  <option value="">종목 선택</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} · {ex.muscle_group}
                    </option>
                  ))}
                </select>
                {!exercises.length && (
                  <p className="mt-2 text-xs subtle">
                    운동 종목을 먼저 직접 등록하거나 빈 배치로 저장 후
                    추가하세요.
                  </p>
                )}
                <div className="mt-3 space-y-3">
                  {day.exercises.map((x, i) => (
                    <article
                      key={i}
                      className="rounded-xl bg-[var(--muted)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {i + 1}.{" "}
                          {exercises.find((ex) => ex.id === x.exercise_id)
                            ?.name || "종목"}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="min-h-10 p-2 text-xs"
                            aria-label={`${index + 1}일차 종목${i + 1} 순서 올림`}
                            disabled={i === 0}
                            onClick={() => {
                              const list = [...day.exercises];
                              [list[i], list[i - 1]] = [list[i - 1], list[i]];
                              changeDay(index, { ...day, exercises: list });
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="min-h-10 p-2 text-xs"
                            aria-label={`${index + 1}일차 종목${i + 1} 순서 내림`}
                            disabled={i === day.exercises.length - 1}
                            onClick={() => {
                              const list = [...day.exercises];
                              [list[i], list[i + 1]] = [list[i + 1], list[i]];
                              changeDay(index, { ...day, exercises: list });
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="min-h-10 p-2 text-xs text-red-500"
                            onClick={() =>
                              changeDay(index, {
                                ...day,
                                exercises: day.exercises.filter(
                                  (_, n) => n !== i,
                                ),
                              })
                            }
                          >
                            제거
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {[
                          ["target_weight", "목표 kg"],
                          ["target_reps", "목표 반복"],
                          ["target_sets", "목표 세트"],
                        ].map(([key, label]) => (
                          <div key={key}>
                            <label
                              className="!text-xs"
                              htmlFor={`${key}-${index}-${i}`}
                            >
                              {index + 1}일차 {i + 1}번 {label}
                            </label>
                            <input
                              id={`${key}-${index}-${i}`}
                              type="number"
                              min={key === "target_sets" ? 1 : 0}
                              max={
                                key === "target_sets"
                                  ? 100
                                  : key === "target_reps"
                                    ? 1000
                                    : 2000
                              }
                              step={key === "target_weight" ? "any" : "1"}
                              inputMode={
                                key === "target_weight" ? "decimal" : "numeric"
                              }
                              required={key === "target_sets"}
                              value={x[key as "target_weight"]}
                              onChange={(e) =>
                                changeDay(index, {
                                  ...day,
                                  exercises: day.exercises.map((v, n) =>
                                    n === i
                                      ? { ...v, [key]: e.target.value }
                                      : v,
                                  ),
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        ))}
      </div>
      <Button className="mt-6 w-full" disabled={busy}>
        {busy ? "저장 중…" : "루틴 저장"}
      </Button>
    </form>
  );
}
