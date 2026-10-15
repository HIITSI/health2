"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Star,
  Search,
  Utensils,
  Copy,
  Bookmark,
  Settings2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DietDialog } from "./dialog";
import {
  addMeal,
  registerFood,
  favoriteFood,
  editItem,
  deleteItem,
  saveCombo,
  deleteCombo,
  copyDay,
  saveGoals,
  type Result,
} from "@/app/(app)/diet/actions";
import {
  scaleNutrition,
  sumNutrition,
  macroRatios,
  mealTypes,
  mealLabels,
  fmt,
  shiftDate,
  type Food,
  type Meal,
  type Combo,
  type Goals,
  type MealType,
  type Item,
} from "@/lib/diet/nutrition";
type CartEntry = { food_id: string; grams: number };
const nutrientLabels = {
  calories: "열량",
  carbs_g: "탄수화물",
  protein_g: "단백질",
  fat_g: "지방",
} as const;
const initialDraft = {
  name: "",
  brand: "",
  reference_grams: "100",
  calories: "",
  carbs_g: "",
  protein_g: "",
  fat_g: "",
  source: "",
};
type Draft = typeof initialDraft;
export function DietDashboard({
  date,
  foods,
  meals,
  combos,
  goals,
  enabled,
  unavailable,
  acquisition,
}: {
  date: string;
  foods: Food[];
  meals: Meal[];
  combos: Combo[];
  goals: Goals;
  enabled: boolean;
  unavailable: boolean;
  acquisition?: React.ReactNode;
}) {
  const items = meals.flatMap((m) => m.meal_items);
  const total = sumNutrition(items);
  const ratios = macroRatios(total);
  const [modal, setModal] = useState<
    | "add"
    | "food"
    | "manager"
    | "goals"
    | "copy"
    | "edit"
    | "delete"
    | "combos"
    | "deletecombo"
    | null
  >(null);
  const [message, setMessage] = useState<Result>({});
  const [busy, startTransition] = useTransition();
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [comboName, setComboName] = useState("");
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [foodEdit, setFoodEdit] = useState<string | undefined>();
  const [editing, setEditing] = useState<Item | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [sourceDate, setSourceDate] = useState(shiftDate(date, -1));
  const [goalDraft, setGoalDraft] = useState<Record<keyof Goals, string>>({
    calories: "",
    carbs_g: "",
    protein_g: "",
    fat_g: "",
  });
  function open(kind: typeof modal) {
    setMessage({});
    setModal(kind);
  }
  function perform(operation: () => Promise<Result>, close = true) {
    if (busy || !enabled) return;
    setMessage({});
    startTransition(async () => {
      const result = await operation();
      setMessage(result);
      if (result.success && close) setModal(null);
    });
  }
  const filtered = foods.filter(
    (f) =>
      (!favorites || f.is_favorite) &&
      `${f.name} ${f.brand}`
        .toLocaleLowerCase("ko")
        .includes(query.trim().toLocaleLowerCase("ko")),
  );
  function preview(food: Food | null, g: string) {
    try {
      return food
        ? scaleNutrition(food, Number(food.serving_grams), Number(g))
        : null;
    } catch {
      return null;
    }
  }
  const live = preview(selected, grams);
  const cartTotal = sumNutrition(
    cart.flatMap((c) => {
      const food = foods.find((f) => f.id === c.food_id);
      const value = preview(food || null, String(c.grams));
      return value ? [value] : [];
    }),
  );
  function foodForm(food?: Food) {
    setFoodEdit(food?.id);
    if (food) {
      const n = scaleNutrition(food, food.serving_grams, food.reference_grams);
      setDraft({
        name: food.name,
        brand: food.brand,
        source: food.source,
        reference_grams: String(food.reference_grams),
        calories: String(n.calories),
        carbs_g: String(n.carbs_g),
        protein_g: String(n.protein_g),
        fat_g: String(n.fat_g),
      });
    } else setDraft({ ...initialDraft });
    open("food");
  }
  let normalized = null;
  try {
    normalized = scaleNutrition(
      {
        calories: Number(draft.calories),
        carbs_g: Number(draft.carbs_g),
        protein_g: Number(draft.protein_g),
        fat_g: Number(draft.fat_g),
      },
      Number(draft.reference_grams),
      100,
    );
  } catch {}
  function edit(item: Item, type: MealType) {
    setEditing(item);
    setGrams(String(item.grams));
    setMealType(type);
    open("edit");
  }
  const nutrientText = (n: {
    calories: number;
    carbs_g: number;
    protein_g: number;
    fat_g: number;
  }) =>
    `${fmt(n.calories)} kcal · 탄 ${fmt(n.carbs_g)}g · 단 ${fmt(n.protein_g)}g · 지 ${fmt(n.fat_g)}g`;
  return (
    <>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:w-auto">
          <Link
            href={`/diet?date=${shiftDate(date, -1)}`}
            aria-label="이전 날짜"
            className="rounded-lg border border-[var(--border)] p-2"
          >
            <ChevronLeft size={20} />
          </Link>
          <form action="/diet" method="get" className="flex items-center gap-2">
            <label htmlFor="diet-date" className="sr-only">
              기록 날짜
            </label>
            <input
              id="diet-date"
              name="date"
              type="date"
              defaultValue={date}
              key={date}
              min="1900-01-01"
              max="2100-12-31"
              className="min-w-0 flex-1 max-w-44 text-sm"
              required
            />
            <Button size="sm" variant="outline">
              조회
            </Button>
          </form>
          <Link
            href={`/diet?date=${shiftDate(date, 1)}`}
            aria-label="다음 날짜"
            className="rounded-lg border border-[var(--border)] p-2"
          >
            <ChevronRight size={20} />
          </Link>
        </div>
        <p className="text-xs subtle">
          기록 날짜는 한국 시간 기준으로 고정됩니다.
        </p>
      </div>
      {acquisition}
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
      <section
        aria-label="일일 영양 요약"
        className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {Object.entries(nutrientLabels).map(([key, label]) => {
          const k = key as keyof Goals,
            n = total[k],
            goal = goals[k],
            unit = k === "calories" ? "kcal" : "g";
          return (
            <article key={k} className="card !p-5">
              <p className="text-sm subtle">{label}</p>
              <p className="mt-4 text-3xl font-bold" data-testid={`total-${k}`}>
                {enabled ? fmt(n) : "—"}{" "}
                <span className="text-xs font-normal subtle">{unit}</span>
              </p>
              {goal && enabled ? (
                <>
                  <div
                    className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"
                    role="progressbar"
                    aria-label={`${label} 목표 달성률`}
                    aria-valuenow={Math.min(100, (n / goal) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full bg-blue-600"
                      style={{ width: `${Math.min(100, (n / goal) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs subtle">
                    목표 {fmt(goal)}
                    {unit} · {fmt((n / goal) * 100)}%
                  </p>
                  <p
                    className={`mt-2 text-xs font-semibold ${n > goal ? "text-orange-600" : "text-blue-600"}`}
                  >
                    {n > goal
                      ? `초과 ${fmt(n - goal)}${unit}`
                      : `남은 목표 ${fmt(goal - n)}${unit}`}
                  </p>
                </>
              ) : (
                <p className="mt-4 text-xs subtle">
                  {unavailable
                    ? "조회 실패"
                    : enabled
                      ? "목표 미설정"
                      : "로그인 후 확인"}
                </p>
              )}
            </article>
          );
        })}
      </section>
      <section className="card mt-5 !p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="font-semibold">탄단지 열량 비율</h2>
            <p className="mt-1 text-xs subtle">
              총 섭취 중량{" "}
              {enabled
                ? fmt(items.reduce((s, i) => s + Number(i.grams), 0))
                : "—"}
              g
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!enabled || busy}
            onClick={() => {
              setGoalDraft({
                calories: goals.calories?.toString() || "",
                carbs_g: goals.carbs_g?.toString() || "",
                protein_g: goals.protein_g?.toString() || "",
                fat_g: goals.fat_g?.toString() || "",
              });
              open("goals");
            }}
          >
            <Settings2 size={15} />
            일일 목표 설정
          </Button>
        </div>
        {enabled && total.carbs_g + total.protein_g + total.fat_g > 0 ? (
          <>
            <div
              className="mt-4 flex h-3 overflow-hidden rounded-full"
              aria-hidden="true"
            >
              <div
                className="bg-blue-500"
                style={{ width: `${ratios.carbs}%` }}
              />
              <div
                className="bg-violet-500"
                style={{ width: `${ratios.protein}%` }}
              />
              <div
                className="bg-amber-500"
                style={{ width: `${ratios.fat}%` }}
              />
            </div>
            <p className="mt-3 text-xs subtle">
              탄수화물 {fmt(ratios.carbs)}% · 단백질 {fmt(ratios.protein)}% ·
              지방 {fmt(ratios.fat)}%
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm subtle">
            영양 기록이 있으면 비율을 표시합니다.
          </p>
        )}
        <p className="mt-2 text-xs subtle">
          탄·단 4kcal/g, 지방 9kcal/g으로 계산합니다. 식이섬유·표시 반올림
          등으로 실제 표시 열량과 다를 수 있습니다.
        </p>
      </section>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!enabled || busy}
          onClick={() => foodForm()}
        >
          <Plus size={16} />
          음식 직접 등록
        </Button>
        <Button
          variant="outline"
          disabled={!enabled || busy}
          onClick={() => {
            setQuery("");
            setFavorites(false);
            open("manager");
          }}
        >
          내 음식 관리
        </Button>
        <Button
          variant="outline"
          disabled={!enabled || busy}
          onClick={() => open("combos")}
        >
          <Bookmark size={16} />
          저장한 식단 조합
        </Button>
        <Button
          variant="outline"
          disabled={!enabled || busy}
          onClick={() => {
            setSourceDate(shiftDate(date, -1));
            open("copy");
          }}
        >
          <Copy size={16} />
          이전 날짜 복사
        </Button>
      </div>
      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        {mealTypes.map((type) => {
          const entries = meals
            .filter((m) => m.meal_type === type)
            .flatMap((m) => m.meal_items);
          const sum = sumNutrition(entries);
          return (
            <article
              className="card"
              key={type}
              aria-label={`${mealLabels[type]} 식사`}
            >
              <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-blue-500/10 p-2 text-blue-600">
                    <Utensils size={19} />
                  </span>
                  <h2 className="text-lg font-bold">{mealLabels[type]}</h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!enabled || busy}
                  onClick={() => {
                    setMealType(type);
                    setCart([]);
                    setSelected(null);
                    setQuery("");
                    setFavorites(false);
                    setComboName("");
                    open("add");
                  }}
                  aria-label={`${mealLabels[type]} 음식 추가`}
                >
                  <Plus size={15} />
                  음식 추가
                </Button>
              </header>
              {entries.length ? (
                <>
                  <ul className="mt-5 divide-y divide-[var(--border)]">
                    {entries.map((item) => (
                      <li key={item.id} className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-semibold">
                              {item.food_name}{" "}
                              {item.brand && (
                                <span className="text-xs font-normal subtle">
                                  · {item.brand}
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-sm subtle">
                              {fmt(Number(item.grams))}g ·{" "}
                              {fmt(Number(item.calories))} kcal
                            </p>
                            <p className="mt-2 text-xs subtle">
                              탄 {fmt(Number(item.carbs_g))}g · 단{" "}
                              {fmt(Number(item.protein_g))}g · 지{" "}
                              {fmt(Number(item.fat_g))}g
                            </p>
                            <p className="mt-2 break-words text-xs subtle">
                              출처: {item.source}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              aria-label={`${item.food_name} 기록 수정`}
                              disabled={busy}
                              onClick={() => edit(item, type)}
                              className="rounded-lg p-2"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              aria-label={`${item.food_name} 기록 삭제`}
                              disabled={busy}
                              onClick={() => {
                                setEditing(item);
                                open("delete");
                              }}
                              className="rounded-lg p-2 text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-xl bg-[var(--muted)] p-3 text-xs font-semibold leading-6">
                    식사 합계 · {nutrientText(sum)}
                  </div>
                </>
              ) : (
                <p className="py-9 text-center text-sm subtle">
                  {unavailable
                    ? "기록을 조회할 수 없습니다."
                    : enabled
                      ? "아직 기록한 음식이 없어요."
                      : "로그인 후 식단을 기록할 수 있습니다."}
                </p>
              )}
            </article>
          );
        })}
      </section>
      {modal && (
        <DietDialog
          key={modal}
          title={
            {
              add: `${mealLabels[mealType]} 음식 추가`,
              food: foodEdit ? "음식 정보 수정" : "음식 직접 등록",
              manager: "내 음식 관리",
              goals: "일일 섭취 목표",
              copy: "이전 날짜 식단 복사",
              edit: "섭취 기록 수정",
              delete: "음식 기록 삭제",
              combos: "저장한 식단 조합",
              deletecombo: "식단 조합 삭제",
            }[modal]
          }
          onClose={() => setModal(null)}
          busy={busy}
        >
          {message.error && (
            <p role="alert" className="mb-5 text-sm text-red-500">
              {message.error}
            </p>
          )}
          {message.success && (
            <p role="status" className="mb-5 text-sm text-emerald-600">
              {message.success}
            </p>
          )}
          {(modal === "add" || modal === "manager") && (
            <>
              <div className="flex items-center gap-2">
                <Search size={18} className="shrink-0 subtle" />
                <label htmlFor="food-search" className="sr-only">
                  음식 검색
                </label>
                <input
                  id="food-search"
                  placeholder="음식명 또는 브랜드 검색"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="my-4 flex items-center justify-between gap-2">
                <label className="!m-0 flex items-center gap-2 text-sm font-normal">
                  <input
                    type="checkbox"
                    checked={favorites}
                    onChange={(e) => setFavorites(e.target.checked)}
                    className="!w-4"
                  />
                  즐겨찾기만
                </label>
                <button
                  className="text-sm font-semibold text-blue-600"
                  onClick={() => foodForm()}
                >
                  새 음식 등록
                </button>
              </div>
              <p className="mb-3 text-xs subtle">
                저장된 개인 음식만 검색합니다. 등록 데이터는 사용자 입력이며
                공식 DB 검증 데이터가 아닙니다.
              </p>
              <ul className="max-h-60 space-y-2 overflow-y-auto">
                {filtered.map((food) => (
                  <li
                    key={food.id}
                    className="rounded-xl border border-[var(--border)] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => {
                          if (modal === "manager") foodForm(food);
                          else {
                            setSelected(food);
                            setGrams("100");
                          }
                        }}
                      >
                        <p className="break-words text-sm font-semibold">
                          {food.name}{" "}
                          {food.brand && (
                            <span className="font-normal subtle">
                              · {food.brand}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs subtle">
                          100g당{" "}
                          {nutrientText(
                            scaleNutrition(food, food.serving_grams, 100),
                          )}
                        </p>
                        <p className="mt-1 break-words text-xs subtle">
                          출처: {food.source}
                        </p>
                        <p className="mt-1 text-[11px] text-blue-600">
                          {modal === "manager" ? "수정하기" : "선택하기"} ·
                          사용자 등록
                        </p>
                      </button>
                      <button
                        type="button"
                        aria-label={`${food.name} ${food.brand} 즐겨찾기`}
                        aria-pressed={food.is_favorite}
                        disabled={busy}
                        onClick={() =>
                          perform(
                            () => favoriteFood(food.id, !food.is_favorite),
                            false,
                          )
                        }
                        className={`shrink-0 p-2 ${food.is_favorite ? "text-amber-500" : "subtle"}`}
                      >
                        <Star
                          size={18}
                          fill={food.is_favorite ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {!filtered.length && (
                <p className="py-8 text-center text-sm subtle">
                  검색 결과가 없습니다. 직접 등록한 음식을 사용할 수 있어요.
                </p>
              )}
            </>
          )}
          {modal === "add" && (
            <>
              <p className="mt-5 text-xs subtle">
                기록 날짜 {date} · {mealLabels[mealType]}
              </p>
              {selected && (
                <form
                  className="mt-4 rounded-xl bg-[var(--muted)] p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!live) return;
                    setCart([
                      ...cart,
                      { food_id: selected.id, grams: Number(grams) },
                    ]);
                    setSelected(null);
                  }}
                >
                  <p className="mb-3 text-sm font-bold">
                    선택: {selected.name} · {selected.brand || "브랜드 없음"}
                  </p>
                  <label htmlFor="portion">섭취량 (g)</label>
                  <input
                    id="portion"
                    type="number"
                    min="0.01"
                    max="100000"
                    step="any"
                    required
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                  />
                  <p
                    className="my-3 text-xs subtle"
                    data-testid="portion-preview"
                  >
                    {live ? nutrientText(live) : "올바른 섭취량을 입력하세요."}
                  </p>
                  <Button
                    size="sm"
                    disabled={!live || busy || cart.length >= 100}
                  >
                    식사 목록에 추가
                  </Button>
                </form>
              )}
              {cart.length > 0 && (
                <>
                  <ul className="mt-5 space-y-2">
                    {cart.map((entry, index) => {
                      const food = foods.find((f) => f.id === entry.food_id);
                      return (
                        <li
                          key={index}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 break-words">
                            {food?.name} · {food?.brand} · {fmt(entry.grams)}g
                          </span>
                          <button
                            type="button"
                            aria-label={`${food?.name} 목록에서 제거`}
                            onClick={() =>
                              setCart(cart.filter((_, i) => i !== index))
                            }
                            disabled={busy}
                            className="p-2"
                          >
                            <Trash2 size={15} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="my-4 rounded-xl bg-blue-500/10 p-3 text-xs leading-6 text-blue-600">
                    추가할 합계 · {nutrientText(cartTotal)}
                  </p>
                  <Button
                    className="w-full"
                    disabled={busy}
                    onClick={() =>
                      perform(() =>
                        addMeal({ date, type: mealType, items: cart }),
                      )
                    }
                  >
                    {busy ? "저장 중…" : "식단 기록 저장"}
                  </Button>
                  <div className="mt-5 border-t border-[var(--border)] pt-5">
                    <label htmlFor="combo-name">
                      이 식사 목록을 조합으로 저장
                    </label>
                    <input
                      id="combo-name"
                      value={comboName}
                      maxLength={120}
                      onChange={(e) => setComboName(e.target.value)}
                      placeholder="예: 출근 전 아침"
                    />
                    <Button
                      className="mt-3"
                      variant="outline"
                      disabled={!comboName.trim() || busy}
                      onClick={() =>
                        perform(() => saveCombo(comboName, cart), false)
                      }
                    >
                      조합 저장
                    </Button>
                    <p className="mt-2 text-xs subtle">
                      조합 저장만으로 식단이 기록되지는 않습니다.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
          {modal === "food" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                perform(() =>
                  registerFood(
                    {
                      ...draft,
                      reference_grams: Number(draft.reference_grams),
                      calories: Number(draft.calories),
                      carbs_g: Number(draft.carbs_g),
                      protein_g: Number(draft.protein_g),
                      fat_g: Number(draft.fat_g),
                    },
                    foodEdit,
                  ),
                );
              }}
            >
              <p className="mb-5 text-sm leading-6 subtle">
                제품 영양표나 확인한 자료를 보고 입력하세요. 1개·1회 제공량
                표시라면 해당 제공량의 실제 중량(g)과 영양값을 입력합니다.
              </p>
              <div className="field">
                <label htmlFor="food-name">음식명</label>
                <input
                  id="food-name"
                  required
                  maxLength={120}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="brand">제조사 / 브랜드</label>
                <input
                  id="brand"
                  maxLength={120}
                  value={draft.brand}
                  onChange={(e) =>
                    setDraft({ ...draft, brand: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="reference">영양표 기준 중량 (g)</label>
                <input
                  id="reference"
                  type="number"
                  min="0.01"
                  max="100000"
                  step="any"
                  required
                  value={draft.reference_grams}
                  onChange={(e) =>
                    setDraft({ ...draft, reference_grams: e.target.value })
                  }
                />
                <p className="mt-2 text-xs subtle">
                  1개 150g 제품이면 150을 입력하세요. 중량이 없으면 g 환산을 할
                  수 없습니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(nutrientLabels).map(([key, label]) => (
                  <div className="field" key={key}>
                    <label htmlFor={`food-${key}`}>
                      {label} ({key === "calories" ? "kcal" : "g"})
                    </label>
                    <input
                      id={`food-${key}`}
                      type="number"
                      min="0"
                      max="100000"
                      step="any"
                      required
                      value={draft[key as keyof Draft]}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="field">
                <label htmlFor="source">영양정보 출처</label>
                <input
                  id="source"
                  required
                  maxLength={500}
                  value={draft.source}
                  onChange={(e) =>
                    setDraft({ ...draft, source: e.target.value })
                  }
                  placeholder="제품 포장지 영양표 · 자료 이름 / 링크"
                />
              </div>
              {normalized && (
                <p className="mb-5 rounded-xl bg-[var(--muted)] p-3 text-xs leading-6">
                  100g 환산 · {nutrientText(normalized)}
                </p>
              )}
              <p className="mb-5 text-xs subtle">
                사용자 직접 등록으로 저장됩니다. 공식 데이터로 표시하지
                않습니다.
              </p>
              <Button className="w-full" disabled={busy}>
                {busy
                  ? "저장 중…"
                  : foodEdit
                    ? "음식 수정 저장"
                    : "음식 등록 저장"}
              </Button>
            </form>
          )}
          {modal === "goals" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                perform(() =>
                  saveGoals(
                    Object.fromEntries(
                      Object.entries(goalDraft).map(([k, v]) => [
                        k,
                        v === "" ? null : Number(v),
                      ]),
                    ),
                  ),
                );
              }}
            >
              <p className="mb-5 text-sm subtle">
                본인의 일일 목표를 입력하세요. 빈 항목은 목표 미설정으로
                저장합니다. 권장량을 임의로 설정하지 않습니다.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(nutrientLabels).map(([key, label]) => (
                  <div className="field" key={key}>
                    <label htmlFor={`goal-${key}`}>
                      {label} 목표 ({key === "calories" ? "kcal" : "g"})
                    </label>
                    <input
                      id={`goal-${key}`}
                      type="number"
                      min="0.01"
                      max="100000"
                      step="any"
                      value={goalDraft[key as keyof Goals]}
                      onChange={(e) =>
                        setGoalDraft({ ...goalDraft, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
              <Button disabled={busy}>목표 저장</Button>
            </form>
          )}
          {modal === "edit" && editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                perform(() => editItem(editing.id, Number(grams)));
              }}
            >
              <p className="mb-5 font-semibold">
                {editing.food_name} · {editing.brand}
              </p>
              <label htmlFor="edit-grams">수정 섭취량 (g)</label>
              <input
                id="edit-grams"
                type="number"
                min="0.01"
                max="100000"
                step="any"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                required
              />
              <p className="my-4 text-xs subtle">
                기록 당시의 100g 영양정보로 다시 계산합니다. 현재 음식 정보를
                변경해도 과거 기록은 유지됩니다.
              </p>
              <Button disabled={busy}>수정 저장</Button>
            </form>
          )}
          {modal === "delete" && editing && (
            <>
              <p className="mb-6 text-sm leading-6">
                {date}의 {editing.food_name} ({fmt(Number(editing.grams))}g)
                기록을 삭제할까요?
              </p>
              <Button
                disabled={busy}
                className="bg-red-600 hover:bg-red-700"
                onClick={() => perform(() => deleteItem(editing.id))}
              >
                기록 삭제 확인
              </Button>
            </>
          )}
          {modal === "copy" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                perform(() => copyDay(sourceDate, date));
              }}
            >
              <label htmlFor="copy-source">복사할 원본 날짜</label>
              <input
                id="copy-source"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                value={sourceDate}
                onChange={(e) => setSourceDate(e.target.value)}
                required
              />
              <p className="my-5 text-sm leading-6 subtle">
                원본의 모든 식사와 기록 당시 영양정보를 {date}에 추가합니다.
                대상 날짜의 기존 기록은 유지되며, 같은 날로는 복사할 수
                없습니다. 반복 복사하면 중복 기록이 추가됩니다.
              </p>
              <Button disabled={busy || sourceDate === date}>
                식단 복사 확인
              </Button>
            </form>
          )}
          {modal === "combos" && (
            <>
              <label htmlFor="combo-meal-type">추가할 식사</label>
              <select
                id="combo-meal-type"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
              >
                {mealTypes.map((type) => (
                  <option key={type} value={type}>
                    {mealLabels[type]}
                  </option>
                ))}
              </select>
              <p className="my-4 text-xs subtle">
                조합의 음식과 중량으로 {date}에 기록합니다. 영양정보는 현재
                저장된 음식 기준으로 계산됩니다.
              </p>
              {combos.length ? (
                <ul className="space-y-3">
                  {combos.map((combo) => (
                    <li
                      key={combo.id}
                      className="rounded-xl border border-[var(--border)] p-4"
                    >
                      <p className="font-semibold">{combo.name}</p>
                      <ul className="mt-2 text-xs subtle">
                        {combo.diet_combo_items.map((entry, i) => {
                          const food = foods.find(
                            (f) => f.id === entry.food_id,
                          );
                          return (
                            <li key={i}>
                              {food?.name || "음식 조회 불가"} · {food?.brand} ·{" "}
                              {fmt(Number(entry.grams))}g
                            </li>
                          );
                        })}
                      </ul>
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            perform(() =>
                              addMeal({
                                date,
                                type: mealType,
                                items: combo.diet_combo_items.map((i) => ({
                                  food_id: i.food_id,
                                  grams: Number(i.grams),
                                })),
                              }),
                            )
                          }
                          aria-label={`${combo.name} 식단에 추가`}
                        >
                          식단에 추가
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            setSelectedCombo(combo);
                            open("deletecombo");
                          }}
                          aria-label={`${combo.name} 조합 삭제`}
                        >
                          삭제
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-10 text-center text-sm subtle">
                  음식 추가 화면에서 자주 먹는 목록을 조합으로 저장하세요.
                </p>
              )}
            </>
          )}
          {modal === "deletecombo" && selectedCombo && (
            <>
              <p className="mb-6">
                {selectedCombo.name} 조합을 삭제할까요? 이미 저장한 식단 기록은
                유지됩니다.
              </p>
              <Button
                disabled={busy}
                onClick={() => perform(() => deleteCombo(selectedCombo.id))}
              >
                조합 삭제 확인
              </Button>
            </>
          )}
        </DietDialog>
      )}
    </>
  );
}
