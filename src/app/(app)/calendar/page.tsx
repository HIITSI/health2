import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";
import { dateSchema, koreaDate, type Meal } from "@/lib/diet/nutrition";
import {
  monthBounds,
  type BodyRecord,
  type ConditionRecord,
  type DaySummary,
} from "@/lib/wellness/model";
import type { Session } from "@/lib/workout/model";
import { CalendarDashboard } from "@/components/wellness/calendar";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  if (!params.date) redirect(`/calendar?date=${koreaDate()}`);
  const parsed = dateSchema.safeParse(params.date);
  if (!parsed.success)
    return (
      <section className="card">
        <h1>올바른 날짜를 선택하세요.</h1>
        <a href="/calendar">오늘 캘린더로 이동</a>
      </section>
    );
  const date = parsed.data,
    client = await supabase();
  let summary: DaySummary[] = [],
    meals: Meal[] = [],
    sessions: Session[] = [],
    bodies: BodyRecord[] = [],
    condition: ConditionRecord | null = null,
    plannedRest: string | null = null;
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) redirect("/login");
    const results = await Promise.all([
      client.rpc("wellness_calendar_month", {
        p_month: monthBounds(date).start,
      }),
      client
        .from("meal_records")
        .select("id,meal_date,meal_type,meal_items(*)")
        .eq("user_id", user.id)
        .eq("meal_date", date)
        .order("created_at"),
      client
        .from("workout_sessions")
        .select(
          "*,workout_session_exercises(*,workout_sets!workout_sets_user_id_session_id_session_exercise_id_fkey(*))",
        )
        .eq("user_id", user.id)
        .eq("session_date", date)
        .order("started_at"),
      client
        .from("body_measurements")
        .select("*")
        .eq("user_id", user.id)
        .eq("measured_date", date)
        .order("created_at", { ascending: false })
        .order("measured_at", { ascending: false })
        .order("id", { ascending: false }),
      client
        .from("condition_records")
        .select("*")
        .eq("user_id", user.id)
        .eq("recorded_on", date)
        .maybeSingle(),
      client
        .from("workout_routine_progress")
        .select(
          "scheduled_date,day_index,workout_routines(workout_routine_days(day_index,is_rest))",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (results.some((r) => r.error))
      return (
        <>
          <h1 className="text-3xl font-bold">캘린더</h1>
          <p role="alert" className="card mt-6 text-red-500">
            기록을 조회하지 못했습니다. 4단계 마이그레이션과 연결을 확인하세요.
            조회 오류를 빈 기록으로 표시하지 않습니다.
          </p>
          <a
            className="mt-4 block text-blue-600"
            href={`/calendar?date=${date}`}
          >
            다시 조회
          </a>
        </>
      );
    summary = results[0].data as DaySummary[];
    meals = results[1].data as Meal[];
    sessions = results[2].data as Session[];
    bodies = results[3].data as BodyRecord[];
    condition = results[4].data as ConditionRecord | null;
    const p = results[5].data as unknown as {
      scheduled_date: string;
      day_index: number;
      workout_routines: {
        workout_routine_days: { day_index: number; is_rest: boolean }[];
      };
    } | null;
    if (
      p?.workout_routines?.workout_routine_days.some(
        (d) => d.day_index === p.day_index && d.is_rest,
      )
    )
      plannedRest = p.scheduled_date;
  }
  return (
    <CalendarDashboard
      key={date}
      date={date}
      today={koreaDate()}
      summary={summary}
      meals={meals}
      sessions={sessions}
      bodies={bodies}
      condition={condition}
      plannedRest={plannedRest}
      enabled={!!client}
    />
  );
}
