"use client";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveDefaultRest } from "@/app/(app)/workout/service-actions";
import type { Exercise } from "@/lib/workout/model";
export function ExerciseRest({
  exercise,
  enabled,
  onSaved,
}: {
  exercise: Exercise;
  enabled: boolean;
  onSaved?: (seconds: number | null, version: number) => void;
}) {
  const [seconds, setSeconds] = useState(
      exercise.default_rest_seconds == null
        ? ""
        : String(exercise.default_rest_seconds),
    ),
    [message, setMessage] = useState(""),
    [busy, start] = useTransition();
  useEffect(() => {
    setSeconds(
      exercise.default_rest_seconds == null
        ? ""
        : String(exercise.default_rest_seconds),
    );
  }, [exercise.default_rest_seconds, exercise.settings_version]);
  return (
    <div className="mt-4 rounded-xl bg-[var(--muted)] p-3">
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={`default-rest-${exercise.id}`}>
            종목 기본 휴식 (초)
          </label>
          <input
            id={`default-rest-${exercise.id}`}
            type="number"
            inputMode="numeric"
            min="0"
            max="3600"
            step="1"
            placeholder="미설정"
            value={seconds}
            disabled={!enabled || busy}
            onChange={(e) => setSeconds(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!enabled || busy}
          onClick={() =>
            start(async () => {
              const r = await saveDefaultRest(
                exercise.id,
                exercise.settings_version || 0,
                seconds === "" ? null : Number(seconds),
              );
              setMessage(r.error || r.success || "");
              if (r.success)
                onSaved?.(
                  seconds === "" ? null : Number(seconds),
                  (exercise.settings_version || 0) + 1,
                );
            })
          }
        >
          휴식 설정 저장
        </Button>
      </div>
      <p className="mt-2 text-xs subtle">
        세트별 휴식 값이 있으면 우선 적용합니다. 0초는 자동 시작하지 않습니다.
        기존 세트의 휴식 기록은 바꾸지 않습니다.
      </p>
      {message && (
        <p className="mt-2 text-xs" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
