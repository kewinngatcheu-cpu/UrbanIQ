"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, Home, Plus } from "lucide-react";
import { useActions, useData, useNow } from "@/components/providers";
import { Button, Card, Empty, Field, MoneyInput, Note, Progress, Stat, cx } from "@/components/ui";
import { Trend } from "@/components/charts";
import { eur, parseEuro, pct } from "@/lib/format";
import { goalStats, planForMonth } from "@/lib/calc/finance";
import { addMonths, monthLabel, toMonth } from "@/lib/calc/months";
import { saveGoal } from "@/lib/db";

const PRESETS = [20_000, 30_000, 40_000];

/** Einfacher Projektionsverlauf: monatliche Rate, optional Erhöhung ab einem Monat. */
function project(start: number, target: number, rate: number, from: string, extra?: { from: string; amount: number }, max = 180) {
  const points: { month: string; value: number }[] = [{ month: from, value: start }];
  let v = start;
  for (let i = 1; i <= max && v < target; i++) {
    const m = addMonths(from, i);
    v += rate + (extra && m >= extra.from ? extra.amount : 0);
    points.push({ month: m, value: Math.round(v) });
  }
  return points;
}

export default function ImmobiliePage() {
  const data = useData();
  const now = useNow();
  const open = useActions();
  const month = toMonth(now);
  const goal = data.goals.find((g) => g.type === "property");
  const [custom, setCustom] = useState("");
  const [rateInput, setRateInput] = useState(goal ? String(goal.monthlyPlan).replace(".", ",") : "");

  if (!goal)
    return (
      <Empty
        title="Kein Immobilien-Sparziel vorhanden"
        text="Lege ein Sparziel mit der Art „Immobilie / Eigenkapital“ an."
        action={<Button variant="primary" onClick={() => open({ type: "goal" })}>Sparziel erstellen</Button>}
      />
    );

  const st = goalStats(goal, data, now);
  const free = planForMonth(data, month).free;
  const loanEnd = data.plan.find((p) => p.kind === "fixed" && p.endMonth && p.endMonth >= month && p.name.toLowerCase().includes("kredit"));
  const extra = loanEnd ? { from: addMonths(loanEnd.endMonth!, 1), amount: loanEnd.amount } : undefined;
  const base = project(st.current, goal.target, goal.monthlyPlan, month);
  const boosted = extra ? project(st.current, goal.target, goal.monthlyPlan, month, extra) : null;
  const len = Math.max(base.length, boosted?.length ?? 0);
  const chart = Array.from({ length: len }, (_, i) => ({ month: addMonths(month, i), base: base[i]?.value ?? null, boosted: boosted?.[i]?.value ?? null }));
  const etaBoost = boosted && boosted[boosted.length - 1].value >= goal.target ? boosted[boosted.length - 1].month : null;

  const setTarget = (target: number) => target > 0 && saveGoal({ ...goal, target });
  const saveRate = () => {
    const v = parseEuro(rateInput);
    if (v !== null && v >= 0) saveGoal({ ...goal, monthlyPlan: v });
  };

  return (
    <>
      <Link href="/sparziele" className="mb-3 inline-flex items-center text-sm font-medium text-accent">
        <ChevronLeft size={16} /> Sparziele
      </Link>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent">
          <Home size={24} />
        </span>
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">Meine erste Wohnung</h1>
          <p className="text-sm text-text-2">Eigenkapital systematisch aufbauen</p>
        </div>
      </div>

      <Card>
        <div className="tabular flex items-baseline justify-between">
          <span className="text-3xl font-bold">{eur(st.current)}</span>
          <span className="text-sm text-muted">von {eur(goal.target)}</span>
        </div>
        <div className="mt-3">
          <Progress thick value={st.progress} tone={st.progress >= 100 ? "good" : "accent"} label="Fortschritt Eigenkapital" />
        </div>
        <div className="mt-1.5 text-right text-xs text-muted">{pct(st.progress, 1)} erreicht</div>
        <Button variant="primary" size="lg" className="mt-3 w-full" onClick={() => open({ type: "save", goalId: goal.id })}>
          <Plus size={20} /> Für die Wohnung sparen
        </Button>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Aktuelles Eigenkapital" value={eur(st.current)} />
        <Stat label="Gewünschtes Eigenkapital" value={eur(goal.target)} />
        <Stat label="Fehlender Betrag" value={eur(st.missing)} />
        <Stat label="Ziel erreicht" value={st.progress >= 100 ? "✓" : st.etaMonth ? monthLabel(st.etaMonth) : "–"} sub={st.monthsLeft ? `in ${st.monthsLeft} Monaten` : undefined} tone="good" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Eigenkapitalziel einstellen">
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setTarget(p)}
                aria-pressed={goal.target === p}
                className={cx("h-14 rounded-2xl border text-sm font-semibold transition", goal.target === p ? "border-accent bg-accent text-white" : "border-border bg-surface-2")}
              >
                {eur(p)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1">
              <MoneyInput value={custom} onChange={setCustom} aria-label="Eigener Zielbetrag" placeholder="Eigener Betrag" />
            </div>
            <Button onClick={() => (setTarget(parseEuro(custom) ?? 0), setCustom(""))} disabled={!parseEuro(custom)} className="h-12">
              Übernehmen
            </Button>
          </div>
          <Note>Faustregel: Mindestens die Kaufnebenkosten (in Berlin/Brandenburg ca. 10–12 % des Kaufpreises) sollten aus Eigenkapital kommen.</Note>
        </Card>

        <Card title="Monatliche Sparrate">
          <div className="flex gap-2">
            <div className="flex-1">
              <MoneyInput value={rateInput} onChange={setRateInput} aria-label="Monatliche Sparrate" />
            </div>
            <Button onClick={saveRate} className="h-12">
              Speichern
            </Button>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <button onClick={() => (setRateInput(String(Math.max(0, free))), saveGoal({ ...goal, monthlyPlan: Math.max(0, free) }))} className="flex w-full justify-between rounded-2xl bg-surface-2 px-3 py-2.5 text-left">
              <span className="text-text-2">Aktuell frei nach Fixkosten & Budgets</span>
              <span className="tabular font-semibold text-accent">{eur(free)} übernehmen</span>
            </button>
            {extra && (
              <div className="rounded-2xl border border-good/30 bg-good/10 px-3 py-2.5 text-text-2">
                Ab {monthLabel(extra.from)} fällt der Kredit weg: <b className="text-good">+{eur(extra.amount)}</b> pro Monat zusätzlich möglich.
                {etaBoost && (
                  <>
                    {" "}
                    Sparst du diese ebenfalls, erreichst du dein Ziel schon <b>{monthLabel(etaBoost)}</b>.
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4" title="Weg zum Eigenkapital" subtitle="Einfache Hochrechnung ohne Zinsen">
        {goal.monthlyPlan > 0 || st.current > 0 ? (
          <Trend
            label="Eigenkapital-Hochrechnung"
            data={chart}
            target={{ y: goal.target, label: `Ziel ${eur(goal.target)}` }}
            series={[
              { key: "base", label: `mit ${eur(goal.monthlyPlan)}/Monat`, color: "var(--s1)" },
              ...(boosted ? [{ key: "boosted", label: `+ ${eur(extra!.amount)} ab ${monthLabel(extra!.from, false)}`, color: "var(--s3)", dashed: true }] : []),
            ]}
          />
        ) : (
          <p className="py-6 text-center text-sm text-muted">Trage eine monatliche Sparrate ein, um die Hochrechnung zu sehen.</p>
        )}
        <Note>Keine Finanzierungsberatung. Die Hochrechnung zeigt nur, wann du dein selbst gesetztes Eigenkapitalziel bei gleichbleibender Sparrate erreichst.</Note>
      </Card>
    </>
  );
}
