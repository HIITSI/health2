import { account, check, failure, offEnabled } from "@/lib/service/server";
import { barcodeSchema } from "@/lib/service/model";
import { lookupOff } from "@/lib/service/providers";
import { scaleNutrition } from "@/lib/diet/nutrition";
export async function GET(request: Request) {
  try {
    const { client, user } = await account("barcode");
    const code = barcodeSchema.parse(
      new URL(request.url).searchParams.get("code"),
    );
    const r = await client
      .from("foods")
      .select(
        "id,name,brand,source,reference_grams,serving_grams,calories,carbs_g,protein_g,fat_g,barcode,data_provider",
      )
      .eq("user_id", user.id)
      .eq("barcode", code)
      .maybeSingle();
    check(r.error);
    if (r.data)
      return Response.json(
        {
          product: {
            ...r.data,
            ...scaleNutrition(r.data, r.data.serving_grams, 100),
            reference_grams: 100,
          },
          origin: "saved",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    if (!offEnabled())
      return Response.json(
        {
          product: null,
          external: false,
          message:
            "내 음식에 등록된 제품이 없습니다. 외부 제품 DB 미연결 · 직접 등록할 수 있습니다.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    check((await client.rpc("access_take", { p_scope: "off" })).error);
    return Response.json(
      { product: await lookupOff(code), external: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
