"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Plus, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DietDialog } from "@/components/diet/dialog";
import { BodyForm, ConditionForm } from "./forms";
import {
  saveBody,
  saveCondition,
  deleteWellness,
  type WellnessResult,
} from "@/app/(app)/calendar/actions";
import {
  dateSchema,
  fmt,
  mealLabels,
  sumNutrition,
  type Meal,
} from "@/lib/diet/nutrition";
import {
  monthGrid,
  shiftMonth,
  hasRecord,
  metrics,
  type DaySummary,
  type BodyRecord,
  type ConditionRecord,
} from "@/lib/wellness/model";
import { setLabels, type Session } from "@/lib/workout/model";

export function CalendarDashboard({
  date,
  today,
  summary,
  meals,
  sessions,
  bodies,
  condition,
  plannedRest,
  enabled,
}: {
  date: string;
  today: string;
  summary: DaySummary[];
  meals: Meal[];
  sessions: Session[];
  bodies: BodyRecord[];
  condition: ConditionRecord | null;
  plannedRest: string | null;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [modal, setModal] = useState<"body" | "condition" | "delete" | null>(
    null,
  );
  const [editing, setEditing] = useState<BodyRecord | undefined>();
  const [deleting, setDeleting] = useState<{
    kind: "body" | "condition";
    id: string;
    version: number;
  } | null>(null);
  const [result, setResult] = useState<WellnessResult>({});
  const monthly = new Map(summary.map((s) => [s.date, s]));
  const selected = monthly.get(date);
  const total = sumNutrition(meals.flatMap((m) => m.meal_items));
  const previous = shiftMonth(date, -1),
    next = shiftMonth(date, 1);
  function open(type: typeof modal) {
    setResult({});
    setModal(type);
  }
  function perform(operation: () => Promise<WellnessResult>, newDate?: string) {
    if (busy || !enabled) return;
    setResult({});
    startTransition(async () => {
      try {
        const r = await operation();
        setResult(r);
        if (r.success) {
          setModal(null);
          if (newDate && newDate !== date)
            router.push(`/calendar?date=${newDate}`);
        }
      } catch {
        setResult({
          error:
            "연결 오류로 저장하지 못했습니다. 입력을 유지했습니다. 다시 시도하세요.",
        });
      }
    });
  }
  const display = (n: number | null | undefined, unit: string) =>
    n == null ? "미측정" : `${fmt(Number(n))}${unit}`;
  return (
    <>
      <p className="text-sm subtle">DAILY HEALTH JOURNAL</p>
      <h1 className="mt-3 text-3xl font-bold">캘린더</h1>
      <p className="mt-3 subtle">
        식단, 운동, 내 몸과 컨디션을 하루에 모아보세요.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/analytics?end=${date}&range=30`}>
            <Activity size={16} />
            체성분 추이
          </Link>
        </Button>
        <span className="self-center text-xs subtle">
          한국 날짜 · Asia/Seoul
        </span>
      </div>
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="card !p-3 sm:!p-6" aria-label="월간 캘린더">
          <header className="mb-5 flex items-center justify-between gap-2">
            <Button
              size="sm"
              className="!h-11 !w-11 !p-0"
              variant="outline"
              asChild
              disabled={busy || !dateSchema.safeParse(previous).success}
            >
              <Link
                aria-label="이전 달"
                href={
                  busy || !dateSchema.safeParse(previous).success
                    ? `/calendar?date=${date}`
                    : `/calendar?date=${previous}`
                }
                aria-disabled={busy || !dateSchema.safeParse(previous).success}
              >
                <ChevronLeft size={18} />
              </Link>
            </Button>
            <h2 className="text-lg font-bold">
              {Number(date.slice(0, 4))}년 {Number(date.slice(5, 7))}월
            </h2>
            <Button
              size="sm"
              className="!h-11 !w-11 !p-0"
              variant="outline"
              asChild
              disabled={busy || !dateSchema.safeParse(next).success}
            >
              <Link
                aria-label="다음 달"
                href={
                  busy || !dateSchema.safeParse(next).success
                    ? `/calendar?date=${date}`
                    : `/calendar?date=${next}`
                }
                aria-disabled={busy || !dateSchema.safeParse(next).success}
              >
                <ChevronRight size={18} />
              </Link>
            </Button>
          </header>
          <div
            className="grid grid-cols-7 text-center text-xs subtle"
            aria-hidden="true"
          >
            {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
              <span
                key={day}
                className={`pb-3 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""}`}
              >
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1" data-testid="month-grid">
            {monthGrid(date).map((day) => {
              const s = monthly.get(day),
                recorded = hasRecord(s),
                outside = day.slice(0, 7) !== date.slice(0, 7),
                valid = dateSchema.safeParse(day).success;
              const labels = [
                s?.completed_workouts ? "운동 완료" : "",
                s?.in_progress_workouts ? "운동 진행 중" : "",
                s?.rests ? "휴식일" : "",
                s?.meals ? "식단" : "",
                s?.body_count ? "체성분" : "",
                s?.condition ? "컨디션" : "",
                !enabled
                  ? "연결 후 조회"
                  : outside
                    ? "다른 달 · 선택하여 조회"
                    : !recorded
                      ? "기록 없음"
                      : "",
                plannedRest === day ? "휴식 예정" : "",
              ].filter(Boolean);
              return (
                <Link
                  key={day}
                  href={
                    busy || !valid
                      ? `/calendar?date=${date}`
                      : `/calendar?date=${day}`
                  }
                  aria-label={`${day} · ${labels.join(" · ")}`}
                  aria-current={day === date ? "date" : undefined}
                  aria-disabled={busy || !valid}
                  data-date={day}
                  className={`flex min-h-[76px] min-w-0 flex-col items-center rounded-xl border px-0.5 py-2 text-center ${day === date ? "border-blue-600 bg-blue-600 text-white" : "border-transparent hover:bg-[var(--muted)]"} ${outside ? "opacity-35" : ""}`}
                >
                  <span
                    className={`text-sm font-semibold ${day === today && day !== date ? "rounded-full bg-blue-500/15 px-1.5 text-blue-600" : ""}`}
                  >
                    {Number(day.slice(8))}
                  </span>
                  <span className="mt-1 flex h-2.5 gap-1" aria-hidden="true">
                    {!!s?.completed_workouts && (
                      <span
                        className={`h-2 w-2 rounded-full ${day === date ? "bg-white" : "bg-blue-500"}`}
                      />
                    )}{" "}
                    {!!s?.rests && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    )}
                    {!!s?.in_progress_workouts && (
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                    )}
                    {plannedRest === day && !s?.rests && (
                      <span className="h-2 w-2 rounded-full border border-emerald-500" />
                    )}
                  </span>
                  <span
                    className={`mt-1 text-[9px] leading-3 ${day === date ? "text-blue-100" : "subtle"}`}
                    aria-hidden="true"
                  >
                    {[
                      s?.meals ? "식" : "",
                      s?.body_count ? "체" : "",
                      s?.condition ? "컨" : "",
                    ]
                      .filter(Boolean)
                      .join("·") ||
                      (recorded || outside || !enabled ? "" : "—")}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[11px] subtle">
            <span>🔵 운동 완료</span>
            <span>🟢 휴식 완료</span>
            <span>🟠 운동 중</span>
            <span>○ 휴식 예정</span>
            <span>식·체·컨 기록</span>
            <span>— 기록 없음</span>
          </div>
          <p className="mt-3 text-xs leading-5 subtle">
            휴식 완료는 루틴에서 기록한 휴식일입니다. 예정은 완료 기록과
            구분하며, 다른 달의 표시는 해당 달을 선택하면 조회합니다.
          </p>
          <form action="/calendar" className="mt-5 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="calendar-date">기록 날짜</label>
              <input
                id="calendar-date"
                name="date"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                required
                defaultValue={date}
                disabled={busy}
              />
            </div>
            <Button type="submit" variant="outline" disabled={busy}>
              조회
            </Button>
            <Button asChild variant="outline" disabled={busy}>
              <Link
                href={
                  busy ? `/calendar?date=${date}` : `/calendar?date=${today}`
                }
              >
                오늘
              </Link>
            </Button>
          </form>
        </section>
        <div className="min-w-0 space-y-5">
          <header>
            <h2 className="text-xl font-bold">{date} 기록</h2>
            {enabled && !hasRecord(selected) && (
              <p className="mt-2 text-sm subtle">
                기록이 없는 날입니다. 과거 날짜에도 기록을 추가할 수 있어요.
              </p>
            )}
            {!!selected?.rests && (
              <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">
                휴식일 완료 기록
              </p>
            )}
            {plannedRest === date && (
              <p className="mt-3 text-sm text-emerald-600">
                루틴 휴식 예정 · 아직 완료 기록이 아닙니다.
              </p>
            )}
          </header>
          {result.success && (
            <p
              role="status"
              className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600"
            >
              {result.success}
            </p>
          )}
          <section
            aria-label="선택 날짜 영양 합계"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {(
              [
                { key: "calories", label: "총칼로리", unit: "kcal" },
                { key: "carbs_g", label: "탄수화물", unit: "g" },
                { key: "protein_g", label: "단백질", unit: "g" },
                { key: "fat_g", label: "지방", unit: "g" },
              ] as const
            ).map((f) => (
              <article className="card !p-4" key={f.key}>
                <p className="text-xs subtle">{f.label}</p>
                <p className="mt-3 text-2xl font-bold">
                  {enabled ? fmt(total[f.key]) : "—"}
                </p>
                <p className="mt-1 text-xs subtle">{f.unit}</p>
              </article>
            ))}
          </section>
          <section className="card" aria-label="날짜별 식단">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold">식단</h3>
              <Link
                href={`/diet?date=${date}`}
                className="text-sm font-semibold text-blue-600"
              >
                식단 등록·수정 →
              </Link>
            </div>
            {!meals.length && (
              <p className="mt-4 text-sm subtle">
                {enabled
                  ? "이 날짜의 식단 기록이 없습니다."
                  : "Supabase 연결 후 기록을 조회합니다."}
              </p>
            )}
            {meals.map((m) => (
              <div
                key={m.id}
                className="mt-4 border-t border-[var(--border)] pt-4"
              >
                <h4 className="text-sm font-bold">{mealLabels[m.meal_type]}</h4>
                <ul className="mt-2 space-y-3">
                  {m.meal_items.map((i) => (
                    <li key={i.id} className="text-sm">
                      <p>
                        {i.food_name}
                        {i.brand ? ` · ${i.brand}` : ""}{" "}
                        <span className="subtle">{fmt(i.grams)}g</span>
                      </p>
                      <p className="mt-1 text-xs subtle">
                        {fmt(i.calories)}kcal · 탄 {fmt(i.carbs_g)} / 단{" "}
                        {fmt(i.protein_g)} / 지 {fmt(i.fat_g)}g
                      </p>
                    </li>
                  ))}
                </ul>
                {!m.meal_items.length && (
                  <p className="mt-2 text-xs subtle">등록된 음식이 없습니다.</p>
                )}
              </div>
            ))}
          </section>
          <section className="card" aria-label="날짜별 운동">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold">운동</h3>
              <Link
                href={`/workout?date=${date}`}
                className="text-sm font-semibold text-blue-600"
              >
                운동 등록·수정 →
              </Link>
            </div>
            {!sessions.length && (
              <p className="mt-4 text-sm subtle">
                {enabled
                  ? "이 날짜의 운동 기록이 없습니다."
                  : "Supabase 연결 후 기록을 조회합니다."}
              </p>
            )}
            {sessions.map((s, i) => (
              <div
                key={s.id}
                className="mt-4 border-t border-[var(--border)] pt-4"
              >
                <Link
                  href={`/workout?date=${date}&session=${s.id}`}
                  className="text-sm font-semibold text-blue-600"
                >
                  {i + 1}번째 운동 ·{" "}
                  {s.status === "completed" ? "완료" : "진행 중"}
                </Link>
                {s.routine_day_name && (
                  <p className="mt-1 text-xs subtle">{s.routine_day_name}</p>
                )}
                {[...s.workout_session_exercises]
                  .sort((a, b) => a.position - b.position)
                  .map((e) => (
                    <div key={e.id} className="mt-3">
                      <h4 className="text-sm font-bold">
                        {e.exercise_name}{" "}
                        <span className="text-xs font-normal subtle">
                          {e.muscle_group}
                        </span>
                      </h4>
                      <ul className="mt-2 space-y-2">
                        {[...e.workout_sets]
                          .sort((a, b) => a.set_number - b.set_number)
                          .map((st) => (
                            <li
                              key={st.id}
                              className="rounded-lg bg-[var(--muted)] p-2 text-xs leading-5"
                            >
                              <p>
                                {st.set_number}세트 · {setLabels[st.set_type]} ·{" "}
                                {st.weight_kg === null
                                  ? "중량 미입력"
                                  : `${fmt(st.weight_kg)}kg`}{" "}
                                ×{" "}
                                {st.reps === null
                                  ? "반복 미입력"
                                  : `${st.reps}회`}{" "}
                                · {st.completed ? "완료" : "미완료"}
                              </p>
                              {(st.effort_type !== "none" ||
                                st.rest_seconds !== null) && (
                                <p className="subtle">
                                  {st.effort_type !== "none"
                                    ? `${st.effort_type.toUpperCase()} ${st.effort_value ?? "미입력"}`
                                    : ""}
                                  {st.rest_seconds !== null
                                    ? ` · 휴식 ${st.rest_seconds}초`
                                    : ""}
                                </p>
                              )}
                            </li>
                          ))}
                      </ul>
                      {e.note && (
                        <p className="mt-2 whitespace-pre-wrap text-xs subtle">
                          {e.note}
                        </p>
                      )}
                    </div>
                  ))}
                {s.note && (
                  <p className="mt-3 whitespace-pre-wrap text-xs subtle">
                    {s.note}
                  </p>
                )}
              </div>
            ))}
          </section>
          <section className="card" aria-label="날짜별 체성분">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold">체성분</h3>
              <Button
                size="sm"
                disabled={!enabled || busy}
                onClick={() => {
                  setEditing(undefined);
                  open("body");
                }}
              >
                <Plus size={15} />새 측정 추가
              </Button>
            </div>
            {!bodies.length && (
              <p className="mt-4 text-sm subtle">
                {enabled
                  ? "측정 기록이 없습니다. 측정하지 않은 값은 비워둘 수 있어요."
                  : "Supabase 연결 후 측정값을 저장합니다."}
              </p>
            )}
            {bodies.map((b, i) => (
              <article
                key={b.id}
                aria-label={`${i + 1}번째 측정`}
                className="mt-4 rounded-xl border border-[var(--border)] p-4"
              >
                <p className="text-xs subtle">
                  {i === 0 ? "그래프 기준 · 최근 등록 측정" : "추가 측정 기록"}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  {metrics.map((m) => (
                    <div key={m.key}>
                      <dt className="text-xs subtle">
                        {m.label}
                        {m.key === "fat_mass_kg" && b.fat_mass_source
                          ? ` · ${b.fat_mass_source === "calculated" ? "계산값" : "실측값"}`
                          : ""}
                      </dt>
                      <dd className="mt-1 font-semibold">
                        {display(b[m.key], m.unit)}
                      </dd>
                    </div>
                  ))}
                </dl>
                {b.note && (
                  <p className="mt-4 whitespace-pre-wrap text-sm subtle">
                    {b.note}
                  </p>
                )}
                <div className="mt-4 flex gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setEditing(b);
                      open("body");
                    }}
                  >
                    측정 수정
                  </Button>
                  <button
                    type="button"
                    className="min-h-10 text-sm text-red-500"
                    disabled={busy}
                    onClick={() => {
                      setDeleting({
                        kind: "body",
                        id: b.id,
                        version: b.version,
                      });
                      open("delete");
                    }}
                  >
                    측정 삭제
                  </button>
                </div>
              </article>
            ))}
          </section>
          <section className="card" aria-label="날짜별 컨디션">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold">컨디션</h3>
              <Button
                size="sm"
                variant="outline"
                disabled={!enabled || busy}
                onClick={() => open("condition")}
              >
                {condition ? "컨디션 수정" : "컨디션 기록"}
              </Button>
            </div>
            {!condition && (
              <p className="mt-4 text-sm subtle">
                {enabled
                  ? "아직 컨디션을 기록하지 않았습니다."
                  : "Supabase 연결 후 컨디션을 저장합니다."}
              </p>
            )}
            {condition && (
              <>
                <dl className="mt-4 grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "수면",
                      value:
                        condition.sleep_hours === null
                          ? "미입력"
                          : `${fmt(condition.sleep_hours)}시간`,
                    },
                    {
                      label: "피로도",
                      value:
                        condition.fatigue === null
                          ? "미입력"
                          : `${condition.fatigue}/5`,
                    },
                    {
                      label: "운동 만족도",
                      value:
                        condition.workout_satisfaction === null
                          ? "미입력"
                          : `${condition.workout_satisfaction}/5`,
                    },
                    {
                      label: "통증 강도",
                      value:
                        condition.pain_intensity === null
                          ? "미입력"
                          : `${condition.pain_intensity}/10`,
                    },
                  ].map((f) => (
                    <div key={f.label}>
                      <dt className="text-xs subtle">{f.label}</dt>
                      <dd className="mt-1 font-semibold">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                {condition.pain_areas && (
                  <p className="mt-4 text-sm">
                    통증 부위 · {condition.pain_areas}
                  </p>
                )}
                {condition.note && (
                  <p className="mt-3 whitespace-pre-wrap text-sm subtle">
                    {condition.note}
                  </p>
                )}
                {(condition.energy !== null || condition.mood !== null) && (
                  <p className="mt-3 text-xs subtle">
                    기존 활력 {condition.energy ?? "미입력"} · 기분{" "}
                    {condition.mood ?? "미입력"}
                  </p>
                )}
                <button
                  type="button"
                  className="mt-4 min-h-10 text-sm text-red-500"
                  disabled={busy}
                  onClick={() => {
                    setDeleting({
                      kind: "condition",
                      id: condition.id,
                      version: condition.version,
                    });
                    open("delete");
                  }}
                >
                  컨디션 삭제
                </button>
              </>
            )}
          </section>
        </div>
      </div>
      {modal && (
        <DietDialog
          title={
            modal === "body"
              ? editing
                ? "체성분 수정"
                : "체성분 기록"
              : modal === "condition"
                ? "컨디션 기록"
                : "기록 삭제"
          }
          busy={busy}
          onClose={() => setModal(null)}
        >
          {result.error && (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-500"
            >
              {result.error}
            </p>
          )}
          {result.conflict && (
            <Button
              className="mb-4"
              variant="outline"
              onClick={() => {
                setModal(null);
                router.refresh();
              }}
            >
              최신 기록 불러오기
            </Button>
          )}
          {modal === "body" && (
            <BodyForm
              date={date}
              record={editing}
              busy={busy}
              onSave={(day, input) =>
                perform(
                  () =>
                    saveBody(
                      day,
                      input,
                      editing?.id || null,
                      editing?.version ?? null,
                    ),
                  day,
                )
              }
            />
          )}
          {modal === "condition" && (
            <ConditionForm
              date={date}
              record={condition}
              busy={busy}
              onSave={(input) =>
                perform(() =>
                  saveCondition(date, input, condition?.version ?? null),
                )
              }
            />
          )}
          {modal === "delete" && deleting && (
            <>
              <p className="mb-5 text-sm leading-6">
                이 {deleting.kind === "body" ? "측정" : "컨디션"} 기록을
                삭제할까요? 식단·운동 기록은 유지됩니다.
              </p>
              <Button
                className="bg-red-600 hover:bg-red-700"
                disabled={busy}
                onClick={() =>
                  perform(() =>
                    deleteWellness(
                      deleting.kind,
                      deleting.id,
                      deleting.version,
                    ),
                  )
                }
              >
                삭제 확인
              </Button>
            </>
          )}
        </DietDialog>
      )}
    </>
  );
}
