/** Minimal accessible bar chart for admin metrics (no client JS). */
export function Bars({ data, label, tone = "from-primary to-cloud" }: { data: { d: string; n: number }[]; label: string; tone?: string }) {
  const max = Math.max(1, ...data.map((x) => x.n));
  return (
    <div className={`flex h-36 min-w-0 items-end overflow-hidden ${data.length > 20 ? "gap-px sm:gap-0.5" : "gap-1"}`} role="img" aria-label={label}>
      {data.map((x) => (
        <div key={x.d} className="group flex min-w-0 flex-1 flex-col items-center gap-1" title={`${x.d}: ${x.n}`}>
          <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100">{x.n}</span>
          <div className={`w-full rounded-t-md bg-gradient-to-t ${tone}`} style={{ height: `${(x.n / max) * 110 + 2}px` }} />
          <span className="hidden text-[10px] text-muted sm:block">{x.d.slice(8)}</span>
        </div>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <p className="text-[12.5px] text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}
