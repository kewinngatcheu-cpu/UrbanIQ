"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type TooltipContentProps,
} from "recharts";
import type { ReactNode } from "react";
import { fmtCompactEUR, fmtEUR, fmtPct } from "@/lib/format";
import { monthLabel } from "@/lib/finance/months";

export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)", "var(--s8)"];

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.dashed ? "transparent" : i.color, border: i.dashed ? `2px dashed ${i.color}` : undefined }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

type Fmt = (v: number) => string;
function TooltipBox({ active, payload, label, fmt = fmtEUR, labelFmt }: Partial<TooltipContentProps<number, string>> & { fmt?: Fmt; labelFmt?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium text-text">{labelFmt ? labelFmt(String(label)) : String(label ?? "")}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="tabular flex items-center justify-between gap-4 text-text-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="text-text">{fmt(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

function Frame({ height = 240, children, label }: { height?: number; children: ReactNode; label: string }) {
  return (
    <div style={{ height }} role="img" aria-label={label} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

const ml = (m: string) => (/^\d{4}-\d{2}$/.test(m) ? monthLabel(m) : m);
const mlLong = (m: string) => (/^\d{4}-\d{2}$/.test(m) ? monthLabel(m, true) : m);

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
}

/** Gestapelte Flächen (z. B. Vermögensentwicklung nach Bereichen). */
export function StackedArea({ data, series, height, label }: { data: Record<string, number | string>[]; series: SeriesDef[]; height?: number; label: string }) {
  return (
    <>
      <Frame height={height} label={label}>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="month" tickFormatter={ml} {...axis} minTickGap={16} />
          <YAxis tickFormatter={fmtCompactEUR} {...axis} width={56} />
          <Tooltip content={<TooltipBox labelFmt={mlLong} />} cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stackId="1" stroke={s.color} strokeWidth={2} fill={s.color} fillOpacity={0.18} />
          ))}
        </AreaChart>
      </Frame>
      <Legend items={series} />
    </>
  );
}

/** Linien (z. B. Prognose-Szenarien, Sparquote). */
export function Lines({ data, series, height, label, fmt = fmtEUR, yFmt = fmtCompactEUR, reference, xKey = "month" }: { data: Record<string, number | string | null>[]; series: SeriesDef[]; height?: number; label: string; fmt?: Fmt; yFmt?: Fmt; reference?: { y: number; label: string }; xKey?: string }) {
  return (
    <>
      <Frame height={height} label={label}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey={xKey} tickFormatter={ml} {...axis} minTickGap={16} />
          <YAxis tickFormatter={yFmt} {...axis} width={56} />
          <Tooltip content={<TooltipBox fmt={fmt} labelFmt={mlLong} />} cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} />
          {reference && <ReferenceLine y={reference.y} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: reference.label, position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }} />}
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} connectNulls />
          ))}
        </LineChart>
      </Frame>
      <Legend items={series} />
    </>
  );
}

/** Gruppierte Balken (z. B. Einnahmen vs. Ausgaben). */
export function Bars({ data, series, height, label, xKey = "month", stacked = false }: { data: Record<string, number | string>[]; series: SeriesDef[]; height?: number; label: string; xKey?: string; stacked?: boolean }) {
  return (
    <>
      <Frame height={height} label={label}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey={xKey} tickFormatter={ml} {...axis} minTickGap={8} />
          <YAxis tickFormatter={fmtCompactEUR} {...axis} width={56} />
          <Tooltip content={<TooltipBox labelFmt={mlLong} />} cursor={{ fill: "var(--surface-2)" }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={stacked ? 0 : [4, 4, 0, 0]} stackId={stacked ? "a" : undefined} maxBarSize={28} stroke="var(--surface)" strokeWidth={stacked ? 1 : 0} />
          ))}
        </BarChart>
      </Frame>
      <Legend items={series} />
    </>
  );
}

/** Donut + Liste (Ausgabenaufteilung). Max. 7 Segmente, Rest → "Weitere". */
export function Breakdown({ items, label, total }: { items: { name: string; value: number }[]; label: string; total?: number }) {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7).reduce((s, i) => s + i.value, 0);
  const data = rest > 0 ? [...top, { name: "Weitere", value: rest }] : top;
  const sum = total ?? data.reduce((s, i) => s + i.value, 0);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-44 w-44 shrink-0" role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="100%" paddingAngle={1.5} stroke="var(--surface)" strokeWidth={2} isAnimationActive>
              {data.map((_, i) => (
                <Cell key={i} fill={SERIES[i % SERIES.length]} />
              ))}
            </Pie>
            <Tooltip content={<TooltipBox />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted">Gesamt</span>
          <span className="tabular text-base font-semibold">{fmtEUR(sum)}</span>
        </div>
      </div>
      <ul className="tabular w-full space-y-1.5 text-xs">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-text-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
              {d.name}
            </span>
            <span className="text-text">
              {fmtEUR(d.value)} <span className="text-muted">· {fmtPct(sum > 0 ? (d.value / sum) * 100 : 0, 0)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Wert vs. Einzahlungen (Rendite sichtbar als Abstand). */
export function ValueVsContributions({ data, height, label }: { data: { month: string; value: number; contributions: number }[]; height?: number; label: string }) {
  return (
    <>
      <Frame height={height} label={label}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="month" tickFormatter={ml} {...axis} minTickGap={16} />
          <YAxis tickFormatter={fmtCompactEUR} {...axis} width={56} />
          <Tooltip content={<TooltipBox labelFmt={mlLong} />} cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }} />
          <Area type="monotone" dataKey="value" name="Depotwert" stroke="var(--s1)" strokeWidth={2} fill="var(--s1)" fillOpacity={0.15} />
          <Line type="monotone" dataKey="contributions" name="Einzahlungen" stroke="var(--s2)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
        </ComposedChart>
      </Frame>
      <Legend items={[{ label: "Depotwert", color: "var(--s1)" }, { label: "Einzahlungen", color: "var(--s2)", dashed: true }]} />
    </>
  );
}

/** Band-Chart für Prognose: sicheres Guthaben + Investments mit Schwankungsband. */
export function ProjectionBand({ data, height, label, target }: { data: { month: string; safe: number; invested: number; investedLow: number; investedHigh: number; property: number }[]; height?: number; label: string; target?: number }) {
  const rows = data.map((d) => ({ ...d, band: [d.safe + d.investedLow, d.safe + d.investedHigh] as [number, number], total: d.safe + d.invested }));
  return (
    <>
      <Frame height={height} label={label}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="month" tickFormatter={ml} {...axis} minTickGap={24} />
          <YAxis tickFormatter={fmtCompactEUR} {...axis} width={56} />
          <Tooltip
            content={({ active, payload, label: l }) =>
              active && payload?.length ? (
                <div className="tabular rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-xl">
                  <div className="mb-1 font-medium">{mlLong(String(l))}</div>
                  {(() => {
                    const r = payload[0].payload as (typeof rows)[number];
                    return (
                      <>
                        <Row c="var(--s1)" n="Gesamt (erwartet)" v={r.total} />
                        <Row c="var(--s1)" n="Spanne Investments ±1σ" v={`${fmtEUR(r.band[0])} – ${fmtEUR(r.band[1])}`} />
                        <Row c="var(--s3)" n="Sicheres Guthaben" v={r.safe} />
                        <Row c="var(--s2)" n="davon Immobilien-EK" v={r.property} />
                      </>
                    );
                  })()}
                </div>
              ) : null
            }
          />
          {target ? <ReferenceLine y={target} stroke="var(--s2)" strokeDasharray="4 4" label={{ value: `EK-Ziel ${fmtCompactEUR(target)}`, position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }} /> : null}
          <Area type="monotone" dataKey="band" name="Spanne" stroke="none" fill="var(--s1)" fillOpacity={0.12} />
          <Line type="monotone" dataKey="total" name="Gesamt" stroke="var(--s1)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="safe" name="Sicher" stroke="var(--s3)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="property" name="Immobilien-EK" stroke="var(--s2)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
        </ComposedChart>
      </Frame>
      <Legend
        items={[
          { label: "Gesamtvermögen (erwartet)", color: "var(--s1)" },
          { label: "Schwankungsband Investments", color: "color-mix(in srgb, var(--s1) 30%, transparent)" },
          { label: "Sicheres Guthaben", color: "var(--s3)" },
          { label: "Immobilien-Eigenkapital", color: "var(--s2)", dashed: true },
        ]}
      />
    </>
  );
}

function Row({ c, n, v }: { c: string; n: string; v: number | string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-text-2">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: c }} />
        {n}
      </span>
      <span className="text-text">{typeof v === "number" ? fmtEUR(v) : v}</span>
    </div>
  );
}
