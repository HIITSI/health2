import type { BarcodeProduct } from "./model.ts";
export function parseOffProduct(
  json: unknown,
  code: string,
): BarcodeProduct | null {
  const result = json as {
    product?: {
      product_name_ko?: string;
      product_name?: string;
      brands?: string;
      nutrition_data_per?: string;
      nutriments?: Record<string, unknown>;
    };
  };
  if (!result.product) return null;
  const p = result.product,
    n = p.nutriments || {};
  const nums = [
    n["energy-kcal_100g"],
    n.carbohydrates_100g,
    n.proteins_100g,
    n.fat_100g,
  ];
  const complete =
    p.nutrition_data_per === "100g" &&
    nums.every(
      (v) =>
        typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100000,
    );
  return {
    barcode: code,
    name: (p.product_name_ko || p.product_name || "이름 미등록 제품").slice(
      0,
      120,
    ),
    brand: (p.brands || "").slice(0, 120),
    reference_grams: 100,
    source: `Open Food Facts · ODbL-1.0 / DbCL-1.0 · https://world.openfoodfacts.org/product/${code}`,
    data_provider: "openfoodfacts",
    calories: complete ? (nums[0] as number) : null,
    carbs_g: complete ? (nums[1] as number) : null,
    protein_g: complete ? (nums[2] as number) : null,
    fat_g: complete ? (nums[3] as number) : null,
    incomplete: !complete,
  };
}
