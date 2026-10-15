import sharp from "sharp";
import {
  account,
  failure,
  photoEnabled,
  sameOrigin,
  ServiceError,
  limitedBody,
} from "@/lib/service/server";
import { analyzePhoto } from "@/lib/service/providers";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await account("photo");
    if (!photoEnabled())
      throw new ServiceError(
        "음식 사진 AI 미연결 · 분석을 사용할 수 없습니다.",
        503,
      );
    if (Number(request.headers.get("content-length") || 0) > 6 * 1024 * 1024)
      throw new ServiceError("사진은 5MB까지 업로드할 수 있습니다.", 413);
    const raw = await limitedBody(request, 6 * 1024 * 1024);
    const f = await new Response(raw, {
        headers: { "Content-Type": request.headers.get("content-type") || "" },
      }).formData(),
      file = f.get("photo");
    if (f.get("consent") !== "yes")
      throw new ServiceError("외부 AI 전송에 동의한 뒤 요청하세요.");
    if (
      !(file instanceof File) ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new ServiceError("5MB 이하 JPEG·PNG·WebP 사진을 선택하세요.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const image = sharp(bytes, { limitInputPixels: 16000000, animated: false });
    const meta = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format || ""))
      throw new ServiceError("지원하지 않는 이미지입니다.");
    const sanitized = await image
      .rotate()
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return Response.json(
      { result: await analyzePhoto(sanitized), estimated: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
