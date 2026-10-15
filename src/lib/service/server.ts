import "server-only";
import { supabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function sameOrigin(request: Request) {
  const supplied = request.headers.get("origin");
  let valid = false;
  try {
    const origin = new URL(supplied || "");
    valid = process.env.FITLOG_APP_ORIGIN
      ? origin.origin === new URL(process.env.FITLOG_APP_ORIGIN).origin
      : ["http:", "https:"].includes(origin.protocol) &&
        origin.host.toLowerCase() ===
          request.headers.get("host")?.toLowerCase();
  } catch {}
  if (!valid) throw new ServiceError("이 앱에서 다시 요청하세요.", 403);
}
export async function account(scope?: string) {
  const client = await supabase();
  if (!client)
    throw new ServiceError("Supabase 연결 후 사용할 수 있습니다.", 503);
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new ServiceError("다시 로그인해 주세요.", 401);
  if (scope) {
    const r = await client.rpc("access_take", { p_scope: scope });
    check(r.error);
  }
  return { client, user };
}
export function check(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "PT429")
    throw new ServiceError("요청이 많습니다. 잠시 후 다시 시도하세요.", 429);
  if (error.code === "PT409")
    throw new ServiceError(
      "다른 기기의 데이터가 변경되었거나 복구할 계정에 기록이 있습니다. 최신 상태를 확인하세요.",
      409,
    );
  throw new ServiceError(
    "요청을 처리하지 못했습니다. 입력·권한·연결을 확인하세요.",
    400,
  );
}
export function failure(error: unknown) {
  const status = error instanceof ServiceError ? error.status : 400;
  return Response.json(
    {
      error:
        error instanceof ServiceError
          ? error.message
          : "입력 또는 연결 상태를 확인하세요.",
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
export async function reauthenticate(
  email: string | undefined,
  password: string,
  uid: string,
) {
  if (!email || !password || password.length > 128)
    throw new ServiceError("비밀번호를 확인해 주세요.", 400);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const r = await client.auth.signInWithPassword({ email, password });
  if (r.error || r.data.user?.id !== uid)
    throw new ServiceError("비밀번호를 확인해 주세요.", 403);
  return client;
}
export const photoEnabled = () =>
  Boolean(
    process.env.FITLOG_PHOTO_PROVIDER === "openai" &&
    process.env.FITLOG_PHOTO_API_KEY &&
    process.env.FITLOG_PHOTO_MODEL,
  );
export const offEnabled = () =>
  Boolean(
    process.env.FITLOG_BARCODE_PROVIDER === "openfoodfacts" &&
    process.env.FITLOG_OFF_LICENSE_ACKNOWLEDGED === "true" &&
    process.env.FITLOG_OFF_CONTACT,
  );
export async function limitedBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new ServiceError("요청 내용이 없습니다.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > limit) {
        await reader.cancel();
        throw new ServiceError("업로드 용량 제한을 초과했습니다.", 413);
      }
      chunks.push(r.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
