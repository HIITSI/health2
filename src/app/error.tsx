"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="card mx-auto my-10 max-w-lg text-center">
      <h1 className="text-2xl font-bold">화면을 불러오지 못했어요</h1>
      <p className="my-5 subtle">
        잠시 후 다시 시도해 주세요. 문제가 계속되면 연결 설정을 확인하세요.
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </section>
  );
}
