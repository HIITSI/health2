import { supabase } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";
import { DataTools } from "@/components/service/data-tools";
import { InstallCard } from "@/components/service/pwa";
import { koreaDate } from "@/lib/diet/nutrition";
export default async function Settings() {
  const client = await supabase();
  let profile = {
    display_name: "",
    timezone: "Asia/Seoul",
    weight_unit: "kg" as const,
    height_unit: "cm" as const,
  };
  let email: string | undefined;
  let userId = "";
  let error = false;
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    email = user?.email;
    userId = user?.id || "";
    if (user) {
      const result = await client
        .from("profiles")
        .select("display_name,timezone,weight_unit,height_unit")
        .eq("id", user.id)
        .single();
      if (result.data) profile = result.data;
      error = !!result.error;
    }
  }
  return (
    <>
      <p className="text-sm subtle">MY PREFERENCES</p>
      <h1 className="mt-3 text-3xl font-bold">설정</h1>
      <p className="mt-3 subtle">나에게 맞는 건강 관리 환경을 만들어요.</p>
      {error && (
        <p role="alert" className="mt-5 text-red-500">
          프로필 조회에 실패했습니다. 마이그레이션과 연결 상태를 확인하세요.
        </p>
      )}
      <SettingsForm
        profile={profile}
        email={email}
        enabled={!!client && !error}
      />
      <DataTools
        enabled={!!client && !error}
        userId={userId}
        today={koreaDate()}
      />
      <InstallCard />
    </>
  );
}
