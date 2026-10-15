"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DietDialog as WorkoutDialog } from "@/components/diet/dialog";
import { SetEditor, EntryTargets, SessionNote } from "./editors";
import { RestTimer, type RestStart } from "@/components/service/rest-timer";
import { ExerciseRest } from "@/components/service/exercise-rest";
import { RoutineEditor } from "./routine-editor";
import {
  createExercise,
  startSession,
  addExercise,
  addSet,
  removeSet,
  removeEntry,
  removeSession,
  reorder,
  finishSession,
  saveRoutine,
  removeRoutine,
  activateRoutine,
  advanceRoutine,
  searchWorkoutRecords,
  type WorkoutResult,
} from "@/app/(app)/workout/actions";
import {
  setLabels,
  previousEntry,
  type Exercise,
  type Session,
  type Routine,
  type Progress,
  type PR,
  type HistoryEntry,
  type RoutineInput,
} from "@/lib/workout/model";
import { fmt, shiftDate } from "@/lib/diet/nutrition";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Dumbbell,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
type DeleteTarget = {
  kind: "set" | "entry" | "session" | "routine";
  id: string;
  label: string;
};
type SearchRow = {
  id: string;
  exercise_name: string;
  muscle_group: string;
  workout_sessions: { id: string; session_date: string; status: string };
  workout_sets: {
    weight_kg: number | null;
    reps: number | null;
    set_type: keyof typeof setLabels;
    completed: boolean;
  }[];
};
export function WorkoutDashboard({
  date,
  userId,
  initialSession,
  exercises,
  sessions,
  routines,
  progress,
  prs,
  history,
  events,
  enabled,
}: {
  date: string;
  userId: string;
  initialSession?: string;
  exercises: Exercise[];
  sessions: Session[];
  routines: Routine[];
  progress: Progress | null;
  prs: PR[];
  history: HistoryEntry[];
  events: {
    id: string;
    day_index: number;
    scheduled_date: string;
    action: string;
  }[];
  enabled: boolean;
}) {
  const router = useRouter();
  const chooseSession = (id: string) => {
    setSelectedId(id);
    router.replace(`/workout?date=${date}&session=${id}`, { scroll: false });
  };
  const [selectedId, setSelectedId] = useState(
    initialSession || sessions.at(-1)?.id || "",
  );
  const session = sessions.find((s) => s.id === selectedId) || sessions.at(-1);
  const entries = session
    ? [...session.workout_session_exercises].sort(
        (a, b) => a.position - b.position,
      )
    : [];
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [busy, startTransition] = useTransition();
  const blocked = busy || pendingIds.size > 0;
  const onPending = useCallback(
    (id: string, pending: boolean) =>
      setPendingIds((prev) => {
        if (prev.has(id) === pending) return prev;
        const next = new Set(prev);
        if (pending) next.add(id);
        else next.delete(id);
        return next;
      }),
    [],
  );
  const [modal, setModal] = useState<
    | "exercise"
    | "pick"
    | "routines"
    | "routine"
    | "activate"
    | "advance"
    | "delete"
    | "search"
    | null
  >(null);
  const [message, setMessage] = useState<WorkoutResult>({});
  const [exerciseName, setExerciseName] = useState("");
  const [muscle, setMuscle] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Exercise | null>(null);
  const [routineEditing, setRoutineEditing] = useState<Routine | undefined>();
  const [routineSelected, setRoutineSelected] = useState<Routine | null>(null);
  const [startDate, setStartDate] = useState(date);
  const [advance, setAdvance] = useState<
    "complete" | "rest" | "skip" | "postpone"
  >("complete");
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [searchRows, setSearchRows] = useState<SearchRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [restSignal, setRestSignal] = useState<RestStart | null>(null);
  const [restDefaults, setRestDefaults] = useState<
    Record<string, { seconds: number | null; version: number }>
  >({});
  const active = routines.find((r) => r.id === progress?.routine_id);
  const day = active?.workout_routine_days.find(
    (d) => d.day_index === progress?.day_index,
  );
  const allSets = entries.flatMap((e) => e.workout_sets);
  const completeSets = allSets.filter((s) => s.completed);
  const canFinish =
    entries.length > 0 &&
    allSets.length > 0 &&
    entries.every((e) => e.workout_sets.length > 0) &&
    allSets.every(
      (s) =>
        s.completed && s.weight_kg !== null && s.reps !== null && s.reps > 0,
    );
  const canAdvance =
    progress &&
    sessions.some(
      (s) =>
        s.routine_id === progress.routine_id &&
        s.routine_run_id === progress.run_id &&
        s.routine_day_index === progress.day_index &&
        s.session_date === progress.scheduled_date &&
        s.status === "completed",
    );
  const prior = picked
    ? previousEntry(history, picked.id, session?.id || "")
    : null;
  function open(kind: typeof modal) {
    setMessage({});
    setModal(kind);
  }
  function perform(
    operation: () => Promise<WorkoutResult>,
    close = true,
    onSuccess?: (result: WorkoutResult) => void,
  ) {
    if (blocked || !enabled) return;
    setMessage({});
    startTransition(async () => {
      const r = await operation();
      setMessage(r);
      if (r.success) {
        onSuccess?.(r);
        if (close) setModal(null);
      }
    });
  }
  function clearDrafts(ids: string[]) {
    try {
      for (const id of ids)
        for (const kind of ["set", "entry", "session"])
          localStorage.removeItem(`fitlog:workout:${userId}:${kind}:${id}`);
    } catch {}
  }
  function confirmDelete(target: DeleteTarget) {
    setDeleting(target);
    open("delete");
  }
  function deleteAction() {
    if (!deleting) return;
    const { kind, id } = deleting;
    const erase =
      kind === "set"
        ? () => removeSet(id)
        : kind === "entry"
          ? () => removeEntry(id)
          : kind === "routine"
            ? () => removeRoutine(id)
            : () => removeSession(id);
    perform(erase, true, () => {
      const ids = [id];
      if (kind === "entry") {
        const e = entries.find((x) => x.id === id);
        ids.push(...(e?.workout_sets.map((s) => s.id) || []));
      }
      if (kind === "session")
        ids.push(
          ...entries.flatMap((e) => [e.id, ...e.workout_sets.map((s) => s.id)]),
        );
      clearDrafts(ids);
      if (kind === "session") setSelectedId("");
    });
  }
  function move(index: number, delta: number) {
    if (!session) return;
    const list = entries.map((e) => e.id);
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    perform(() => reorder(session.id, list), false);
  }
  function editRoutine(r?: Routine) {
    setRoutineEditing(r);
    open("routine");
  }
  return (
    <>
      {userId && <RestTimer userId={userId} signal={restSignal} />}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:w-auto">
          <Link
            aria-label="이전 운동 날짜"
            href={`/workout?date=${shiftDate(date, -1)}`}
            className="rounded-lg border border-[var(--border)] p-2"
          >
            <ChevronLeft size={20} />
          </Link>
          <form
            action="/workout"
            method="get"
            className="flex items-center gap-2"
          >
            <label className="sr-only" htmlFor="workout-date">
              운동 날짜
            </label>
            <input
              id="workout-date"
              type="date"
              name="date"
              min="1900-01-01"
              max="2100-12-31"
              defaultValue={date}
              className="min-w-0 max-w-44 flex-1 text-sm"
              required
            />
            <Button size="sm" variant="outline">
              조회
            </Button>
          </form>
          <Link
            aria-label="다음 운동 날짜"
            href={`/workout?date=${shiftDate(date, 1)}`}
            className="rounded-lg border border-[var(--border)] p-2"
          >
            <ChevronRight size={20} />
          </Link>
        </div>
        <p className="text-xs subtle">
          한국 날짜 · 중량 kg · 완료한 세트만 수행량에 포함
        </p>
      </div>
      {!modal && message.error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-500"
        >
          {message.error}
        </p>
      )}
      {!modal && message.success && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-600"
        >
          {message.success}
        </p>
      )}
      <section className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">나의 루틴 일정</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={!enabled || blocked}
            onClick={() => open("routines")}
          >
            루틴 관리
          </Button>
        </div>
        {progress && active && day ? (
          <>
            <p
              className="mt-4 text-xl font-bold"
              data-testid="routine-progress"
            >
              {active.name} · {progress.day_index}/{active.cycle_length}일차
            </p>
            <p className="mt-2 text-sm subtle">
              {progress.scheduled_date} · {day.name}{" "}
              {day.is_rest ? "(휴식)" : ""}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {progress.scheduled_date !== date && (
                <Button variant="outline" asChild>
                  <Link href={`/workout?date=${progress.scheduled_date}`}>
                    예정 날짜로 이동
                  </Link>
                </Button>
              )}
              <Button
                disabled={
                  !enabled ||
                  blocked ||
                  day.is_rest ||
                  progress.scheduled_date !== date
                }
                onClick={() =>
                  perform(
                    () => startSession(date, true),
                    false,
                    (r) => {
                      if (r.id) chooseSession(r.id);
                    },
                  )
                }
              >
                오늘 루틴으로 기록 시작
              </Button>
              <Button
                variant="outline"
                disabled={blocked || !canAdvance}
                onClick={() => {
                  setAdvance("complete");
                  open("advance");
                }}
              >
                완료 후 다음 일정
              </Button>
              <Button
                variant="outline"
                disabled={blocked || !day.is_rest}
                onClick={() => {
                  setAdvance("rest");
                  open("advance");
                }}
              >
                휴식일 완료
              </Button>
              <Button
                variant="outline"
                disabled={blocked}
                onClick={() => {
                  setAdvance("postpone");
                  open("advance");
                }}
              >
                순서 유지 · 다음날 연기
              </Button>
              <Button
                variant="outline"
                disabled={blocked}
                onClick={() => {
                  setAdvance("skip");
                  open("advance");
                }}
              >
                이번 일정 건너뛰기
              </Button>
            </div>
            <p className="mt-4 text-xs leading-5 subtle">
              운동 완료와 다음 일정 이동은 별도입니다. 연기는 같은 일차를 다음
              날짜로 이월하고, 건너뛰기는 다음 일차로 이동합니다. 수행 기록은
              원래 날짜에 보존됩니다.
            </p>
          </>
        ) : (
          <p className="mt-5 text-sm subtle">
            {enabled
              ? "활성 루틴이 없습니다. 자유 주기 루틴을 만들고 시작 날짜를 지정하세요."
              : "로그인 후 루틴을 관리할 수 있습니다."}
          </p>
        )}
      </section>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          disabled={!enabled || blocked}
          onClick={() =>
            perform(
              () => startSession(date, false),
              false,
              (r) => {
                if (r.id) chooseSession(r.id);
              },
            )
          }
        >
          <Plus size={16} />새 운동 기록
        </Button>
        <Button
          variant="outline"
          disabled={!enabled || blocked}
          onClick={() => {
            setExerciseName("");
            setMuscle("");
            open("exercise");
          }}
        >
          운동 종목 직접 추가
        </Button>
        <Button
          variant="outline"
          disabled={!enabled || blocked}
          onClick={() => {
            setQuery("");
            setSearchRows([]);
            setSearched(false);
            open("search");
          }}
        >
          <Search size={16} />
          운동 기록 검색
        </Button>
      </div>
      {pendingIds.size > 0 && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-600"
        >
          자동 저장 대기 {pendingIds.size}건 · DB 저장 완료 후 운동을 완료하거나
          기록을 삭제할 수 있습니다.
        </p>
      )}
      {session ? (
        <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <label htmlFor="session-select">선택한 운동 기록</label>
              <select
                id="session-select"
                value={session.id}
                disabled={blocked}
                onChange={(e) => chooseSession(e.target.value)}
              >
                {sessions.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {i + 1}번째 운동 ·{" "}
                    {s.status === "completed" ? "완료" : "진행 중"}{" "}
                    {s.routine_day_name ? `· ${s.routine_day_name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <span
              className={`rounded-full px-3 py-2 text-xs ${session.status === "completed" ? "bg-blue-500/10 text-blue-600" : "bg-[var(--muted)] subtle"}`}
              data-testid="session-status"
            >
              {session.status === "completed" ? "운동 완료" : "운동 진행 중"}
            </span>
          </div>
          <section className="mt-5 grid grid-cols-3 gap-3">
            <article className="card !p-4">
              <p className="text-xs subtle">운동 종목</p>
              <p className="mt-3 text-2xl font-bold">{entries.length}</p>
            </article>
            <article className="card !p-4">
              <p className="text-xs subtle">완료 / 전체 세트</p>
              <p className="mt-3 text-2xl font-bold">
                {completeSets.length}
                <span className="text-sm subtle"> / {allSets.length}</span>
              </p>
            </article>
            <article className="card !p-4">
              <p className="text-xs subtle">본세트 외부중량 볼륨</p>
              <p className="mt-3 text-xl font-bold">
                {fmt(
                  completeSets
                    .filter((s) => s.set_type !== "warmup")
                    .reduce(
                      (n, s) => n + (s.weight_kg || 0) * (s.reps || 0),
                      0,
                    ),
                )}
                <span className="text-xs subtle"> kg</span>
              </p>
            </article>
          </section>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              disabled={blocked}
              onClick={() => {
                setQuery("");
                setPicked(null);
                open("pick");
              }}
            >
              <Dumbbell size={16} />
              기록에 종목 추가
            </Button>
            <Button
              variant="outline"
              disabled={blocked || !canFinish || session.status === "completed"}
              onClick={() => perform(() => finishSession(session.id), false)}
            >
              {session.status === "completed"
                ? "운동 완료됨"
                : "운동 완료 체크"}
            </Button>
            <Button
              variant="outline"
              disabled={blocked}
              onClick={() =>
                confirmDelete({
                  kind: "session",
                  id: session.id,
                  label: `${date} 운동 기록 전체`,
                })
              }
            >
              운동 기록 삭제
            </Button>
          </div>
          <div className="mt-6 space-y-6">
            {entries.map((entry, index) => {
              const last = previousEntry(
                history,
                entry.exercise_id,
                session.id,
              );
              const pr = prs.find((p) => p.exercise_id === entry.exercise_id);
              const sets = [...entry.workout_sets].sort(
                (a, b) => a.set_number - b.set_number,
              );
              return (
                <section
                  key={entry.id}
                  className="card !p-4 sm:!p-6"
                  aria-label={`${entry.exercise_name} 운동`}
                >
                  <header className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="break-words text-xl font-bold">
                        {index + 1}. {entry.exercise_name}
                      </h2>
                      <p className="mt-2 text-sm subtle">
                        {entry.muscle_group}
                      </p>
                      <p className="mt-2 text-xs subtle">
                        목표{" "}
                        {entry.target_weight === null
                          ? "—"
                          : fmt(entry.target_weight)}
                        kg × {entry.target_reps ?? "—"}회 · {entry.target_sets}
                        세트
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        aria-label={`${entry.exercise_name} 순서 올림`}
                        className="min-h-11 p-2"
                        disabled={blocked || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp size={17} />
                      </button>
                      <button
                        aria-label={`${entry.exercise_name} 순서 내림`}
                        className="min-h-11 p-2"
                        disabled={blocked || index === entries.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown size={17} />
                      </button>
                      <button
                        className="min-h-11 px-2 text-xs text-red-500"
                        disabled={blocked}
                        onClick={() =>
                          confirmDelete({
                            kind: "entry",
                            id: entry.id,
                            label: entry.exercise_name,
                          })
                        }
                      >
                        삭제
                      </button>
                    </div>
                  </header>
                  {last ? (
                    <div className="mt-4 rounded-xl bg-blue-500/5 p-3 text-xs leading-6">
                      <p className="font-semibold text-blue-600">
                        지난 운동 · {last.session_date}
                      </p>
                      {last.workout_sets.map((s) => (
                        <p key={s.id}>
                          {s.set_number}세트 {setLabels[s.set_type]} ·{" "}
                          {s.weight_kg === null ? "—" : fmt(s.weight_kg)}kg ×{" "}
                          {s.reps ?? "—"}회
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs subtle">
                      이 종목의 이전 완료 기록이 없습니다.
                    </p>
                  )}
                  {pr && (
                    <div
                      className="mt-3 rounded-xl bg-[var(--muted)] p-3 text-xs leading-6"
                      data-testid={`pr-${entry.exercise_id}`}
                    >
                      <p className="font-semibold">
                        개인 기록 · 완료된 운동의 본세트
                      </p>
                      <p>
                        최고 중량{" "}
                        {pr.max_weight === null ? "—" : fmt(pr.max_weight)}kg ·
                        최고 반복 {pr.max_reps ?? "—"}회 · 추정 1RM{" "}
                        {pr.estimated_1rm === null
                          ? "—"
                          : `${fmt(pr.estimated_1rm)}kg`}
                      </p>
                      <p className="subtle">
                        Epley 2~10회 추정, 1회는 기록 중량. 워밍업 제외 · 실제
                        1RM과 다를 수 있습니다.
                      </p>
                    </div>
                  )}
                  <EntryTargets
                    entry={entry}
                    userId={userId}
                    onPending={onPending}
                  />
                  {exercises.find((e) => e.id === entry.exercise_id) && (
                    <ExerciseRest
                      exercise={exercises.find(
                        (e) => e.id === entry.exercise_id,
                      )!}
                      enabled={enabled && !blocked}
                      onSaved={(seconds, version) =>
                        setRestDefaults((d) => ({
                          ...d,
                          [entry.exercise_id]: { seconds, version },
                        }))
                      }
                    />
                  )}
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {sets.map((s) => {
                      const past =
                        last?.workout_sets.find(
                          (p) =>
                            p.set_number === s.set_number &&
                            p.set_type === s.set_type,
                        ) ||
                        last?.workout_sets.find(
                          (p) => p.set_type === s.set_type,
                        );
                      return (
                        <SetEditor
                          key={s.id}
                          row={s}
                          userId={userId}
                          previous={past}
                          onPending={onPending}
                          disabled={busy}
                          mutationsDisabled={blocked}
                          onCompleted={(seconds) => {
                            const ex = exercises.find(
                                (e) => e.id === entry.exercise_id,
                              ),
                              local = restDefaults[entry.exercise_id];
                            const defaultSeconds =
                              local &&
                              (ex?.settings_version || 0) < local.version
                                ? local.seconds
                                : ex?.default_rest_seconds;
                            const duration = seconds ?? defaultSeconds ?? 0;
                            if (duration > 0)
                              setRestSignal({
                                id: crypto.randomUUID(),
                                label: `${entry.exercise_name} ${s.set_number}세트`,
                                seconds: duration,
                              });
                          }}
                          onDuplicate={() =>
                            perform(() => addSet(entry.id, s.id), false)
                          }
                          onDelete={() =>
                            confirmDelete({
                              kind: "set",
                              id: s.id,
                              label: `${entry.exercise_name} ${s.set_number}세트`,
                            })
                          }
                        />
                      );
                    })}
                  </div>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    disabled={blocked}
                    onClick={() => perform(() => addSet(entry.id), false)}
                  >
                    + 세트 추가
                  </Button>
                </section>
              );
            })}
          </div>
          {!entries.length && (
            <section className="card mt-5 py-12 text-center subtle">
              종목을 추가해 첫 세트를 기록하세요.
            </section>
          )}
          <SessionNote
            key={session.id}
            id={session.id}
            version={session.version}
            note={session.note}
            userId={userId}
            onPending={onPending}
          />
        </>
      ) : (
        <section className="card mt-6 py-14 text-center">
          <Dumbbell className="mx-auto text-blue-500" size={32} />
          <p className="mt-4 font-semibold">
            아직 선택한 날짜의 운동 기록이 없어요.
          </p>
          <p className="mt-3 text-sm subtle">
            {enabled
              ? "새 운동 또는 루틴 기록을 시작하세요."
              : "Supabase 연결 및 로그인 후 기록할 수 있습니다."}
          </p>
        </section>
      )}
      {events.length > 0 && (
        <details className="card mt-6">
          <summary className="cursor-pointer font-semibold">
            최근 루틴 진행 이력
          </summary>
          <ul className="mt-4 space-y-2 text-xs subtle">
            {events.map((e) => (
              <li key={e.id}>
                {e.scheduled_date} · {e.day_index}일차 ·{" "}
                {
                  {
                    complete: "완료 후 이동",
                    rest: "휴식 완료",
                    skip: "건너뛰기",
                    postpone: "순서 유지 연기",
                  }[e.action]
                }
              </li>
            ))}
          </ul>
        </details>
      )}
      {modal && (
        <WorkoutDialog
          key={modal}
          title={
            {
              exercise: "운동 종목 직접 추가",
              pick: "운동 종목 선택",
              routines: "루틴 관리",
              routine: routineEditing ? "루틴 수정" : "새 루틴",
              activate: "루틴 시작",
              advance: "루틴 일정 변경",
              delete: "삭제 확인",
              search: "운동 기록 검색",
            }[modal]
          }
          onClose={() => setModal(null)}
          busy={busy}
        >
          {message.error && (
            <p role="alert" className="mb-4 text-sm text-red-500">
              {message.error}
            </p>
          )}
          {message.success && (
            <p role="status" className="mb-4 text-sm text-emerald-600">
              {message.success}
            </p>
          )}
          {modal === "exercise" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                perform(() =>
                  createExercise({ name: exerciseName, muscle_group: muscle }),
                );
              }}
            >
              <label htmlFor="exercise-name">운동 종목명</label>
              <input
                id="exercise-name"
                maxLength={120}
                required
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
              />
              <label htmlFor="muscle" className="mt-5">
                운동 부위
              </label>
              <input
                id="muscle"
                maxLength={80}
                list="muscle-groups"
                required
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
              />
              <datalist id="muscle-groups">
                {[
                  "가슴",
                  "등",
                  "하체 전면",
                  "하체 후면",
                  "어깨",
                  "이두",
                  "삼두",
                  "복근",
                  "전신",
                ].map((m) => (
                  <option value={m} key={m} />
                ))}
              </datalist>
              <Button className="mt-6 w-full" disabled={busy}>
                종목 등록
              </Button>
            </form>
          )}
          {modal === "pick" && session && (
            <>
              <label htmlFor="exercise-search">등록 종목 검색</label>
              <input
                id="exercise-search"
                placeholder="운동명 또는 부위"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="mt-4 max-h-52 space-y-2 overflow-y-auto">
                {exercises
                  .filter((ex) =>
                    `${ex.name} ${ex.muscle_group}`.includes(query.trim()),
                  )
                  .map((ex) => (
                    <button
                      key={ex.id}
                      className={`w-full rounded-xl border p-3 text-left text-sm ${picked?.id === ex.id ? "border-blue-500 bg-blue-500/10" : "border-[var(--border)]"}`}
                      onClick={() => setPicked(ex)}
                    >
                      {ex.name} · {ex.muscle_group}
                    </button>
                  ))}
              </div>
              {picked && (
                <>
                  <h3 className="mt-5 font-bold">{picked.name}</h3>
                  {prior ? (
                    <div className="mt-3 rounded-xl bg-[var(--muted)] p-3 text-xs leading-6">
                      <p>최근 완료 운동 · {prior.session_date}</p>
                      {prior.workout_sets.map((s) => (
                        <p key={s.id}>
                          {setLabels[s.set_type]}{" "}
                          {s.weight_kg === null ? "—" : fmt(s.weight_kg)}kg ×{" "}
                          {s.reps ?? "—"}회
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs subtle">
                      이전 완료 기록이 없습니다. 목표와 수행값을 직접
                      입력하세요.
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      disabled={busy}
                      onClick={() =>
                        perform(() => addExercise(session.id, picked.id, false))
                      }
                    >
                      빈 세트로 추가
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy || !prior}
                      onClick={() =>
                        perform(() => addExercise(session.id, picked.id, true))
                      }
                    >
                      지난 기록 복사해 추가
                    </Button>
                  </div>
                  <p className="mt-3 text-xs subtle">
                    지난 기록에서 목표를 가져옵니다. 복사한 세트는 미완료이며,
                    실제 강도와 완료 표시는 새로 입력합니다.
                  </p>
                </>
              )}
              <button
                className="mt-5 text-sm font-semibold text-blue-600"
                onClick={() => {
                  setExerciseName("");
                  setMuscle("");
                  open("exercise");
                }}
              >
                새 종목 직접 등록
              </button>
            </>
          )}
          {modal === "routines" && (
            <>
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => editRoutine()}
              >
                새 루틴 만들기
              </Button>
              <div className="mt-5 space-y-3">
                {routines.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-xl border border-[var(--border)] p-4"
                  >
                    <h3 className="font-bold">
                      {r.name} · {r.cycle_length}일 주기
                    </h3>
                    <ol className="mt-3 space-y-1 text-xs subtle">
                      {[...r.workout_routine_days]
                        .sort((a, b) => a.day_index - b.day_index)
                        .map((d) => (
                          <li key={d.id}>
                            {d.day_index}일차 · {d.name}
                            {d.is_rest
                              ? " · 휴식"
                              : ` · ${d.routine_exercises.length}종목`}
                          </li>
                        ))}
                    </ol>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          setRoutineSelected(r);
                          setStartDate(date);
                          open("activate");
                        }}
                        aria-label={`${r.name} 활성화`}
                      >
                        시작
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => editRoutine(r)}
                        aria-label={`${r.name} 수정`}
                      >
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          confirmDelete({
                            kind: "routine",
                            id: r.id,
                            label: r.name,
                          })
                        }
                        aria-label={`${r.name} 삭제`}
                      >
                        삭제
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {modal === "routine" && (
            <RoutineEditor
              routine={routineEditing}
              exercises={exercises}
              busy={busy}
              onSave={(input: RoutineInput) =>
                perform(() =>
                  saveRoutine(
                    input,
                    routineEditing?.id,
                    routineEditing?.version,
                  ),
                )
              }
            />
          )}
          {modal === "activate" && routineSelected && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                perform(() =>
                  activateRoutine(
                    routineSelected.id,
                    startDate,
                    progress?.revision ?? null,
                  ),
                );
              }}
            >
              <p className="mb-5 font-semibold">
                {routineSelected.name} · 1일차부터 시작
              </p>
              <label htmlFor="routine-start">루틴 시작 날짜</label>
              <input
                id="routine-start"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <p className="my-5 text-sm subtle">
                현재 활성 일정을 교체합니다. 기존 운동 기록과 이전 순환 이력은
                보존됩니다.
              </p>
              <Button disabled={busy}>루틴 활성화 확인</Button>
            </form>
          )}
          {modal === "advance" && progress && (
            <>
              <p className="text-sm leading-6">
                {progress.scheduled_date} · {progress.day_index}일차를{" "}
                {advance === "postpone"
                  ? "같은 순서로 다음 날짜에 이월"
                  : advance === "skip"
                    ? "건너뛰고 다음 일차로 이동"
                    : advance === "rest"
                      ? "휴식 완료 후 다음 일차로 이동"
                      : "운동 완료 후 다음 일차로 이동"}
                할까요?
              </p>
              <p className="my-5 text-xs subtle">
                이 작업은 루틴 일정만 변경하며 수행 기록은 원래 날짜에
                보존됩니다.
              </p>
              <Button
                disabled={busy}
                onClick={() =>
                  perform(() => advanceRoutine(advance, progress.revision))
                }
              >
                일정 변경 확인
              </Button>
            </>
          )}
          {modal === "delete" && deleting && (
            <>
              <p className="mb-5 text-sm leading-6">
                {deleting.label}을 삭제할까요?{" "}
                {deleting.kind === "routine"
                  ? "과거 수행 기록은 보존됩니다."
                  : "개인 최고 기록은 남은 수행 기록으로 다시 계산합니다."}
              </p>
              <Button
                className="bg-red-600 hover:bg-red-700"
                disabled={blocked}
                onClick={deleteAction}
              >
                삭제 확인
              </Button>
            </>
          )}
          {modal === "search" && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!query.trim()) return;
                  startTransition(async () => {
                    setMessage({});
                    const r = await searchWorkoutRecords(query);
                    setSearchRows(r.records as unknown as SearchRow[]);
                    setSearched(true);
                    if (r.error) setMessage({ error: r.error });
                  });
                }}
              >
                <label htmlFor="history-search">운동 기록 검색어</label>
                <div className="flex gap-2">
                  <input
                    id="history-search"
                    required
                    maxLength={120}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="기록 당시 종목명"
                  />
                  <Button disabled={busy}>검색</Button>
                </div>
              </form>
              <p className="my-4 text-xs subtle">
                날짜 전체에서 이름을 검색합니다. 최대 50건 · 최신 날짜 순.
              </p>
              <ul className="space-y-3">
                {searchRows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[var(--border)] p-3"
                  >
                    <Link
                      href={`/workout?date=${r.workout_sessions.session_date}&session=${r.workout_sessions.id}`}
                      onClick={() => setModal(null)}
                      className="font-semibold text-blue-600"
                    >
                      {r.exercise_name} · {r.workout_sessions.session_date}
                    </Link>
                    <p className="mt-2 text-xs subtle">
                      {r.muscle_group} ·{" "}
                      {r.workout_sessions.status === "completed"
                        ? "운동 완료"
                        : "진행 중"}{" "}
                      · 완료 세트{" "}
                      {r.workout_sets.filter((s) => s.completed).length}개
                    </p>
                  </li>
                ))}
              </ul>
              {searched && !searchRows.length && !message.error && (
                <p className="py-6 text-center text-sm subtle">
                  검색된 기록이 없습니다.
                </p>
              )}
            </>
          )}
        </WorkoutDialog>
      )}
    </>
  );
}
