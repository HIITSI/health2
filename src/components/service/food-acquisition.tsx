"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DietDialog } from "@/components/diet/dialog";
import { BarcodeScanner } from "./barcode-scanner";
import {
  barcodeSchema,
  type BarcodeProduct,
  type PhotoResult,
} from "@/lib/service/model";
import {
  saveBarcodeMeal,
  savePhotoMeal,
} from "@/app/(app)/diet/service-actions";
import {
  scaleNutrition,
  fmt,
  mealTypes,
  mealLabels,
  type Food,
  type MealType,
} from "@/lib/diet/nutrition";
export function FoodAcquisition({
  date,
  foods,
  enabled,
  photoEnabled,
  externalEnabled,
}: {
  date: string;
  foods: Food[];
  enabled: boolean;
  photoEnabled: boolean;
  externalEnabled: boolean;
}) {
  const [modal, setModal] = useState<"barcode" | "photo" | null>(null),
    [code, setCode] = useState(""),
    [product, setProduct] = useState<BarcodeProduct | null>(null),
    [searched, setSearched] = useState(false),
    [busy, start] = useTransition(),
    [message, setMessage] = useState<{ error?: string; success?: string }>({}),
    [info, setInfo] = useState(""),
    [type, setType] = useState<MealType>("lunch"),
    [grams, setGrams] = useState("100"),
    [nonce, setNonce] = useState("");
  const [draft, setDraft] = useState({
      name: "",
      brand: "",
      source: "",
      calories: "",
      carbs_g: "",
      protein_g: "",
      fat_g: "",
    }),
    [checked, setChecked] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [consent, setConsent] = useState(false),
    [estimate, setEstimate] = useState<PhotoResult | null>(null),
    [confirmed, setConfirmed] = useState<
      { food_id: string; grams: string; cooking: string }[]
    >([]);
  function changeCode(value: string) {
    setCode(value);
    setSearched(false);
    setProduct(null);
    setInfo("");
    setChecked(false);
    setNonce(crypto.randomUUID());
  }
  async function search(value = code) {
    setMessage({});
    setSearched(false);
    setChecked(false);
    const valid = barcodeSchema.safeParse(value);
    if (!valid.success) {
      setMessage({ error: valid.error.issues[0].message });
      return;
    }
    start(async () => {
      try {
        const r = await fetch(
          `/api/foods/barcode?code=${encodeURIComponent(valid.data)}`,
          { cache: "no-store" },
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setProduct(data.product);
        setSearched(true);
        setInfo(
          data.message ||
            (data.product
              ? data.product.id
                ? "내 음식에 등록된 제품입니다."
                : "Open Food Facts 커뮤니티 자료입니다. 제품 라벨과 비교하고 확인하세요."
              : "검색 결과가 없습니다. 제품 라벨의 정보를 직접 입력하세요."),
        );
        const p = data.product as BarcodeProduct | null;
        setDraft({
          name: p?.name || "",
          brand: p?.brand || "",
          source: p?.source || "",
          calories: p?.calories == null ? "" : String(p.calories),
          carbs_g: p?.carbs_g == null ? "" : String(p.carbs_g),
          protein_g: p?.protein_g == null ? "" : String(p.protein_g),
          fat_g: p?.fat_g == null ? "" : String(p.fat_g),
        });
        setNonce(crypto.randomUUID());
      } catch (e) {
        setMessage({
          error:
            e instanceof Error
              ? e.message
              : "네트워크 오류로 검색하지 못했습니다.",
        });
        setSearched(true);
        setProduct(null);
        setDraft({
          name: "",
          brand: "",
          source: "",
          calories: "",
          carbs_g: "",
          protein_g: "",
          fat_g: "",
        });
      }
    });
  }
  const nutrientPreview = () => {
    try {
      if (Object.values(draft).some((v, i) => i >= 3 && v === "")) return null;
      return scaleNutrition(
        {
          calories: Number(draft.calories),
          carbs_g: Number(draft.carbs_g),
          protein_g: Number(draft.protein_g),
          fat_g: Number(draft.fat_g),
        },
        100,
        Number(grams),
      );
    } catch {
      return null;
    }
  };
  const preview = nutrientPreview();
  return (
    <section className="card mt-5" aria-label="바코드와 사진 입력">
      <h2 className="text-lg font-bold">더 빠르게 음식 기록</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={!enabled || busy}
          onClick={() => {
            setModal("barcode");
            setMessage({});
            changeCode("");
          }}
        >
          바코드 검색
        </Button>
        <Button
          variant="outline"
          disabled={!enabled || !photoEnabled || busy}
          onClick={() => {
            setModal("photo");
            setMessage({});
            setEstimate(null);
            setFile(null);
            setConsent(false);
            setNonce(crypto.randomUUID());
          }}
        >
          음식 사진 분석
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 subtle">
        {externalEnabled
          ? "외부 제품 검색 설정됨 · 출처와 제품 라벨 확인 필요"
          : "외부 제품 DB 미연결 · 내 바코드 검색 및 직접 등록 가능"}
        <br />
        {photoEnabled
          ? "사진 AI 연결 설정됨 · 추정 결과를 확인한 뒤 저장"
          : "음식 사진 AI 미연결 · 분석 사용 불가"}
      </p>
      {message.success && !modal && (
        <p className="mt-4 text-sm text-emerald-600" role="status">
          {message.success}
        </p>
      )}
      {modal && (
        <DietDialog
          title={
            modal === "barcode"
              ? "제품 바코드 검색"
              : "음식 사진 추정 · 확인 후 저장"
          }
          busy={busy}
          onClose={() => setModal(null)}
        >
          {message.error && (
            <p role="alert" className="mb-4 text-sm text-red-500">
              {message.error}
            </p>
          )}
          {modal === "barcode" ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void search();
                }}
              >
                <label htmlFor="barcode-number">바코드 번호</label>
                <div className="flex items-end gap-3">
                  <input
                    id="barcode-number"
                    inputMode="numeric"
                    maxLength={14}
                    required
                    value={code}
                    onChange={(e) => changeCode(e.target.value)}
                  />
                  <Button disabled={busy} type="submit">
                    제품 검색
                  </Button>
                </div>
              </form>
              <BarcodeScanner
                onCode={(value) => {
                  changeCode(value);
                  void search(value);
                }}
              />
              {info && (
                <p className="mt-4 text-sm" role="status">
                  {info}
                </p>
              )}
              {searched && (
                <form
                  className="mt-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!checked || !preview) return;
                    start(async () => {
                      const r = await saveBarcodeMeal({
                        barcode: code,
                        date,
                        type,
                        grams: Number(grams),
                        request_id: nonce,
                        food: {
                          ...draft,
                          calories: Number(draft.calories),
                          carbs_g: Number(draft.carbs_g),
                          protein_g: Number(draft.protein_g),
                          fat_g: Number(draft.fat_g),
                          reference_grams: 100,
                          data_provider: product?.data_provider || "user",
                        },
                      });
                      setMessage(r);
                      if (r.success) setModal(null);
                    });
                  }}
                >
                  <h3 className="font-semibold">
                    {product?.id
                      ? "등록된 제품 영양정보"
                      : "제품 직접 등록 · 100g 기준"}
                  </h3>
                  {product?.incomplete && (
                    <p className="mt-2 text-xs text-amber-600">
                      g 기준 영양정보가 없거나 불완전합니다. 제품 라벨을
                      확인하고 빈 값을 직접 입력하세요. mL를 g으로 간주하지
                      않습니다.
                    </p>
                  )}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        { key: "name", label: "제품명" },
                        { key: "brand", label: "제조사 · 브랜드" },
                        { key: "source", label: "영양정보 출처" },
                      ] as const
                    ).map((f) => (
                      <div key={f.key}>
                        <label htmlFor={`barcode-${f.key}`}>{f.label}</label>
                        <input
                          id={`barcode-${f.key}`}
                          required={f.key !== "brand"}
                          maxLength={f.key === "source" ? 500 : 120}
                          readOnly={Boolean(product?.id)}
                          value={draft[f.key]}
                          onChange={(e) => {
                            setDraft({ ...draft, [f.key]: e.target.value });
                            setChecked(false);
                            setNonce(crypto.randomUUID());
                          }}
                        />
                      </div>
                    ))}
                    {(
                      [
                        { key: "calories", label: "100g당 열량 (kcal)" },
                        { key: "carbs_g", label: "100g당 탄수화물 (g)" },
                        { key: "protein_g", label: "100g당 단백질 (g)" },
                        { key: "fat_g", label: "100g당 지방 (g)" },
                      ] as const
                    ).map((f) => (
                      <div key={f.key}>
                        <label htmlFor={`barcode-${f.key}`}>{f.label}</label>
                        <input
                          id={`barcode-${f.key}`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="100000"
                          step="any"
                          required
                          readOnly={Boolean(product?.id)}
                          value={draft[f.key]}
                          onChange={(e) => {
                            setDraft({ ...draft, [f.key]: e.target.value });
                            setChecked(false);
                            setNonce(crypto.randomUUID());
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <label className="mt-4" htmlFor="barcode-meal">
                    저장할 식사
                  </label>
                  <select
                    id="barcode-meal"
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value as MealType);
                      setNonce(crypto.randomUUID());
                    }}
                  >
                    {mealTypes.map((t) => (
                      <option key={t} value={t}>
                        {mealLabels[t]}
                      </option>
                    ))}
                  </select>
                  <label className="mt-4" htmlFor="barcode-grams">
                    섭취량 (g)
                  </label>
                  <input
                    id="barcode-grams"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="100000"
                    step="any"
                    required
                    value={grams}
                    onChange={(e) => {
                      setGrams(e.target.value);
                      setNonce(crypto.randomUUID());
                    }}
                  />
                  {preview && (
                    <p className="mt-3 text-sm">
                      예상 합계 {fmt(preview.calories)}kcal · 탄{" "}
                      {fmt(preview.carbs_g)}g · 단 {fmt(preview.protein_g)}g ·
                      지 {fmt(preview.fat_g)}g
                    </p>
                  )}
                  <label className="mt-4 flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="!w-5"
                      checked={checked}
                      onChange={(e) => setChecked(e.target.checked)}
                    />
                    <span className="text-xs leading-5">
                      제품 라벨·영양정보·중량을 확인했습니다.{" "}
                      {product?.data_provider === "openfoodfacts" &&
                        "Open Food Facts ODbL-1.0/DbCL-1.0 출처를 유지합니다."}
                    </span>
                  </label>
                  <p className="mt-3 text-xs subtle">
                    기록 날짜 {date} · 등록된 바코드는 기존 내 음식으로
                    기록합니다.
                  </p>
                  <Button
                    className="mt-5 w-full"
                    disabled={busy || !checked || !preview}
                    type="submit"
                  >
                    확인 후 식단에 저장
                  </Button>
                </form>
              )}
            </>
          ) : (
            <>
              <p className="text-sm leading-6 subtle">
                사진만으로 음식 종류·중량·조리 방법을 정확히 알 수 없습니다. AI
                추정치를 수정하고 실제 영양정보가 있는 내 음식과 연결한 뒤
                저장하세요. 사진은 외부 AI로 전송되며 앱 DB에는 보관하지
                않습니다.
              </p>
              <label className="mt-4" htmlFor="food-photo">
                음식 사진 (JPEG·PNG·WebP, 5MB 이하)
              </label>
              <input
                id="food-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setEstimate(null);
                }}
              />
              <label className="mt-4 flex items-start gap-3">
                <input
                  className="!w-5"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span className="text-xs">
                  선택한 사진을 외부 AI 제공처 OpenAI로 전송하는 데 동의합니다.
                </span>
              </label>
              <Button
                className="mt-4"
                disabled={busy || !consent || !file}
                onClick={() =>
                  start(async () => {
                    setMessage({});
                    try {
                      const form = new FormData();
                      form.set("photo", file!);
                      form.set("consent", "yes");
                      const r = await fetch("/api/foods/photo", {
                        method: "POST",
                        body: form,
                      });
                      const d = await r.json();
                      if (!r.ok) throw new Error(d.error);
                      setEstimate(d.result);
                      setConfirmed(
                        d.result.items.map(
                          (i: PhotoResult["items"][number]) => ({
                            food_id: "",
                            grams:
                              i.estimated_grams == null
                                ? ""
                                : String(i.estimated_grams),
                            cooking: i.cooking_method,
                          }),
                        ),
                      );
                      setChecked(false);
                      setNonce(crypto.randomUUID());
                    } catch (e) {
                      setMessage({
                        error:
                          e instanceof Error
                            ? e.message
                            : "사진 분석 요청 실패",
                      });
                    }
                  })
                }
              >
                {busy ? "분석 요청 중…" : "사진 추정 요청"}
              </Button>
              {estimate && (
                <form
                  className="mt-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!checked) return;
                    start(async () => {
                      const r = await savePhotoMeal({
                        date,
                        type,
                        request_id: nonce,
                        items: confirmed.map((c) => ({
                          food_id: c.food_id,
                          grams: Number(c.grams),
                        })),
                        note: estimate.items
                          .map(
                            (i, n) =>
                              `${i.name} · 조리 방법: ${confirmed[n].cooking} · 사용자 확인한 사진 추정`,
                          )
                          .join("\n"),
                      });
                      setMessage(r);
                      if (r.success) setModal(null);
                    });
                  }}
                >
                  <p className="text-sm font-semibold text-amber-600">
                    AI 추정 결과 · 정확한 식별/측정값이 아닙니다
                  </p>
                  <p className="mt-2 text-xs subtle">{estimate.note}</p>
                  {!estimate.items.length && (
                    <p className="mt-3 text-sm">
                      분석 가능한 음식을 찾지 못했습니다. 직접 기록하세요.
                    </p>
                  )}
                  {estimate.items.map((item, i) => (
                    <article
                      key={i}
                      className="mt-4 rounded-xl border border-[var(--border)] p-4"
                    >
                      <h3 className="font-semibold">추정 음식: {item.name}</h3>
                      <p className="mt-2 text-xs subtle">
                        불확실성: {item.uncertainty}
                      </p>
                      <label className="mt-3" htmlFor={`photo-food-${i}`}>
                        확인한 내 음식
                      </label>
                      <select
                        id={`photo-food-${i}`}
                        required
                        value={confirmed[i].food_id}
                        onChange={(e) => {
                          setConfirmed(
                            confirmed.map((c, n) =>
                              n === i ? { ...c, food_id: e.target.value } : c,
                            ),
                          );
                          setChecked(false);
                          setNonce(crypto.randomUUID());
                        }}
                      >
                        <option value="">영양정보가 등록된 음식 선택</option>
                        {foods.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} · {f.brand || "브랜드 없음"}
                          </option>
                        ))}
                      </select>
                      <label className="mt-3" htmlFor={`photo-grams-${i}`}>
                        확인한 섭취량 (g)
                      </label>
                      <input
                        id={`photo-grams-${i}`}
                        type="number"
                        inputMode="decimal"
                        required
                        min="0.01"
                        max="100000"
                        step="any"
                        value={confirmed[i].grams}
                        onChange={(e) => {
                          setConfirmed(
                            confirmed.map((c, n) =>
                              n === i ? { ...c, grams: e.target.value } : c,
                            ),
                          );
                          setChecked(false);
                          setNonce(crypto.randomUUID());
                        }}
                      />
                      <label className="mt-3" htmlFor={`photo-cooking-${i}`}>
                        조리 방법 확인 · 수정
                      </label>
                      <input
                        id={`photo-cooking-${i}`}
                        maxLength={100}
                        value={confirmed[i].cooking}
                        onChange={(e) => {
                          setConfirmed(
                            confirmed.map((c, n) =>
                              n === i ? { ...c, cooking: e.target.value } : c,
                            ),
                          );
                          setChecked(false);
                          setNonce(crypto.randomUUID());
                        }}
                      />
                    </article>
                  ))}
                  {estimate.items.length > 0 && (
                    <>
                      <label className="mt-4" htmlFor="photo-meal">
                        저장할 식사
                      </label>
                      <select
                        id="photo-meal"
                        value={type}
                        onChange={(e) => {
                          setType(e.target.value as MealType);
                          setNonce(crypto.randomUUID());
                        }}
                      >
                        {mealTypes.map((t) => (
                          <option key={t} value={t}>
                            {mealLabels[t]}
                          </option>
                        ))}
                      </select>
                      <label className="mt-4 flex gap-3">
                        <input
                          className="!w-5"
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setChecked(e.target.checked)}
                        />
                        <span className="text-xs leading-5">
                          음식·중량·조리 방법을 직접 확인했습니다. 칼로리는
                          선택한 내 음식의 영양정보로 계산합니다.
                        </span>
                      </label>
                      <Button
                        className="mt-5 w-full"
                        type="submit"
                        disabled={
                          busy ||
                          !checked ||
                          confirmed.some((c) => !c.food_id || !c.grams)
                        }
                      >
                        확인한 음식으로 저장
                      </Button>
                    </>
                  )}
                </form>
              )}
            </>
          )}
        </DietDialog>
      )}
    </section>
  );
}
