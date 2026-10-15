import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";
import { dateSchema, koreaDate } from "@/lib/diet/nutrition";
import type {
  Exercise,
  Session,
  Routine,
  Progress,
  PR,
  HistoryEntry,
} from "@/lib/workout/model";
import { WorkoutDashboard } from "@/components/workout/dashboard";
export default async function Workout({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; session?: string }>;
}) {
  const params = await searchParams;
  if (!params.date) redirect(`/workout?date=${koreaDate()}`);
  const date = dateSchema.safeParse(params.date);
  if (!date.success)
    return (
      <section className="card">
        <h1>올바른 날짜를 선택하세요.</h1>
        <a href="/workout">오늘 운동으로 이동</a>
      </section>
    );
  const client = await supabase();
  let userId = "";
  let exercises: Exercise[] = [];
  let sessions: Session[] = [];
  let routines: Routine[] = [];
  let progress: Progress | null = null;
  let prs: PR[] = [];
  let history: HistoryEntry[] = [];
  let events: {
    id: string;
    day_index: number;
    scheduled_date: string;
    action: string;
  }[] = [];
  let error = false;
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) redirect("/login");
    userId = user.id;
    const results = await Promise.all([
      client
        .from("exercises")
        .select("id,name,muscle_group,default_rest_seconds,settings_version")
        .eq("user_id", user.id)
        .order("name"),
      client
        .from("workout_sessions")
        .select(
          "*,workout_session_exercises(*,workout_sets!workout_sets_user_id_session_id_session_exercise_id_fkey(*))",
        )
        .eq("user_id", user.id)
        .eq("session_date", date.data)
        .order("started_at"),
      client
        .from("workout_routines")
        .select(
          "id,name,cycle_length,version,workout_routine_days(*,routine_exercises(*))",
        )
        .eq("user_id", user.id)
        .order("created_at"),
      client
        .from("workout_routine_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      client
        .from("exercise_prs")
        .select("exercise_id,max_weight,max_reps,estimated_1rm")
        .eq("user_id", user.id),
      client.rpc("workout_history", { p_date: date.data }),
      client
        .from("workout_routine_events")
        .select("id,day_index,scheduled_date,action")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    error = results.some((r) => !!r.error);
    if (!error) {
      exercises = results[0].data as Exercise[];
      sessions = results[1].data as Session[];
      routines = results[2].data as Routine[];
      progress = results[3].data as Progress | null;
      prs = results[4].data as PR[];
      history = results[5].data as HistoryEntry[];
      events = results[6].data as typeof events;
    }
  }
  return (
    <>
      <p className="text-sm subtle">STRENGTH JOURNAL</p>
      <h1 className="mt-3 text-3xl font-bold">운동</h1>
      <p className="mt-3 subtle">지난 기록에서, 오늘의 한 세트까지</p>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-500/10 p-4 text-red-500"
        >
          운동 데이터를 조회하지 못했습니다. 3단계 마이그레이션과 연결을
          확인하세요. 빈 기록으로 간주하지 않습니다.
        </p>
      )}
      <WorkoutDashboard
        key={`${date.data}:${params.session || ""}`}
        date={date.data}
        initialSession={params.session}
        userId={userId}
        exercises={exercises}
        sessions={sessions}
        routines={routines}
        progress={progress}
        prs={prs}
        history={history}
        events={events}
        enabled={!!client && !error}
      />
    </>
  );
}
