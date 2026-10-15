import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";
import { koreaDate } from "@/lib/diet/nutrition";
import { emptyAnalysis, type AnalysisData } from "@/lib/analysis/model";
import { HomeDashboard } from "@/components/analysis/home";
export default async function Home() {
  const client = await supabase();
  let name = "나",
    zone = "Asia/Seoul",
    error = false,
    data = emptyAnalysis();
  const today = koreaDate();
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) redirect("/login");
    const results = await Promise.all([
      client
        .from("profiles")
        .select("display_name,timezone")
        .eq("id", user.id)
        .single(),
      client.rpc("analysis_period", {
        p_end: today,
        p_range: "30",
        p_exercise: null,
      }),
    ]);
    error = results.some((r) => !!r.error);
    if (results[0].data) {
      name = results[0].data.display_name || "나";
      zone = results[0].data.timezone;
    }
    if (!error) data = results[1].data as AnalysisData;
  }
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: zone,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm subtle">{date}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            건강한 하루의 시작
          </h1>
          <p className="mt-3 subtle">{name}의 건강, 한눈에 확인하세요.</p>
        </div>
        <span className="rounded-full border border-[var(--border)] px-4 py-2 text-xs subtle">
          {zone}
        </span>
      </div>
      {error ? (
        <p role="alert" className="card mt-5 text-sm text-red-500">
          홈 데이터를 조회하지 못했습니다. 5단계 마이그레이션과 연결을
          확인하세요. 조회 오류를 빈 기록으로 표시하지 않습니다.
        </p>
      ) : (
        <HomeDashboard data={data} today={today} enabled={!!client} />
      )}
    </>
  );
}
