import { redirect } from "next/navigation";
import { z } from "zod";
import { supabase } from "@/lib/supabase/server";
import { koreaDate, dateSchema } from "@/lib/diet/nutrition";
import { rangeSchema } from "@/lib/wellness/model";
import { emptyAnalysis, type AnalysisData } from "@/lib/analysis/model";
import { BodyCharts } from "@/components/wellness/charts";
import { GoalControl } from "@/components/analysis/goals";
import {
  AnalysisNavigation,
  PeriodControls,
} from "@/components/analysis/controls";
import { NutritionAnalysis } from "@/components/analysis/nutrition";
import { WorkoutAnalysis } from "@/components/analysis/workout";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    end?: string;
    range?: string;
    tab?: string;
    exercise?: string;
  }>;
}) {
  const params = await searchParams;
  const tab = z
      .enum(["body", "nutrition", "workout"])
      .safeParse(params.tab || "body"),
    exercise = params.exercise ? z.uuid().safeParse(params.exercise) : null;
  if (!tab.success || (exercise && !exercise.success))
    return (
      <section className="card">
        <h1>올바른 분석 종류와 종목을 선택하세요.</h1>
        <a href="/analytics">분석으로 이동</a>
      </section>
    );
  if (!params.end)
    redirect(
      `/analytics?end=${koreaDate()}&range=${rangeSchema.safeParse(params.range).success ? params.range : "30"}&tab=${tab.data}${exercise?.success ? `&exercise=${exercise.data}` : ""}`,
    );
  const date = dateSchema.safeParse(params.end),
    range = rangeSchema.safeParse(params.range || "30");
  if (!date.success || !range.success)
    return (
      <section className="card">
        <h1>올바른 날짜와 기간을 선택하세요.</h1>
        <a href="/analytics">오늘 기준 분석으로 이동</a>
      </section>
    );
  const client = await supabase();
  let data = emptyAnalysis();
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) redirect("/login");
    const r = await client.rpc("analysis_period", {
      p_end: date.data,
      p_range: range.data,
      p_exercise:
        tab.data === "workout" && exercise?.success ? exercise.data : null,
    });
    if (r.error)
      return (
        <>
          <h1 className="text-3xl font-bold">분석</h1>
          <p role="alert" className="card mt-6 text-red-500">
            분석 데이터를 조회하지 못했습니다. 5단계 마이그레이션·연결·종목 접근
            권한을 확인하세요. 조회 오류를 빈 기록으로 표시하지 않습니다.
          </p>
          <a className="mt-4 block text-blue-600" href="/analytics">
            다시 조회
          </a>
        </>
      );
    data = r.data as AnalysisData;
  }
  const nav = (
    <AnalysisNavigation end={date.data} range={range.data} tab={tab.data} />
  );
  const goal = <GoalControl goal={data.current_goal} enabled={!!client} />;
  if (tab.data === "body")
    return (
      <BodyCharts
        key={`${date.data}:${range.data}`}
        rows={data.body}
        end={date.data}
        range={range.data}
        enabled={!!client}
        toolbar={
          <>
            {nav}
            {goal}
          </>
        }
      />
    );
  return (
    <>
      <p className="text-sm subtle">MY PROGRESS</p>
      <h1 className="mt-3 text-3xl font-bold">분석</h1>
      <p className="mt-3 subtle">
        {tab.data === "nutrition"
          ? "기록한 식단과 당시 목표를 비교하세요."
          : "종목별 기록과 완료 본세트의 변화를 확인하세요."}
      </p>
      {nav}
      {goal}
      <PeriodControls
        end={date.data}
        range={range.data}
        tab={tab.data}
        exercise={exercise?.success ? exercise.data : undefined}
      />
      {tab.data === "nutrition" ? (
        <NutritionAnalysis
          data={data}
          end={date.data}
          range={range.data}
          enabled={!!client}
        />
      ) : (
        <WorkoutAnalysis
          data={data}
          end={date.data}
          range={range.data}
          exercise={exercise?.success ? exercise.data : undefined}
          enabled={!!client}
        />
      )}
    </>
  );
}
