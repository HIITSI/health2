import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ranges, type Range } from "@/lib/wellness/model";
export function AnalysisNavigation({
  end,
  range,
  tab,
}: {
  end: string;
  range: Range;
  tab: "body" | "nutrition" | "workout";
}) {
  return (
    <nav className="mt-5 flex flex-wrap gap-2" aria-label="분석 종류">
      {[
        { key: "body", label: "체성분" },
        { key: "nutrition", label: "영양 분석" },
        { key: "workout", label: "운동 성장" },
      ].map((t) => (
        <Button
          asChild
          key={t.key}
          variant={tab === t.key ? "default" : "outline"}
        >
          <Link
            aria-current={tab === t.key ? "page" : undefined}
            href={`/analytics?end=${end}&range=${range}&tab=${t.key}`}
          >
            {t.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
export function PeriodControls({
  end,
  range,
  tab,
  exercise,
}: {
  end: string;
  range: Range;
  tab: "nutrition" | "workout";
  exercise?: string;
}) {
  const suffix = exercise ? `&exercise=${exercise}` : "";
  return (
    <section className="card mt-5">
      <div className="flex flex-wrap gap-2" aria-label="분석 기간">
        {ranges.map((r) => (
          <Button
            key={r}
            asChild
            size="sm"
            variant={r === range ? "default" : "outline"}
          >
            <Link
              aria-current={r === range ? "true" : undefined}
              href={`/analytics?end=${end}&range=${r}&tab=${tab}${suffix}`}
            >
              {r === "all" ? "전체 기간" : `${r}일`}
            </Link>
          </Button>
        ))}
      </div>
      <form action="/analytics" className="mt-4 flex items-end gap-3">
        <input type="hidden" name="range" value={range} />
        <input type="hidden" name="tab" value={tab} />
        {exercise && <input type="hidden" name="exercise" value={exercise} />}
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="analysis-end">기간 종료일</label>
          <input
            id="analysis-end"
            name="end"
            type="date"
            required
            min="1900-01-01"
            max="2100-12-31"
            defaultValue={end}
          />
        </div>
        <Button type="submit" variant="outline">
          기간 조회
        </Button>
      </form>
      <p className="mt-3 text-xs subtle">
        한국 날짜 · 종료일 포함 · 주간 통계는 선택 기간 안의 월~일 기록만
        포함합니다.
      </p>
    </section>
  );
}
