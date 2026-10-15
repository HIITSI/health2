import { z } from "zod";

export const setTypes = [
  "warmup",
  "top",
  "backoff",
  "working",
  "drop",
] as const;
export type SetType = (typeof setTypes)[number];
export const setLabels: Record<SetType, string> = {
  warmup: "워밍업",
  top: "탑세트",
  backoff: "백오프",
  working: "본세트",
  drop: "드롭세트",
};
const weight = z.number().finite().min(0).max(2000).nullable();
const reps = z.number().int().min(0).max(1000).nullable();
export const setInputSchema = z
  .object({
    weight_kg: weight,
    reps,
    set_type: z.enum(setTypes),
    effort_type: z.enum(["none", "rpe", "rir"]),
    effort_value: z.number().finite().min(0).max(10).nullable(),
    rest_seconds: z.number().int().min(0).max(3600).nullable(),
    completed: z.boolean(),
  })
  .refine(
    (d) =>
      !d.completed || (d.weight_kg !== null && d.reps !== null && d.reps >= 1),
    "완료할 세트의 중량과 1회 이상 반복을 입력하세요.",
  )
  .refine(
    (d) =>
      d.effort_type === "none" ||
      d.effort_value === null ||
      d.effort_type !== "rpe" ||
      d.effort_value >= 1,
    "RPE는 1~10을 입력하세요.",
  );
export const entryInputSchema = z.object({
  target_weight: weight,
  target_reps: reps,
  target_sets: z.number().int().min(1).max(100),
  note: z.string().max(2000),
});
export const exerciseSchema = z.object({
  name: z.string().trim().min(1, "운동명을 입력하세요.").max(120),
  muscle_group: z.string().trim().min(1, "운동 부위를 입력하세요.").max(80),
});
export const routineDaySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    is_rest: z.boolean(),
    exercises: z
      .array(
        z.object({
          exercise_id: z.uuid(),
          target_weight: weight,
          target_reps: reps,
          target_sets: z.number().int().min(1).max(100),
        }),
      )
      .max(50),
  })
  .refine(
    (d) => !d.is_rest || d.exercises.length === 0,
    "휴식일에는 운동 종목을 배치하지 마세요.",
  );
export const routineSchema = z.object({
  name: z.string().trim().min(1).max(120),
  days: z.array(routineDaySchema).min(1).max(60),
});
export type SetInput = z.infer<typeof setInputSchema>;
export type EntryInput = z.infer<typeof entryInputSchema>;
export type RoutineInput = z.infer<typeof routineSchema>;
export type Exercise = {
  id: string;
  name: string;
  muscle_group: string;
  default_rest_seconds?: number | null;
  settings_version?: number;
};
export type WorkoutSet = SetInput & {
  id: string;
  set_number: number;
  version: number;
  session_exercise_id: string;
  exercise_id: string;
  session_id: string;
};
export type Entry = EntryInput & {
  id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  position: number;
  version: number;
  workout_sets: WorkoutSet[];
};
export type Session = {
  version: number;
  id: string;
  session_date: string;
  status: "in_progress" | "completed";
  note: string;
  routine_id: string | null;
  routine_day_index: number | null;
  routine_day_name: string | null;
  routine_run_id: string | null;
  started_at: string;
  workout_session_exercises: Entry[];
};
export type RoutineExercise = {
  id: string;
  exercise_id: string;
  position: number;
  target_weight: number | null;
  target_reps: number | null;
  target_sets: number;
};
export type RoutineDay = {
  id: string;
  day_index: number;
  name: string;
  is_rest: boolean;
  routine_exercises: RoutineExercise[];
};
export type Routine = {
  id: string;
  name: string;
  cycle_length: number;
  version: number;
  workout_routine_days: RoutineDay[];
};
export type Progress = {
  user_id: string;
  routine_id: string;
  day_index: number;
  scheduled_date: string;
  revision: number;
  run_id: string;
};
export type PR = {
  exercise_id: string;
  max_weight: number | null;
  max_reps: number | null;
  estimated_1rm: number | null;
};
export type HistoryEntry = Entry & { session_date: string; session_id: string };
export function estimated1RM(weightKg: number, repetitions: number) {
  if (
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    !Number.isInteger(repetitions) ||
    repetitions < 1 ||
    repetitions > 10
  )
    return null;
  return repetitions === 1 ? weightKg : weightKg * (1 + repetitions / 30);
}
export function nextDay(
  index: number,
  length: number,
  action: "complete" | "rest" | "skip" | "postpone",
) {
  if (
    !Number.isInteger(index) ||
    !Number.isInteger(length) ||
    length < 1 ||
    length > 60 ||
    index < 1 ||
    index > length
  )
    throw new Error("Invalid cycle");
  return action === "postpone" ? index : (index % length) + 1;
}
export function increases(now: WorkoutSet, previous: WorkoutSet | undefined) {
  if (
    !now.completed ||
    !previous ||
    !previous.completed ||
    now.weight_kg === null ||
    now.reps === null ||
    previous.weight_kg === null ||
    previous.reps === null
  )
    return null;
  return {
    weight: now.weight_kg - previous.weight_kg,
    reps: now.weight_kg === previous.weight_kg ? now.reps - previous.reps : 0,
  };
}
export function previousEntry(
  history: HistoryEntry[],
  exerciseId: string,
  sessionId: string,
) {
  return history.find(
    (e) => e.exercise_id === exerciseId && e.session_id !== sessionId,
  );
}
export const exampleDays = [
  "가슴 + 등 + 삼두",
  "하체 전면",
  "어깨 + 팔",
  "휴식",
  "가슴 + 삼두",
  "등",
  "하체 후면",
  "휴식",
].map((name) => ({ name, is_rest: name === "휴식", exercises: [] }));
