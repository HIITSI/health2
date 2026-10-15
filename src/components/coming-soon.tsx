import {
  CalendarDays,
  ChartNoAxesCombined,
  Dumbbell,
  Utensils,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
const icons = {
  diet: Utensils,
  workout: Dumbbell,
  calendar: CalendarDays,
  analytics: ChartNoAxesCombined,
};
export function ComingSoon({
  title,
  description,
  kind,
}: {
  title: string;
  description: string;
  kind: keyof typeof icons;
}) {
  const Icon = icons[kind];
  return (
    <>
      <p className="text-sm subtle">MY HEALTH SPACE</p>
      <h1 className="mt-3 text-3xl font-bold">{title}</h1>
      <p className="mt-3 subtle">{description}</p>
      <section className="card mt-8 flex min-h-96 flex-col items-center justify-center text-center">
        <div className="rounded-2xl bg-blue-500/10 p-5 text-blue-500">
          <Icon size={36} />
        </div>
        <span className="mt-7 rounded-full bg-[var(--muted)] px-3 py-1 text-xs subtle">
          다음 단계에서 제공 예정
        </span>
        <h2 className="mt-4 text-xl font-bold">차근차근 준비하고 있어요</h2>
        <p className="mt-3 max-w-md text-sm leading-6 subtle">
          현재 계정·기본 환경 관리와 식단·운동 기록을 사용할 수 있습니다.
          <br />이 화면의 기록·조회·분석 기능은 아직 구현되지 않았습니다.
        </p>
        <Button asChild variant="outline" className="mt-7">
          <Link href="/">
            <ArrowLeft size={16} />
            홈으로 돌아가기
          </Link>
        </Button>
      </section>
    </>
  );
}
