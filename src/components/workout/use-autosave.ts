"use client";
import { useEffect, useRef, useState } from "react";
import { saveWorkoutRow } from "@/app/(app)/workout/actions";
export function useAutosave<T extends object>(
  kind: "set" | "entry" | "session",
  key: string,
  id: string,
  initial: T,
  version: number,
  onPending: (id: string, pending: boolean) => void,
  onSaved?: (values: T) => void,
) {
  const [values, setValues] = useState<T>(initial);
  const [status, setStatus] = useState("DB 저장됨");
  const [conflict, setConflict] = useState<Record<string, unknown> | null>(
    null,
  );
  const latest = useRef(initial),
    base = useRef(version),
    seq = useRef(0),
    dirty = useRef(false),
    inFlight = useRef(false),
    mounted = useRef(true),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    conflicted = useRef(false);
  const persist = useRef(() => {});
  const save = useRef<() => Promise<void>>(async () => {});
  const pendingCallback = useRef(onPending);
  pendingCallback.current = onPending;
  const savedCallback = useRef(onSaved);
  savedCallback.current = onSaved;
  persist.current = () => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ values: latest.current, version: base.current }),
      );
    } catch {
      if (mounted.current) setStatus("기기 임시 저장 불가 · DB 저장 대기");
    }
  };
  function queue(immediate = false) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        void save.current();
      },
      immediate ? 0 : 600,
    );
  }
  save.current = async () => {
    if (inFlight.current || !dirty.current || conflicted.current) return;
    inFlight.current = true;
    const captured = seq.current;
    const snapshot = latest.current;
    if (mounted.current) setStatus("DB 저장 중…");
    try {
      const numericKeys =
        kind === "set"
          ? ["weight_kg", "reps", "effort_value", "rest_seconds"]
          : kind === "entry"
            ? ["target_weight", "target_reps", "target_sets"]
            : [];
      const payload = Object.fromEntries(
        Object.entries(snapshot).map(([k, v]) => [
          k,
          numericKeys.includes(k)
            ? v === "" || v === null
              ? null
              : Number(v)
            : v,
        ]),
      );
      const result = await saveWorkoutRow(kind, id, base.current, payload);
      if (result.conflict) {
        if (!result.row || !Number.isInteger(result.row.version)) {
          if (mounted.current)
            setStatus(
              "최신 기록을 불러오지 못했습니다. 새로고침 후 확인하세요.",
            );
          return;
        }
        conflicted.current = true;
        if (mounted.current) {
          setConflict(result.row);
          setStatus(result.error || "저장 충돌");
        }
        return;
      }
      if (result.error || !result.row) {
        if (mounted.current) setStatus(result.error || "DB 저장 실패");
        return;
      }
      base.current = Number(result.row.version);
      if (captured === seq.current) {
        dirty.current = false;
        try {
          localStorage.removeItem(key);
        } catch {}
        if (mounted.current) setStatus("DB 자동 저장 완료");
        pendingCallback.current(id, false);
        savedCallback.current?.(snapshot);
      } else {
        persist.current();
        if (mounted.current) setStatus("추가 입력 저장 대기");
      }
    } catch {
      if (mounted.current) setStatus("네트워크 오류 · 기기 임시 입력 유지");
    } finally {
      inFlight.current = false;
      if (
        dirty.current &&
        captured !== seq.current &&
        !conflicted.current &&
        mounted.current
      )
        queue(true);
    }
  };
  function change(next: T, immediate = false) {
    latest.current = next;
    seq.current++;
    dirty.current = true;
    setValues(next);
    setStatus("기기 임시 저장 · DB 저장 대기");
    pendingCallback.current(id, true);
    persist.current();
    queue(immediate);
  }
  useEffect(() => {
    mounted.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (
          saved &&
          saved.values !== null &&
          typeof saved.values === "object" &&
          !Array.isArray(saved.values) &&
          Number.isInteger(saved.version) &&
          saved.version >= 0 &&
          Object.keys(initial).every(
            (k) =>
              typeof saved.values[k] ===
              typeof (initial as Record<string, unknown>)[k],
          )
        ) {
          latest.current = saved.values;
          setValues(saved.values);
          dirty.current = true;
          pendingCallback.current(id, true);
          if (saved.version !== version) {
            conflicted.current = true;
            setConflict({ ...initial, version });
            setStatus("다른 저장과 임시 입력이 충돌했습니다.");
          } else {
            base.current = saved.version;
            setStatus("임시 입력 복구 · DB 저장 대기");
            queue(true);
          }
        }
      }
    } catch {
      setStatus("임시 입력을 읽지 못했습니다. 서버 기록을 확인하세요.");
    }
    const online = () => {
      void save.current();
    };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", beforeUnload);
      pendingCallback.current(id, false);
    };
    // key identifies a user and immutable row. Revalidation must not reset newer local edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (version > base.current && !dirty.current && !inFlight.current) {
      base.current = version;
      latest.current = initial;
      setValues(initial);
      setStatus("서버 기록 갱신");
    }
  }, [version, initial]);
  function resolve(useMine: boolean) {
    if (!conflict) return;
    const { version: newVersion, ...server } = conflict;
    base.current = Number(newVersion);
    conflicted.current = false;
    setConflict(null);
    if (useMine) {
      seq.current++;
      persist.current();
      queue(true);
      setStatus("내 입력 저장 대기");
    } else {
      const numericKeys =
        kind === "set"
          ? ["weight_kg", "reps", "effort_value", "rest_seconds"]
          : kind === "entry"
            ? ["target_weight", "target_reps", "target_sets"]
            : [];
      const replacement = Object.fromEntries(
        Object.keys(initial).map((k) => [
          k,
          numericKeys.includes(k)
            ? server[k] == null
              ? ""
              : String(server[k])
            : server[k],
        ]),
      ) as T;
      latest.current = replacement;
      setValues(replacement);
      dirty.current = false;
      try {
        localStorage.removeItem(key);
      } catch {}
      pendingCallback.current(id, false);
      setStatus("서버 값 사용");
    }
  }
  return {
    values,
    change,
    status,
    conflict,
    retry: () => {
      void save.current();
    },
    resolve,
  };
}
