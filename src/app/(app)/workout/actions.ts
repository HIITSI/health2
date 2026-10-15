"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";
import { dateSchema } from "@/lib/diet/nutrition";
import {
  exerciseSchema,
  setInputSchema,
  entryInputSchema,
  routineSchema,
} from "@/lib/workout/model";
export type WorkoutResult = {
  error?: string;
  success?: string;
  id?: string;
  row?: Record<string, unknown>;
  conflict?: boolean;
};
async function account() {
  const client = await supabase();
  if (!client) throw new Error("Supabase 연결 후 사용할 수 있습니다.");
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new Error("다시 로그인해 주세요.");
  return { client, user };
}
function check(error: { code?: string; message?: string } | null) {
  if (error) {
    if (error.code === "PT409")
      throw new Error(
        "다른 저장으로 기록이 변경되었습니다. 새로고침 후 최신 값을 확인하세요.",
      );
    if (error.message?.includes("Complete every"))
      throw new Error("모든 세트의 중량·반복을 입력하고 완료 표시를 해주세요.");
    if (error.message?.includes("Finish linked"))
      throw new Error("이 일정에 연결된 운동을 먼저 완료하세요.");
    throw new Error("저장하지 못했습니다. 연결·권한·입력값을 확인하세요.");
  }
}
async function run(
  operation: () => Promise<WorkoutResult>,
): Promise<WorkoutResult> {
  try {
    const result = await operation();
    revalidatePath("/workout");
    revalidatePath("/");
    revalidatePath("/analytics");
    return result;
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? /[가-힣]/.test(error.issues[0]?.message || "")
            ? error.issues[0].message
            : "입력값을 확인하세요. 중량 0~2,000kg, 반복 0~1,000회, 목표 세트 1~100개, 휴식 0~3,600초입니다."
          : error instanceof Error
            ? error.message
            : "요청을 처리하지 못했습니다.",
    };
  }
}
export async function createExercise(input: unknown) {
  return run(async () => {
    const data = exerciseSchema.parse(input);
    const { client, user } = await account();
    const r = await client
      .from("exercises")
      .insert({ ...data, category: "strength", user_id: user.id })
      .select("id")
      .single();
    check(r.error);
    return { success: "운동 종목을 등록했습니다.", id: r.data!.id };
  });
}
export async function startSession(date: string, routine = false) {
  return run(async () => {
    dateSchema.parse(date);
    z.boolean().parse(routine);
    const { client } = await account();
    const r = await client.rpc("workout_start_session", {
      p_date: date,
      p_use_routine: routine,
    });
    check(r.error);
    return { success: "운동 기록을 시작했습니다.", id: r.data };
  });
}
export async function addExercise(
  session: string,
  exercise: string,
  copy = false,
) {
  return run(async () => {
    z.uuid().parse(session);
    z.uuid().parse(exercise);
    z.boolean().parse(copy);
    const { client } = await account();
    const r = await client.rpc("workout_add_exercise", {
      p_session: session,
      p_exercise: exercise,
      p_copy: copy,
    });
    check(r.error);
    return {
      success: copy
        ? "지난 세트 입력값을 복사했습니다. 완료·RPE/RIR은 새로 입력하세요."
        : "운동을 추가했습니다.",
      id: r.data,
    };
  });
}
export async function saveWorkoutRow(
  kind: "set" | "entry" | "session",
  id: string,
  version: number,
  input: unknown,
): Promise<WorkoutResult> {
  return run(async () => {
    z.enum(["set", "entry", "session"]).parse(kind);
    z.uuid().parse(id);
    z.number().int().min(0).parse(version);
    const data =
      kind === "set"
        ? setInputSchema.parse(input)
        : kind === "entry"
          ? entryInputSchema.parse(input)
          : z.object({ note: z.string().max(2000) }).parse(input);
    const { client, user } = await account();
    const r = await client.rpc(
      kind === "set"
        ? "workout_save_set"
        : kind === "entry"
          ? "workout_save_entry"
          : "workout_save_session_note",
      { p_id: id, p_version: version, p_data: data },
    );
    if (r.error?.code === "PT409") {
      const latest = await client
        .from(
          kind === "set"
            ? "workout_sets"
            : kind === "entry"
              ? "workout_session_exercises"
              : "workout_sessions",
        )
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      return {
        error:
          "다른 기기나 저장에서 값이 변경되었습니다. 저장할 값을 선택하세요.",
        conflict: true,
        row: latest.data || undefined,
      };
    }
    check(r.error);
    const row = Array.isArray(r.data) ? r.data[0] : r.data;
    if (!row || !Number.isInteger(row.version))
      throw new Error("저장 결과를 확인하지 못했습니다. 새로고침해 주세요.");
    return { success: "DB 자동 저장 완료", row };
  });
}
export async function addSet(entry: string, copy?: string) {
  return run(async () => {
    z.uuid().parse(entry);
    if (copy) z.uuid().parse(copy);
    const { client } = await account();
    const r = await client.rpc("workout_add_set", {
      p_entry: entry,
      p_copy: copy || null,
    });
    check(r.error);
    return { success: "미완료 세트를 추가했습니다." };
  });
}
export async function removeSet(id: string) {
  return run(async () => {
    z.uuid().parse(id);
    const { client } = await account();
    const r = await client.rpc("workout_delete_set", { p_id: id });
    check(r.error);
    return { success: "세트를 삭제했습니다." };
  });
}
export async function removeEntry(id: string) {
  return run(async () => {
    z.uuid().parse(id);
    const { client, user } = await account();
    const r = await client
      .from("workout_session_exercises")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    check(r.error);
    return { success: "운동과 해당 세트를 삭제했습니다." };
  });
}
export async function removeSession(id: string) {
  return run(async () => {
    z.uuid().parse(id);
    const { client, user } = await account();
    const r = await client
      .from("workout_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    check(r.error);
    return {
      success: "운동 기록을 삭제했습니다. 루틴 진행 이력은 유지됩니다.",
    };
  });
}
export async function reorder(session: string, ids: string[]) {
  return run(async () => {
    z.uuid().parse(session);
    z.array(z.uuid()).max(100).parse(ids);
    const { client } = await account();
    const r = await client.rpc("workout_reorder", {
      p_session: session,
      p_ids: ids,
    });
    check(r.error);
    return { success: "운동 순서를 저장했습니다." };
  });
}
export async function finishSession(id: string) {
  return run(async () => {
    z.uuid().parse(id);
    const { client } = await account();
    const r = await client.rpc("workout_finish_session", { p_id: id });
    check(r.error);
    return { success: "운동을 완료했습니다." };
  });
}
export async function saveRoutine(
  input: unknown,
  id?: string,
  version?: number,
) {
  return run(async () => {
    const data = routineSchema.parse(input);
    if (id) z.uuid().parse(id);
    const { client } = await account();
    const r = await client.rpc("workout_save_routine", {
      p_id: id || null,
      p_version: version ?? null,
      p_name: data.name,
      p_days: data.days,
    });
    check(r.error);
    return {
      success: "루틴을 저장했습니다. 기존 수행 기록은 유지됩니다.",
      id: r.data,
    };
  });
}
export async function removeRoutine(id: string) {
  return run(async () => {
    z.uuid().parse(id);
    const { client, user } = await account();
    const r = await client
      .from("workout_routines")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    check(r.error);
    return { success: "루틴을 삭제했습니다. 기존 운동 기록은 유지됩니다." };
  });
}
export async function activateRoutine(
  id: string,
  date: string,
  revision: number | null,
) {
  return run(async () => {
    z.uuid().parse(id);
    dateSchema.parse(date);
    z.number().int().min(0).nullable().parse(revision);
    const { client } = await account();
    const r = await client.rpc("workout_activate_routine", {
      p_id: id,
      p_date: date,
      p_revision: revision,
    });
    check(r.error);
    return { success: "선택한 날짜부터 루틴 1일차를 시작합니다." };
  });
}
export async function advanceRoutine(
  action: "complete" | "rest" | "skip" | "postpone",
  revision: number,
) {
  return run(async () => {
    z.enum(["complete", "rest", "skip", "postpone"]).parse(action);
    z.number().int().min(0).parse(revision);
    const { client } = await account();
    const r = await client.rpc("workout_advance", {
      p_action: action,
      p_revision: revision,
    });
    check(r.error);
    return {
      success:
        action === "postpone"
          ? "순서를 유지하고 일정을 다음 날짜로 연기했습니다. 수행 기록은 변경하지 않았습니다."
          : "다음 루틴 일정으로 이동했습니다.",
    };
  });
}
export async function searchWorkoutRecords(query: string) {
  try {
    const q = z.string().trim().min(1).max(120).parse(query);
    const { client, user } = await account();
    const pattern = q.replace(/[\\%_]/g, "\\$&");
    const r = await client
      .from("workout_session_exercises")
      .select(
        "id,exercise_name,muscle_group,workout_sessions!inner(id,session_date,status),workout_sets!workout_sets_user_id_session_id_session_exercise_id_fkey(weight_kg,reps,set_type,completed)",
      )
      .eq("user_id", user.id)
      .ilike("exercise_name", `%${pattern}%`)
      .order("workout_sessions(session_date)", {
        ascending: false,
      })
      .limit(50);
    check(r.error);
    return { records: r.data, error: "" };
  } catch {
    return {
      records: [],
      error: "검색하지 못했습니다. 검색어와 연결 상태를 확인하세요.",
    };
  }
}
