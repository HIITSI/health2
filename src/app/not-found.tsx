import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="mx-auto mt-24 max-w-lg px-5 text-center">
      <h1 className="text-3xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="my-6 subtle">
        주소가 변경되었거나 존재하지 않는 페이지입니다.
      </p>
      <Button asChild>
        <Link href="/">홈으로 이동</Link>
      </Button>
    </main>
  );
}
