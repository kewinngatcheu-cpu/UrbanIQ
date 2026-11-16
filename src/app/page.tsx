"use client";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { useData, useNow } from "@/components/providers";
import { Card, Progress, Stat, cx } from "@/components/ui";
import { QuickActions } from "@/components/nav";
import { ExpenseList, MovementList } from "@/components/lists";
import { eur, pct } from "@/lib/format";
import { goalStats, monthSummary, upcomingChanges, wealth } from "@/lib/calc/finance";
import { monthLabel, toMonth } from "@/lib/calc/months";

export default function Dashboard() {
  const data = useData();
  const now = useNow();
  const month = toMonth(now);
  const s = monthSummary(data, month);
  const w = wealth(data, now);
  const goals = data.goals.map((g) => ({ g, st: goalStats(g, data, now) }));
  const goalsSaved = goals.reduce((t, x) => t + x.st.current, 0);
  const goalsTarget = goals.reduce((t, x) => t + x.g.target, 0);
  const next = upcomingChanges(data, now)[0];
  // Plan: Sparpläne + freier Überschuss sollen gespart werden
  const toSave = Math.max(0, s.plan.savingsPlans + Math.max(0, s.plan.free) - s.saved);
  const spentPct = s.plan.personalBudget > 0 ? (s.personalSpent / s.plan.personalBudget) * 100 : 0;

  // Wohin geht das Einkommen? (Fixkosten, Ausgaben, Gespart, Rest)
  const flow = [
    { label: "Fixkosten", value: s.fixed, color: "var(--s9)" },
    { label: "Ausgaben", value: s.variable, color: "var(--s2)" },
    { label: "Gespart", value: Math.max(0, s.saved), color: "var(--s3)" },
    { label: "Verfügbar", value: Math.max(0, s.remaining), color: "var(--s1)" },
  ];
  const flowTotal = Math.max(s.income, flow.reduce((t, f) => t + f.value, 0)) || 1;

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[28px] font-bold tracking-tight">Hallo Kewin</h1>
        <p className="text-sm text-text-2">{monthLabel(month)} · alles im Blick</p>
      </div>

      {/* Hero: verfügbares Geld */}
      <section className="animate-rise relative overflow-hidden rounded-[28px] bg-accent p-5 text-white">
        <div className="text-sm/5 opacity-85">Noch verfügbar diesen Monat</div>
        <div className="tabular mt-1 text-[40px] font-bold leading-tight tracking-tight">{eur(s.remaining)}</div>
        <div className="mt-1 text-xs opacity-85">Einkommen − Fixkosten − Ausgaben − Gespartes</div>
        {toSave > 0 && (
          <div className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            Davon laut Plan noch zu sparen: <span className="tabular">{eur(toSave)}</span>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/15 p-3">
            <div className="text-xs opacity-85">Persönliches Budget</div>
            <div className="tabular font-semibold">
              {eur(s.personalLeft)} <span className="text-xs font-normal opacity-80">von {eur(s.plan.personalBudget)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${Math.min(100, spentPct)}%` }} />
            </div>
          </div>
          <div className="rounded-2xl bg-white/15 p-3">
            <div className="text-xs opacity-85">Reisebudget</div>
            <div className="tabular font-semibold">
              {eur(s.travelLeft)} <span className="text-xs font-normal opacity-80">von {eur(s.plan.travelBudget)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${Math.min(100, s.plan.travelBudget ? (s.travelSpent / s.plan.travelBudget) * 100 : 0)}%` }} />
            </div>
          </div>
        </div>
      </section>

      <QuickActions tiles className="mt-4" />

      {next && (
        <div className="animate-rise mt-4 flex items-start gap-3 rounded-3xl border border-good/30 bg-good/10 p-4 text-sm">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-good" />
          <div>
            <b>{next.item.name}</b> {next.delta > 0 ? "entfällt" : "beginnt"} ab {monthLabel(next.month)}: {next.delta > 0 ? "+" : "−"}
            {eur(Math.abs(next.delta))} pro Monat {next.delta > 0 ? "mehr" : "weniger"} frei. Dein Budget passt sich automatisch an.
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Nettoeinkommen" value={eur(s.income)} sub="pro Monat" />
        <Stat label="Fixkosten" value={eur(s.fixed)} sub={`+ ${eur(s.plan.savingsPlans)} Sparplan`} />
        <Stat label="Ausgegeben" value={eur(s.variable)} sub={`${s.expenseCount} Ausgaben`} />
        <Stat label="Verfügbares Budget" value={eur(s.personalLeft + s.travelLeft)} sub="persönlich + Reisen" tone={s.personalLeft < 0 ? "bad" : undefined} />
        <Stat label="Gespart (Monat)" value={eur(s.saved)} sub={`Ziel frei: ${eur(s.plan.free)}`} tone="good" />
        <Stat label="Sparquote" value={s.savingsRate !== null ? pct(s.savingsRate * 100) : "–"} sub="Gespart / Einkommen" tone={s.savingsRate !== null && s.savingsRate >= 0.2 ? "good" : undefined} />
        <Stat label="Gesamtvermögen" value={eur(w.assets)} sub={`Nettovermögen ${eur(w.netWorth)}`} tone={w.netWorth < 0 ? "warn" : undefined} />
        <div className="animate-rise rounded-3xl border border-border bg-surface p-4">
          <div className="text-xs font-medium text-muted">Sparziele</div>
          <div className="tabular mt-1 text-xl font-semibold">{pct(goalsTarget ? (goalsSaved / goalsTarget) * 100 : 0)}</div>
          <div className="mt-2">
            <Progress value={goalsTarget ? (goalsSaved / goalsTarget) * 100 : 0} tone="good" label="Fortschritt aller Sparziele" />
          </div>
          <div className="tabular mt-1 text-xs text-text-2">
            {eur(goalsSaved)} / {eur(goalsTarget)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Monatsübersicht" subtitle={`Wohin deine ${eur(s.income)} gehen`} action={<Link href="/ausgaben?ansicht=monat" className="flex items-center text-xs font-semibold text-accent">Details <ChevronRight size={14} /></Link>}>
          <div className="flex h-4 overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Aufteilung des Einkommens">
            {flow.map((f) => (
              <div key={f.label} className="h-full border-r-2 border-surface transition-[width] duration-700 last:border-0" style={{ width: `${(f.value / flowTotal) * 100}%`, background: f.color }} title={`${f.label}: ${eur(f.value)}`} />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {flow.map((f) => (
              <li key={f.label} className="flex items-center justify-between rounded-2xl bg-surface-2 px-3 py-2">
                <span className="flex items-center gap-2 text-text-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: f.color }} />
                  {f.label}
                </span>
                <span className="tabular font-semibold">{eur(f.value)}</span>
              </li>
            ))}
          </ul>
          {s.remaining < 0 && <p className="mt-2 text-xs text-bad">Du hast diesen Monat mehr ausgegeben/gespart, als nach Fixkosten übrig war.</p>}
        </Card>

        <Card title="Wichtigste Sparziele" action={<Link href="/sparziele" className="flex items-center text-xs font-semibold text-accent">Alle <ChevronRight size={14} /></Link>}>
          <ul className="space-y-4">
            {goals.slice(0, 3).map(({ g, st }) => (
              <li key={g.id}>
                <Link href={g.type === "property" ? "/sparziele/immobilie" : "/sparziele"} className="block">
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="tabular text-xs text-text-2">
                      {eur(st.current)} / {eur(g.target)}
                    </span>
                  </div>
                  <Progress value={st.progress} tone={st.progress >= 100 ? "good" : "accent"} label={g.name} />
                  <div className="mt-1 text-xs text-muted">{st.progress >= 100 ? "Ziel erreicht 🎉" : st.etaMonth ? `voraussichtlich ${monthLabel(st.etaMonth)}` : "Monatlichen Sparbetrag festlegen für eine Prognose"}</div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Letzte Ausgaben" action={<Link href="/ausgaben" className="flex items-center text-xs font-semibold text-accent">Alle <ChevronRight size={14} /></Link>}>
          <ExpenseList items={data.expenses.slice(0, 5)} />
        </Card>
        <Card title="Letzte Sparbewegungen" action={<Link href="/sparziele" className={cx("flex items-center text-xs font-semibold text-accent")}>Alle <ChevronRight size={14} /></Link>}>
          <MovementList items={data.movements.slice(0, 5)} />
        </Card>
      </div>
    </>
  );
}
