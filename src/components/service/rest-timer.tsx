"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  timerSchema,
  restRemaining,
  pauseRest,
  resumeRest,
  type RestState,
} from "@/lib/service/model";
export type RestStart = { id: string; label: string; seconds: number };
export function RestTimer({
  userId,
  signal,
}: {
  userId: string;
  signal: RestStart | null;
}) {
  const key = `fitlog:rest:${userId}`;
  const [state, setState] = useState<RestState | null>(null),
    [now, setNow] = useState(0),
    [seconds, setSeconds] = useState("90"),
    [permission, setPermission] = useState("default"),
    [sound, setSound] = useState(false),
    [message, setMessage] = useState("");
  const current = useRef<RestState | null>(null),
    audio = useRef<AudioContext | null>(null),
    seen = useRef<string | null>(null),
    alive = useRef(true);
  function store(next: RestState | null) {
    current.current = next;
    setState(next);
    try {
      if (next) localStorage.setItem(key, JSON.stringify(next));
      else localStorage.removeItem(key);
    } catch {
      setMessage(
        "기기 저장을 사용할 수 없습니다. 새로고침하면 타이머가 초기화될 수 있습니다.",
      );
    }
  }
  function start(seconds: number, label: string, id = crypto.randomUUID()) {
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) {
      setMessage(
        "휴식 시간을 1~3,600초로 설정하세요. 0초 설정은 자동 시작하지 않습니다.",
      );
      return;
    }
    const n = Date.now();
    setNow(n);
    store({
      id,
      label,
      duration: seconds,
      remaining_ms: seconds * 1000,
      deadline: n + seconds * 1000,
      status: "running",
      notified: false,
    });
    setSeconds(String(seconds));
    setMessage("");
  }
  useEffect(() => {
    alive.current = true;
    setNow(Date.now());
    setPermission(
      "Notification" in window ? Notification.permission : "unsupported",
    );
    try {
      const r = timerSchema.safeParse(
        JSON.parse(localStorage.getItem(key) || "null"),
      );
      if (r.success) {
        current.current = r.data;
        setState(r.data);
        setSeconds(String(r.data.duration));
      }
    } catch {}
    const tick = () => {
      if (current.current?.status === "running") setNow(Date.now());
    };
    const external = (e: StorageEvent) => {
      if (e.key === key) {
        const r = timerSchema.safeParse(JSON.parse(e.newValue || "null"));
        current.current = r.success ? r.data : null;
        setState(current.current);
      }
    };
    const interval = setInterval(tick, 250);
    window.addEventListener("focus", tick);
    window.addEventListener("storage", external);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive.current = false;
      clearInterval(interval);
      window.removeEventListener("focus", tick);
      window.removeEventListener("storage", external);
      document.removeEventListener("visibilitychange", tick);
      void audio.current?.close();
    };
  }, [key]);
  useEffect(() => {
    if (signal && seen.current !== signal.id) {
      seen.current = signal.id;
      start(signal.seconds, signal.label, signal.id);
    }
  }, [signal]);
  useEffect(() => {
    if (!state || state.status !== "running" || restRemaining(state, now) > 0)
      return;
    const finished = {
      ...state,
      status: "finished" as const,
      deadline: null,
      remaining_ms: 0,
    };
    store(finished);
  }, [now, state]);
  useEffect(() => {
    if (!state || state.status !== "finished" || state.notified) return;
    const alert = async () => {
      let saved: RestState | null = null;
      try {
        const raw = timerSchema.safeParse(
          JSON.parse(localStorage.getItem(key) || "null"),
        );
        if (raw.success) saved = raw.data;
      } catch {}
      if (saved?.id !== state.id || saved.notified) return;
      store({ ...state, notified: true });
      if (sound && audio.current && audio.current.state === "running") {
        try {
          const osc = audio.current.createOscillator(),
            gain = audio.current.createGain();
          osc.frequency.value = 880;
          gain.gain.value = 0.12;
          osc.connect(gain);
          gain.connect(audio.current.destination);
          osc.start();
          osc.stop(audio.current.currentTime + 0.3);
        } catch {}
      }
      if ("vibrate" in navigator && document.visibilityState === "visible")
        navigator.vibrate([150, 100, 150]);
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration)
            await registration.showNotification("휴식이 끝났어요", {
              body: state.label,
              tag: `fitlog-rest-${state.id}`,
              icon: "/icon-192.png",
            });
          else
            new Notification("휴식이 끝났어요", {
              body: state.label,
              tag: `fitlog-rest-${state.id}`,
            });
        } catch {
          if (alive.current)
            setMessage(
              "휴식이 끝났습니다. 이 브라우저에서는 시스템 알림을 표시하지 못했습니다.",
            );
        }
      }
    };
    if (navigator.locks)
      void navigator.locks.request(`fitlog-rest-alert:${state.id}`, alert);
    else void alert();
  }, [state, sound, key]);
  const left = state ? Math.ceil(restRemaining(state, now) / 1000) : 0,
    valid =
      Number.isInteger(Number(seconds)) &&
      Number(seconds) >= 1 &&
      Number(seconds) <= 3600;
  return (
    <section className="card mt-5" aria-label="운동 휴식 타이머">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">휴식 타이머</h2>
          <p className="mt-2 text-xs subtle">
            {state?.label || "완료 세트 저장 후 설정 시간으로 시작"}
          </p>
        </div>
        <p
          className="text-4xl font-bold tabular-nums text-blue-600"
          aria-label="남은 휴식 시간"
          data-testid="rest-remaining"
        >
          {String(Math.floor(left / 60)).padStart(2, "0")}:
          {String(left % 60).padStart(2, "0")}
        </p>
      </div>
      {state?.status === "finished" && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-blue-500/10 p-3 font-semibold text-blue-600"
        >
          휴식이 끝났어요. 다음 세트를 준비하세요.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {state?.status === "running" && (
          <Button onClick={() => store(pauseRest(state, Date.now()))}>
            휴식 일시정지
          </Button>
        )}
        {state?.status === "paused" && (
          <Button onClick={() => store(resumeRest(state, Date.now()))}>
            휴식 계속
          </Button>
        )}
        {state && (
          <Button
            variant="outline"
            onClick={() =>
              store({
                ...state,
                remaining_ms: state.duration * 1000,
                status: "idle",
                deadline: null,
                notified: false,
              })
            }
          >
            휴식 초기화
          </Button>
        )}
      </div>
      <div className="mt-4 flex items-end gap-3">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="manual-rest">수동 휴식 시간 (초)</label>
          <input
            id="manual-rest"
            type="number"
            inputMode="numeric"
            min="1"
            max="3600"
            step="1"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          disabled={!valid}
          onClick={() => start(Number(seconds), "수동 휴식")}
        >
          휴식 시작
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={
            permission === "unsupported" ||
            permission === "denied" ||
            permission === "granted"
          }
          onClick={async () => {
            try {
              setPermission(await Notification.requestPermission());
            } catch {
              setPermission("unsupported");
            }
          }}
        >
          {permission === "granted"
            ? "시스템 알림 허용됨"
            : permission === "denied"
              ? "알림 차단됨"
              : permission === "unsupported"
                ? "시스템 알림 미지원"
                : "알림 사용"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            if (sound) {
              setSound(false);
              return;
            }
            try {
              audio.current ??= new AudioContext();
              await audio.current.resume();
              setSound(true);
            } catch {
              setMessage("이 기기에서는 소리 알림을 사용할 수 없습니다.");
            }
          }}
        >
          {sound ? "소리 끄기" : "소리 켜기"}
        </Button>
      </div>
      {message && (
        <p className="mt-3 text-xs text-amber-600" role="status">
          {message}
        </p>
      )}
      <p className="mt-3 text-xs leading-5 subtle">
        타이머는 이 기기에 저장됩니다. 화면 잠금·앱 종료·백그라운드에서는
        브라우저가 실행을 멈출 수 있어 제시간 알림을 보장하지 않습니다. 다시
        열면 종료 시각으로 남은 시간을 확인합니다. iPhone 시스템 알림은 홈 화면
        앱과 지원 버전이 필요합니다.
      </p>
    </section>
  );
}
