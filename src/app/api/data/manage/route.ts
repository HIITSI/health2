import { z } from "zod";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { backupSchema } from "@/lib/service/model";
import {
  account,
  check,
  failure,
  reauthenticate,
  sameOrigin,
  ServiceError,
  limitedBody,
} from "@/lib/service/server";
export async function GET() {
  try {
    const { client } = await account();
    const r = await client.rpc("data_status");
    check(r.error);
    return Response.json(r.data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user, client: original } = await account();
    const raw = await limitedBody(request, 11 * 1024 * 1024);
    const p = z
      .object({
        action: z.enum(["restore", "clear", "withdraw"]),
        password: z.string().min(1).max(128),
        confirmation: z.string(),
        revision: z.number().int().nonnegative(),
        backup: z.unknown().optional(),
      })
      .parse(JSON.parse(raw.toString("utf8")));
    check(
      (
        await original.rpc("access_take", {
          p_scope: p.action === "restore" ? "restore" : "delete",
        })
      ).error,
    );
    if (
      p.confirmation !==
      { restore: "복구", clear: "기록 삭제", withdraw: "회원 탈퇴" }[p.action]
    )
      throw new ServiceError("확인 문구를 정확히 입력하세요.");
    const verified = await reauthenticate(user.email, p.password, user.id);
    try {
      if (p.action === "restore") {
        const b = backupSchema.parse(p.backup);
        if (b.owner_id !== user.id)
          throw new ServiceError("현재 계정의 백업만 복구할 수 있습니다.");
        const checksum = createHash("sha256")
          .update(JSON.stringify(b))
          .digest("hex");
        const r = await verified.rpc("data_restore", {
          p_backup: b,
          p_checksum: checksum,
          p_revision: p.revision,
        });
        check(r.error);
        revalidatePath("/", "layout");
        return Response.json(
          {
            success:
              r.data === "already_restored"
                ? "이미 복구한 백업입니다. 중복 저장하지 않았습니다."
                : "백업을 복구했습니다.",
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      const r = await verified.rpc(
        p.action === "clear" ? "data_clear" : "data_delete_account",
        p.action === "clear" ? { p_revision: p.revision } : {},
      );
      check(r.error);
      if (p.action === "withdraw")
        await original.auth.signOut({ scope: "local" });
      revalidatePath("/", "layout");
      return Response.json(
        {
          success:
            p.action === "clear"
              ? "기록을 삭제했습니다. 계정과 프로필은 유지됩니다."
              : "회원 탈퇴를 완료했습니다.",
          withdrawn: p.action === "withdraw",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      await verified.auth.signOut({ scope: "local" });
    }
  } catch (e) {
    return failure(e);
  }
}
