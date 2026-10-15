"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function InstallCard() {
  const [event, setEvent] = useState<InstallEvent | null>(null),
    [installed, setInstalled] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const media = matchMedia("(display-mode: standalone)");
    const check = () =>
      setInstalled(
        media.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    check();
    const ready = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    media.addEventListener("change", check);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
      media.removeEventListener("change", check);
    };
  }, []);
  return (
    <section className="card mt-6" aria-label="홈 화면 설치">
      <h2 className="text-lg font-bold">홈 화면에 설치</h2>
      <p className="mt-3 text-sm subtle">
        {installed
          ? "설치된 앱 화면으로 사용 중입니다."
          : "Android/PC는 브라우저 메뉴의 앱 설치, iPhone은 Safari 공유 메뉴 → 홈 화면에 추가를 선택하세요."}
      </p>
      {!installed && event && (
        <Button
          className="mt-4"
          onClick={async () => {
            try {
              await event.prompt();
              const r = await event.userChoice;
              setMessage(
                r.outcome === "accepted"
                  ? "설치를 요청했습니다."
                  : "설치를 취소했습니다.",
              );
            } catch {
              setMessage("브라우저 메뉴에서 설치를 선택하세요.");
            }
            setEvent(null);
          }}
        >
          앱 설치
        </Button>
      )}
      {message && (
        <p className="mt-3 text-sm" role="status">
          {message}
        </p>
      )}
      <p className="mt-3 text-xs leading-5 subtle">
        HTTPS 서비스에서 기기·브라우저에 따라 설치를 지원합니다. 개인정보
        페이지를 캐시하지 않으며 앱 설치가 전체 오프라인 기록을 제공하는 것은
        아닙니다.
      </p>
    </section>
  );
}
export function NetworkStatus() {
  const router = useRouter(),
    [offline, setOffline] = useState(false),
    [checking, setChecking] = useState(false),
    [busy, start] = useTransition();
  useEffect(() => {
    setOffline(!navigator.onLine);
    const refresh = () => {
      if (navigator.onLine) {
        setChecking(true);
        start(() => router.refresh());
      }
    };
    const on = () => {
      setOffline(false);
      refresh();
    };
    const off = () => setOffline(true);
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [router]);
  useEffect(() => {
    if (checking && !busy) {
      const timer = setTimeout(() => setChecking(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [busy, checking]);
  if (!offline && !checking) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-40 bg-amber-100 px-4 py-3 text-center text-xs text-amber-950"
    >
      {offline
        ? "오프라인입니다. 열린 운동 화면의 임시 입력은 복구를 시도합니다. 식단·사진·백업은 연결 후 사용하세요."
        : "연결·화면 복귀 후 최신 기록을 확인하고 있습니다. 각 입력의 저장 상태와 충돌 안내를 확인하세요."}
    </div>
  );
}
