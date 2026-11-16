"use client";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { compactEur, eur, pct } from "@/lib/format";
import { monthLabel } from "@/lib/calc/months";

export const PALETTE = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)", "var(--s8)", "var(--s9)"];
const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;
const ml = (v: string) => (/^\d{4}-\d{2}$/.test(v) ? monthLabel(v, false) : v);

function Tip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tabular rounded-2xl border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      {label !== undefined && <div className="mb-1 font-semibold">{/^\d{4}-\d{2}$/.test(String(label)) ? monthLabel(String(label)) : String(label)}</div>}
      {payload.map((p) => (
        <div key={String(p.dataKey) + p.name} className="flex items-center justify-between gap-4 text-text-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? (p.payload as { fill?: string })?.fill }} />
            {p.name}
          </span>
          <span className="text-text">{eur(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={i.dashed ? { border: `2px dashed ${i.color}` } : { background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Kreisdiagramm mit Liste – feste Farbe je Name (Farbe folgt der Kategorie, nicht dem Rang). */
export function Donut({ items, colorOf, label }: { items: { name: string; value: number }[]; colorOf: (name: string) => string; label: string }) {
  const data = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = data.reduce((s, i) => s + i.value, 0);
  if (!total) return <p className="py-6 text-center text-sm text-muted">Noch keine Daten in diesem Zeitraum.</p>;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0" role="img" aria-label={label}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="100%" paddingAngle={1.5} stroke="var(--surface)" strokeWidth={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={colorOf(d.name)} />
              ))}
            </Pie>
            <Tooltip content={<Tip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[11px] text-muted">Gesamt</div>
            <div className="tabular text-base font-semibold">{eur(total)}</div>
          </div>
        </div>
      </div>
      <ul className="tabular w-full space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-text-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf(d.name) }} />
              {d.name}
            </span>
            <span>
              {eur(d.value)} <span className="text-xs text-muted">{pct((d.value / total) * 100)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Bars({ data, series, xKey, height = 220, label }: { data: Record<string, string | number>[]; series: { key: string; label: string; color: string }[]; xKey: string; height?: number; label: string }) {
  return (
    <>
      <div style={{ height }} role="img" aria-label={label}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 6, right: 0, left: -14, bottom: 0 }} barGap={2} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey={xKey} {...axis} tickFormatter={ml} interval="preserveStartEnd" minTickGap={4} />
            <YAxis {...axis} tickFormatter={compactEur} width={44} />
            <Tooltip content={<Tip />} cursor={{ fill: "var(--surface-2)" }} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={26} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend items={series} />
    </>
  );
}

export function Trend({ data, series, xKey = "month", height = 220, label, target }: { data: Record<string, string | number | null>[]; series: { key: string; label: string; color: string; dashed?: boolean }[]; xKey?: string; height?: number; label: string; target?: { y: number; label: string } }) {
  return (
    <>
      <div style={{ height }} role="img" aria-label={label}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey={xKey} {...axis} tickFormatter={ml} minTickGap={18} />
            <YAxis {...axis} tickFormatter={compactEur} width={44} />
            <Tooltip content={<Tip />} cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} />
            {target && <ReferenceLine y={target.y} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: target.label, position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }} />}
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.2} strokeDasharray={s.dashed ? "5 4" : undefined} dot={data.length < 3 ? { r: 4 } : false} activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {series.length > 1 && <Legend items={series} />}
    </>
  );
}
