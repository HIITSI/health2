import { account, check, failure, ServiceError } from "@/lib/service/server";
export async function GET() {
  try {
    const { client } = await account("export");
    const r = await client.rpc("data_backup");
    check(r.error);
    const rows = Object.values(
      r.data.tables as Record<string, unknown[]>,
    ).reduce((n, r) => n + r.length, 0);
    if (rows > 20000)
      throw new ServiceError(
        "복구 지원 범위 20,000행을 초과합니다. 운영자 DB 백업을 이용하세요.",
        413,
      );
    const text = JSON.stringify(r.data, null, 2);
    if (Buffer.byteLength(text) > 10 * 1024 * 1024)
      throw new ServiceError(
        "백업이 10MB를 초과합니다. 운영자 DB 백업을 이용하세요.",
        413,
      );
    return new Response(text, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": "attachment; filename=fitlog-backup-v1.json",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
