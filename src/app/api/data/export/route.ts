import { account, check, failure } from "@/lib/service/server";
import { exportSchema } from "@/lib/service/model";
import { csv, xlsx, type Cell } from "@/lib/service/exports";
const headings = {
  diet: [
    "기록 날짜",
    "식사",
    "음식명",
    "브랜드",
    "섭취량(g)",
    "열량(kcal)",
    "탄수화물(g)",
    "단백질(g)",
    "지방(g)",
    "출처",
    "식사 메모",
  ],
  workout: [
    "기록 날짜",
    "세션 상태",
    "운동 종목",
    "부위",
    "세트",
    "세트 종류",
    "중량(kg)",
    "반복",
    "강도 기준",
    "강도 값",
    "휴식(초)",
    "세트 완료",
    "운동 메모",
    "세션 메모",
  ],
  body: [
    "측정 날짜",
    "측정 시각",
    "체중(kg)",
    "골격근량(kg)",
    "체지방률(%)",
    "체지방량(kg)",
    "체지방량 출처",
    "허리둘레(cm)",
    "신장(cm)",
    "메모",
  ],
};
export async function GET(request: Request) {
  try {
    const { client } = await account("export");
    const p = exportSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const r = await client.rpc("data_export", {
      p_start: p.start,
      p_end: p.end,
      p_kind: p.kind,
    });
    check(r.error);
    const rows: Cell[][] = [headings[p.kind], ...(r.data as Cell[][])];
    const content = p.format === "csv" ? csv(rows) : new Uint8Array(xlsx(rows));
    return new Response(content, {
      headers: {
        "Content-Type":
          p.format === "csv"
            ? "text/csv; charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="fitlog-${p.kind}-${p.start}-${p.end}.${p.format}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
