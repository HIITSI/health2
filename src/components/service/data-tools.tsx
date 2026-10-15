"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DietDialog } from "@/components/diet/dialog";
import { backupSchema, type Backup } from "@/lib/service/model";
import { shiftDate } from "@/lib/diet/nutrition";
export function DataTools({
  enabled,
  userId,
  today,
}: {
  enabled: boolean;
  userId: string;
  today: string;
}) {
  const router = useRouter();
  const [start, setStart] = useState(shiftDate(today, -29)),
    [end, setEnd] = useState(today),
    [kind, setKind] = useState("diet"),
    [format, setFormat] = useState("csv"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [backup, setBackup] = useState<Backup | null>(null),
    [modal, setModal] = useState<"restore" | "clear" | "withdraw" | null>(null),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [revision, setRevision] = useState(0);
  async function download(url: string, name: string) {
    setBusy(true);
    setMessage({});
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok)
        throw new Error((await r.json()).error || "내보내기에 실패했습니다.");
      const object = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = object;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(object), 1000);
      setMessage({
        success: "다운로드를 요청했습니다. 파일을 안전하게 보관하세요.",
      });
    } catch (e) {
      setMessage({
        error:
          e instanceof Error
            ? e.message
            : "네트워크 오류로 내보내지 못했습니다.",
      });
    } finally {
      setBusy(false);
    }
  }
  async function open(action: typeof modal) {
    setBusy(true);
    setMessage({});
    setPassword("");
    setConfirm("");
    try {
      const r = await fetch("/api/data/manage", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setRevision(d.revision);
      if (action === "restore" && d.records > 0)
        throw new Error(
          "복구는 기록이 빈 계정에서만 가능합니다. 현재 기록을 먼저 백업하고 삭제 여부를 직접 결정하세요.",
        );
      setModal(action);
    } catch (e) {
      setMessage({
        error:
          e instanceof Error ? e.message : "현재 상태를 확인하지 못했습니다.",
      });
    } finally {
      setBusy(false);
    }
  }
  async function manage() {
    if (!modal) return;
    setBusy(true);
    setMessage({});
    try {
      const r = await fetch("/api/data/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: modal,
          password,
          confirmation: confirm,
          revision,
          ...(modal === "restore" ? { backup } : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      for (const key of Object.keys(localStorage))
        if (
          key.startsWith(`fitlog:workout:${userId}:`) ||
          key === `fitlog:rest:${userId}`
        )
          localStorage.removeItem(key);
      setPassword("");
      setConfirm("");
      setModal(null);
      setMessage(d);
      if (d.withdrawn) window.location.assign("/login");
      else router.refresh();
    } catch (e) {
      setMessage({
        error:
          e instanceof Error
            ? e.message
            : "요청 실패 · 기존 기록은 유지됩니다.",
      });
    } finally {
      setBusy(false);
    }
  }
  const names = { restore: "복구", clear: "기록 삭제", withdraw: "회원 탈퇴" };
  return (
    <>
      <section className="card mt-6" aria-label="내보내기와 백업">
        <h2 className="text-lg font-bold">내보내기 · 백업</h2>
        <p className="mt-2 text-sm subtle">
          한국 기록 날짜 기준으로 다운로드합니다. 빈 측정값과 기록 당시
          영양정보를 유지합니다.
        </p>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void download(
              `/api/data/export?${new URLSearchParams({ start, end, kind, format })}`,
              `fitlog-${kind}-${start}-${end}.${format}`,
            );
          }}
        >
          <div>
            <label htmlFor="export-start">내보내기 시작일</label>
            <input
              id="export-start"
              type="date"
              required
              min="1900-01-01"
              max={end}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="export-end">내보내기 종료일</label>
            <input
              id="export-end"
              type="date"
              required
              min={start}
              max="2100-12-31"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="export-kind">기록 종류</label>
            <select
              id="export-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="diet">식단</option>
              <option value="workout">운동</option>
              <option value="body">체성분</option>
            </select>
          </div>
          <div>
            <label htmlFor="export-format">파일 형식</label>
            <select
              id="export-format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (.xlsx)</option>
            </select>
          </div>
          <Button disabled={!enabled || busy} type="submit">
            기록 내보내기
          </Button>
        </form>
        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <h3 className="font-semibold">전체 기록 백업 · JSON</h3>
          <p className="mt-2 text-xs leading-5 subtle">
            기간 선택과 별개로 프로필·음식·식단·루틴·운동·체성분·컨디션·목표
            전체를 백업합니다. 이 파일로만 앱 복구가 가능하며 CSV/Excel은 복구
            형식이 아닙니다. 파일은 암호화되지 않으므로 공유 기기에 남기지
            마세요.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            disabled={!enabled || busy}
            onClick={() =>
              void download("/api/data/backup", "fitlog-backup-v1.json")
            }
          >
            전체 백업 다운로드
          </Button>
        </div>
        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <label htmlFor="backup-file">복구할 JSON 백업 파일</label>
          <input
            id="backup-file"
            type="file"
            accept=".json,application/json"
            disabled={!enabled || busy}
            onChange={async (e) => {
              setBackup(null);
              setMessage({});
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                if (f.size > 10 * 1024 * 1024)
                  throw new Error("백업 파일은 10MB까지 가능합니다.");
                const b = backupSchema.parse(JSON.parse(await f.text()));
                if (b.owner_id !== userId)
                  throw new Error("현재 계정의 백업 파일을 선택하세요.");
                setBackup(b);
              } catch (e) {
                setMessage({
                  error:
                    e instanceof Error && !("issues" in e)
                      ? e.message
                      : "지원하지 않거나 손상된 백업입니다.",
                });
              }
            }}
          />
          {backup && (
            <p className="mt-3 text-sm">
              확인된 백업:{" "}
              {Object.values(backup.tables).reduce((n, r) => n + r.length, 0)}행
              · {backup.exported_at.slice(0, 10)}
            </p>
          )}
          <p className="mt-3 text-xs leading-5 subtle">
            기록이 빈 현재 계정에만 복구합니다. 기존 기록을 자동 삭제하거나
            합치지 않습니다. 실패하면 전체 작업을 취소하며 재시도로 중복
            복구하지 않습니다. 최대 10MB·20,000행입니다.
          </p>
          <Button
            className="mt-4"
            disabled={!enabled || busy || !backup}
            onClick={() => void open("restore")}
          >
            백업 복구
          </Button>
        </div>
        {message.error && !modal && (
          <p role="alert" className="mt-4 text-sm text-red-500">
            {message.error}
          </p>
        )}
        {message.success && (
          <p role="status" className="mt-4 text-sm text-emerald-600">
            {message.success}
          </p>
        )}
      </section>
      <section className="card mt-6" aria-label="기록 삭제와 회원 탈퇴">
        <h2 className="text-lg font-bold">기록 삭제 · 회원 탈퇴</h2>
        <p className="mt-2 text-sm subtle">
          진행 전에 필요한 기록을 백업하세요. 비밀번호를 재확인하며 삭제한
          데이터는 앱에서 되돌릴 수 없습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={!enabled || busy}
            onClick={() => void open("clear")}
          >
            내 기록 전체 삭제
          </Button>
          <Button
            variant="outline"
            disabled={!enabled || busy}
            onClick={() => void open("withdraw")}
          >
            회원 탈퇴
          </Button>
        </div>
        <p className="mt-3 text-xs leading-5 subtle">
          기록 삭제는 계정·프로필을 유지합니다. 탈퇴는 계정과 모든 개인 기록을
          삭제하며 기존 백업으로 다른 새 계정에 앱 복구할 수 없습니다. 서버 운영
          백업의 삭제 보존 정책은 운영자가 별도로 안내해야 합니다.
        </p>
      </section>
      {modal && (
        <DietDialog
          title={`${names[modal]} 확인`}
          busy={busy}
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void manage();
            }}
          >
            <p className="mb-4 text-sm subtle">
              {modal === "restore"
                ? "현재 계정의 빈 기록에 백업을 복구합니다."
                : modal === "clear"
                  ? "식단·운동·체성분·컨디션·음식·루틴·목표를 모두 삭제합니다."
                  : "계정과 모든 개인 기록을 영구 삭제합니다."}
            </p>
            {message.error && (
              <p role="alert" className="mb-4 text-sm text-red-500">
                {message.error}
              </p>
            )}
            <label htmlFor="manage-password">현재 비밀번호</label>
            <input
              id="manage-password"
              autoComplete="current-password"
              type="password"
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="mt-4" htmlFor="manage-confirm">
              확인 문구: {names[modal]}
            </label>
            <input
              id="manage-confirm"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <Button
              className="mt-5 w-full"
              type="submit"
              disabled={busy || confirm !== names[modal]}
            >
              {busy ? "처리 중…" : `${names[modal]} 실행`}
            </Button>
          </form>
        </DietDialog>
      )}
    </>
  );
}
