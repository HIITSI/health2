"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="card" role="alert">
      <h2 className="text-lg font-bold">화면을 불러오지 못했습니다</h2>
      <p className="mt-3 text-sm subtle">
        연결을 확인하고 다시 시도하세요. 저장 여부는 재접속 후 각 기록에서
        확인할 수 있습니다.
      </p>
      <Button className="mt-4" onClick={reset}>
        다시 불러오기
      </Button>
    </section>
  );
}
