"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export function DietDialog({
  title,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_24px)] max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--foreground)] shadow-xl backdrop:bg-black/50 sm:p-7"
    >
      <header className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="닫기"
          className="rounded-lg p-2 disabled:opacity-30"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
