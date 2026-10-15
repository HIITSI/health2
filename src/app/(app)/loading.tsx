export default function Loading() {
  return (
    <div className="card animate-pulse" role="status">
      <p className="text-sm subtle">기록을 불러오는 중입니다…</p>
      <div className="mt-5 h-20 rounded-xl bg-[var(--muted)]" />
    </div>
  );
}
