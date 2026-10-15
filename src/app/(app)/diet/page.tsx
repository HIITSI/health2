import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";
import {
  dateSchema,
  koreaDate,
  type Food,
  type Meal,
  type Combo,
  type Goals,
} from "@/lib/diet/nutrition";
import { DietDashboard } from "@/components/diet/dashboard";
import { FoodAcquisition } from "@/components/service/food-acquisition";
import { photoEnabled, offEnabled } from "@/lib/service/server";
export default async function Diet({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  if (!params.date) redirect(`/diet?date=${koreaDate()}`);
  const parsed = dateSchema.safeParse(params.date);
  if (!parsed.success)
    return (
      <section className="card">
        <h1 className="text-2xl font-bold">올바른 날짜를 선택하세요</h1>
        <a href="/diet" className="mt-4 inline-block text-blue-600">
          오늘 식단으로 이동
        </a>
      </section>
    );
  const client = await supabase();
  let foods: Food[] = [];
  let meals: Meal[] = [];
  let combos: Combo[] = [];
  let goals: Goals = {
    calories: null,
    carbs_g: null,
    protein_g: null,
    fat_g: null,
  };
  let error = false;
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) redirect("/login");
    const results = await Promise.all([
      client
        .from("foods")
        .select(
          "id,name,brand,source,is_custom,is_favorite,serving_grams,reference_grams,calories,carbs_g,protein_g,fat_g",
        )
        .eq("user_id", user.id)
        .order("name"),
      client
        .from("meal_records")
        .select("id,meal_date,meal_type,meal_items(*)")
        .eq("user_id", user.id)
        .eq("meal_date", parsed.data)
        .order("created_at"),
      client
        .from("diet_combos")
        .select("id,name,diet_combo_items(food_id,grams)")
        .eq("user_id", user.id)
        .order("created_at"),
      client
        .from("nutrition_goals")
        .select("calories,carbs_g,protein_g,fat_g")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    error = results.some((r) => !!r.error);
    if (!error) {
      foods = results[0].data as Food[];
      meals = results[1].data as Meal[];
      combos = results[2].data as Combo[];
      if (results[3].data) goals = results[3].data;
    }
  }
  return (
    <>
      <p className="text-sm subtle">DAILY NUTRITION</p>
      <h1 className="mt-3 text-3xl font-bold">식단</h1>
      <p className="mt-3 subtle">한 끼씩 기록하는 나의 영양 균형</p>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-500"
        >
          식단 데이터를 불러오지 못했습니다. 2단계 마이그레이션과 연결 상태를
          확인하세요. 빈 기록으로 간주하지 않습니다.
        </p>
      )}
      <DietDashboard
        key={parsed.data}
        date={parsed.data}
        foods={foods}
        meals={meals}
        combos={combos}
        goals={goals}
        enabled={!!client && !error}
        unavailable={error}
        acquisition={
          <FoodAcquisition
            key={parsed.data}
            date={parsed.data}
            foods={foods}
            enabled={!!client && !error}
            photoEnabled={photoEnabled()}
            externalEnabled={offEnabled()}
          />
        }
      />
    </>
  );
}
