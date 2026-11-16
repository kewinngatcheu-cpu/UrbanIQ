"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowDownLeft, ChevronRight, Download, Pencil, Plus, TrendingUp } from "lucide-react";
import { useActions, useData, useNow } from "@/components/providers";
import { Badge, Button, Card, PageTitle, Progress, Stat } from "@/components/ui";
import { PeriodPicker, inPeriod, type Period } from "@/components/period";
import { MovementList } from "@/components/lists";
import { GOAL_TYPE_LABEL } from "@/components/sheets/goal-sheet";
import { eur, pct } from "@/lib/format";
import { goalStats } from "@/lib/calc/finance";
import { monthLabel, toMonth } from "@/lib/calc/months";
import { download, movementsCsv } from "@/lib/csv";

export default function SparzielePage() {
  const data = useData();
  const now = useNow();
  const open = useActions();
  const [period, setPeriod] = useState<Period>({ mode: "month", month: toMonth(now) });
  const goals = data.goals.map((g) => ({ g, st: goalStats(g, data, now) }));
  const saved = goals.reduce((t, x) => t + x.st.current, 0);
  const missing = goals.reduce((t, x) => t + x.st.missing, 0);
  const moves = data.movements.filter((m) => inPeriod(m.date, period));

  return (
    <>
      <PageTitle title="Meine Sparziele" subtitle="Rücklagen bilden – Schritt für Schritt" />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Button variant="primary" size="lg" onClick={() => open({ type: "save" })}>
          <Plus size={20} /> Geld sparen
        </Button>
        <Button size="lg" onClick={() => open({ type: "goal" })}>
          <Plus size={20} /> Neues Ziel
        </Button>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Gespart" value={eur(saved)} tone="good" />
        <Stat label="Fehlt noch" value={eur(missing)} />
        <Stat label="Ziele" value={String(goals.length)} sub={`${goals.filter((x) => x.st.progress >= 100).length} erreicht`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {goals.map(({ g, st }) => (
          <Card key={g.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {GOAL_TYPE_LABEL[g.type] !== g.name && <div className="text-xs font-medium text-muted">{GOAL_TYPE_LABEL[g.type]}</div>}
                <h2 className="truncate text-base font-semibold">{g.name}</h2>
              </div>
              <button onClick={() => open({ type: "goal", goal: g })} className="rounded-full bg-surface-2 p-2 text-muted hover:text-text" aria-label={`${g.name} bearbeiten`}>
                <Pencil size={15} />
              </button>
            </div>
            <div className="tabular mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight">{eur(st.current)}</span>
              <span className="text-sm text-muted">von {eur(g.target)}</span>
            </div>
            <div className="mt-2">
              <Progress thick value={st.progress} tone={st.progress >= 100 ? "good" : "accent"} label={`Fortschritt ${g.name}`} />
            </div>
            <dl className="tabular mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-2xl bg-surface-2 p-2.5">
                <dt className="text-muted">Erreicht</dt>
                <dd className="text-sm font-semibold">{pct(st.progress)}</dd>
              </div>
              <div className="rounded-2xl bg-surface-2 p-2.5">
                <dt className="text-muted">Fehlt</dt>
                <dd className="text-sm font-semibold">{eur(st.missing)}</dd>
              </div>
              <div className="rounded-2xl bg-surface-2 p-2.5">
                <dt className="text-muted">Pro Monat</dt>
                <dd className="text-sm font-semibold">{st.monthlyRate ? eur(st.monthlyRate) : "–"}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-2">
              {st.progress >= 100 ? (
                <Badge tone="good">Ziel erreicht</Badge>
              ) : st.etaMonth ? (
                <span>
                  Voraussichtlich erreicht: <b>{monthLabel(st.etaMonth)}</b>
                  {st.rateSource === "average" && " (Ø letzte 3 Monate)"}
                </span>
              ) : (
                <span className="text-muted">Lege einen monatlichen Sparbetrag fest, um eine Prognose zu sehen.</span>
              )}
              {g.targetDate && st.onTrack !== null && st.progress < 100 && (
                <Badge tone={st.onTrack ? "good" : "warn"}>
                  {st.onTrack ? "im Plan" : `für ${monthLabel(toMonth(g.targetDate))}: ${eur(st.requiredMonthly ?? 0)}/Monat nötig`}
                </Badge>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => open({ type: "save", goalId: g.id })}>
                <Plus size={14} /> Einzahlen
              </Button>
              <Button size="sm" onClick={() => open({ type: "save", goalId: g.id, mode: "withdrawal" })} disabled={st.current <= 0}>
                <ArrowDownLeft size={14} /> Entnehmen
              </Button>
              {g.type === "investment" && (
                <Button size="sm" onClick={() => open({ type: "save", goalId: g.id, mode: "valuation" })}>
                  <TrendingUp size={14} /> Depotwert
                </Button>
              )}
              {g.type === "property" && (
                <Link href="/sparziele/immobilie" className="inline-flex h-9 items-center gap-1 rounded-2xl px-3 text-xs font-semibold text-accent">
                  Immobilienziel <ChevronRight size={14} />
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card
        className="mt-4"
        title="Sparbewegungen"
        subtitle="Einzahlungen, Entnahmen, Umschichtungen, Wertänderungen"
        action={
          <Button size="sm" onClick={() => download(`sparbewegungen-${period.mode === "month" ? period.month : period.year}.csv`, movementsCsv(data, (d) => inPeriod(d, period)), "text/csv;charset=utf-8")}>
            <Download size={14} /> CSV
          </Button>
        }
      >
        <div className="mb-3">
          <PeriodPicker value={period} onChange={setPeriod} />
        </div>
        <MovementList items={moves} empty="Keine Sparbewegungen in diesem Zeitraum." />
      </Card>
    </>
  );
}
