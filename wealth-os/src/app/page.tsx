"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useFinance, useNow } from "@/components/providers";
import { Alert, Assumption, Card, Missing, PageHeader, Progress, Stat } from "@/components/ui";
import { Bars, Breakdown, Lines, StackedArea, ValueVsContributions } from "@/components/charts";
import { fmtEUR, fmtPct } from "@/lib/format";
import { actualsForMonth, planForMonth } from "@/lib/finance/plan";
import { wealthSummary } from "@/lib/finance/wealth";
import { cashflowSeries, historyWithCurrent } from "@/lib/finance/series";
import { generateInsights, propertyStatus } from "@/lib/finance/analyst";
import { monthLabel, toMonth } from "@/lib/finance/months";
import { SAVINGS_CATEGORIES } from "@/lib/types";

export default function Dashboard() {
  const data = useFinance();
  const now = useNow();
  const month = toMonth(now);

  const m = useMemo(() => {
    const summary = wealthSummary(data);
    const plan = planForMonth(data, month);
    const act = actualsForMonth(data.transactions, month);
    const hist = historyWithCurrent(data, now, 12);
    const cash = cashflowSeries(data, now, 6);
    const ps = propertyStatus(data, now);
    const insights = generateInsights(data, now).filter((i) => i.severity === "critical" || i.severity === "warning").slice(0, 3);
    return { summary, plan, act, hist, cash, ps, insights };
  }, [data, month, now]);

  const { summary, plan, act, hist, cash, ps } = m;
  const breakdownSource = act.hasData ? act.byCategory : plan.byCategory;
  const breakdown = Object.entries(breakdownSource)
    .filter(([c]) => !SAVINGS_CATEGORIES.includes(c as never))
    .map(([name, value]) => ({ name, value }));

  return (
    <>
      <PageHeader title="Finanzieller Überblick" description={`Stand ${now.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })} · alle Kennzahlen werden live aus deinen gespeicherten Daten berechnet.`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Gesamtvermögen" value={fmtEUR(summary.totalAssets)} sub="brutto, alle Konten & Depots" />
        <Stat label="Liquides Vermögen" value={fmtEUR(summary.liquid)} sub="Giro, Tagesgeld, Notgroschen" />
        <Stat label="Investiert" value={fmtEUR(summary.invested)} sub={`${summary.returnsInvested >= 0 ? "+" : ""}${fmtEUR(summary.returnsInvested)} Rendite`} tone={summary.returnsInvested >= 0 ? "good" : "critical"} />
        <Stat label="Immobilien-Eigenkapital" value={fmtEUR(summary.property)} sub={`Ziel ${fmtEUR(ps.target)}`} />
        <Stat label="Nettovermögen" value={fmtEUR(summary.netWorth)} sub="Vermögen − Schulden" />
        <Stat
          label="Einnahmen (Monat)"
          value={act.hasData ? fmtEUR(act.income) : <Missing>keine Buchungen</Missing>}
          sub={`Plan ${fmtEUR(plan.income)}`}
        />
        <Stat
          label="Ausgaben (Monat)"
          value={act.hasData ? fmtEUR(act.spending) : <Missing>keine Buchungen</Missing>}
          sub={`Plan ${fmtEUR(plan.plannedSpending)}`}
          tone={act.hasData && act.spending > plan.plannedSpending ? "critical" : undefined}
        />
        <Stat
          label="Sparquote"
          value={act.savingsRate !== null ? fmtPct(act.savingsRate * 100) : <Missing>n. v.</Missing>}
          sub={`Plan ${fmtPct(plan.savingsRate * 100)}`}
          tone={act.savingsRate !== null && act.savingsRate < plan.savingsRate ? "warn" : "good"}
          hint="(Einnahmen − Konsumausgaben) / Einnahmen. Sparen & Investments zählen nicht als Konsum."
        />
        <Stat label="Schulden" value={fmtEUR(summary.debts)} sub={data.debts.some((d) => d.balanceIsEstimate) ? "teilweise geschätzt" : undefined} tone={summary.debts > 0 ? "warn" : "good"} />
        <div className="animate-in rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs font-medium text-muted">Immobilienziel</div>
          <div className="tabular mt-1.5 text-xl font-semibold sm:text-2xl">{fmtPct(ps.progressPct, 0)}</div>
          <div className="mt-2">
            <Progress value={ps.progressPct} tone={ps.onTrack ? "good" : "warn"} label="Fortschritt Immobilienziel" />
          </div>
          <div className={`mt-1.5 text-xs ${ps.onTrack ? "text-good" : "text-warn"}`}>{ps.onTrack ? "auf Kurs" : "nicht auf Kurs"}</div>
        </div>
      </div>

      {m.insights.length > 0 && (
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {m.insights.map((i) => (
            <Alert key={i.id} tone={i.severity === "critical" ? "critical" : "warn"} title={i.title}>
              {i.action}
            </Alert>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Vermögensentwicklung (12 Monate)" subtitle="aus Monats-Snapshots; laufender Monat live" action={<Link className="text-xs text-accent" href="/wealth">Details →</Link>}>
          {hist.length > 1 ? (
            <StackedArea
              label="Vermögensentwicklung"
              data={hist as never}
              series={[
                { key: "liquid", label: "Liquide", color: "var(--s1)" },
                { key: "property", label: "Immobilien-EK", color: "var(--s2)" },
                { key: "invested", label: "Investiert", color: "var(--s3)" },
              ]}
            />
          ) : (
            <Missing>Noch keine Snapshots – speichere am Monatsende einen Vermögens-Snapshot (Monats-Check).</Missing>
          )}
        </Card>
        <Card title={`Ausgabenaufteilung ${monthLabel(month)}`} subtitle={act.hasData ? "Ist-Werte" : "Keine Buchungen – Planwerte angezeigt"}>
          <Breakdown items={breakdown} label="Ausgabenaufteilung" />
        </Card>

        <Card title="Einnahmen vs. Ausgaben" subtitle="Ist-Werte der letzten 6 Monate">
          {cash.some((c) => c.hasData) ? (
            <Bars
              label="Einnahmen gegen Ausgaben"
              data={cash.filter((c) => c.hasData) as never}
              series={[
                { key: "income", label: "Einnahmen", color: "var(--s1)" },
                { key: "spending", label: "Konsumausgaben", color: "var(--s2)" },
              ]}
              height={200}
            />
          ) : (
            <Missing>Keine Transaktionen erfasst.</Missing>
          )}
        </Card>
        <Card title="Sparquote" subtitle="Ist vs. Plan in %">
          <Lines
            label="Entwicklung der Sparquote"
            data={cash as never}
            height={200}
            fmt={(v) => fmtPct(v)}
            yFmt={(v) => `${v} %`}
            series={[
              { key: "savingsRate", label: "Ist", color: "var(--s1)" },
              { key: "plannedRate", label: "Plan", color: "var(--s2)", dashed: true },
            ]}
          />
        </Card>
        <Card title="Eigenkapital-Fortschritt" subtitle={`Ziel ${fmtEUR(ps.target)} bis ${new Date(data.property.targetDate).toLocaleDateString("de-DE", { month: "short", year: "numeric" })}`} action={<Link className="text-xs text-accent" href="/property">Immobilie →</Link>}>
          <Lines label="Eigenkapital-Fortschritt" data={hist as never} height={200} series={[{ key: "property", label: "Immobilien-EK", color: "var(--s2)" }]} reference={{ y: ps.target, label: "Ziel" }} />
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-surface-2 p-2">
              <div className="text-muted">Nötig / Monat</div>
              <div className="tabular font-semibold">{fmtEUR(ps.requiredMonthly)}</div>
            </div>
            <div className="rounded-lg bg-surface-2 p-2">
              <div className="text-muted">Geplant / Monat</div>
              <div className={`tabular font-semibold ${ps.currentMonthly >= ps.requiredMonthly ? "text-good" : "text-warn"}`}>{fmtEUR(ps.currentMonthly)}</div>
            </div>
            <div className="rounded-lg bg-surface-2 p-2">
              <div className="text-muted">Prognose Ziel</div>
              <div className={`tabular font-semibold ${ps.onTrack ? "text-good" : "text-warn"}`}>{fmtEUR(ps.projectedAtTarget)}</div>
            </div>
          </div>
          <Assumption>Prognose = realistisches Szenario inkl. Kreditwegfall, Gehaltsentwicklung und ggf. hinterlegtem Berufseinstieg (Einstellungen).</Assumption>
        </Card>

        <Card className="lg:col-span-3" title="Investitionsentwicklung" subtitle="Depotwert vs. eingezahltes Kapital – der Abstand ist deine Rendite">
          <ValueVsContributions label="Investitionsentwicklung" data={hist.map((h) => ({ month: h.month, value: h.invested, contributions: h.investedContributions }))} height={220} />
          <Assumption>Historische Werte stammen aus gespeicherten Snapshots. Kurse werden manuell gepflegt, außer du aktivierst die Marktdaten-Integration.</Assumption>
        </Card>
      </div>
    </>
  );
}
