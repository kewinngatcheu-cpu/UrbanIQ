"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useFinance, useNow } from "@/components/providers";
import { Assumption, Button, Card, Field, PageHeader, Stat, Table, Tabs, Toggle, cx } from "@/components/ui";
import { Lines, ProjectionBand } from "@/components/charts";
import { fmtEUR, fmtPct } from "@/lib/format";
import { monthWhenPropertyReaches, project, scenarioPresets, type ScenarioKey, type SimulatorOverrides } from "@/lib/finance/projection";
import { planForMonth } from "@/lib/finance/plan";
import { equityLevels, purchaseCosts } from "@/lib/finance/property";
import { addMonths, monthLabel, toMonth } from "@/lib/finance/months";

const HORIZONS = [12, 24, 36, 48, 60] as const;

function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--accent)]" aria-label={label} />
        <span className="tabular w-24 shrink-0 text-right text-sm font-medium">{format(value)}</span>
      </div>
    </Field>
  );
}

export default function ForecastPage() {
  const data = useFinance();
  const now = useNow();
  const month = toMonth(now);
  const basePlan = planForMonth(data, month);
  const sc = scenarioPresets(data.settings.salaryGrowthPct, data.settings.safeInterestPct);
  const [scenario, setScenario] = useState<ScenarioKey>("realistic");
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(60);

  const defaults = {
    netIncome: basePlan.income,
    spendingDelta: 0,
    monthlyInvestment: basePlan.investments,
    surplusToPropertyPct: 100,
    price: data.property.purchasePrice,
    useCareer: !!data.settings.careerStart,
    careerIncome: data.settings.careerStart?.netIncome ?? 2400,
    careerMonth: data.settings.careerStart?.month ?? addMonths(month, 24),
  };
  const [sim, setSim] = useState(defaults);
  const overrides: SimulatorOverrides = {
    netIncome: sim.netIncome,
    spendingDelta: sim.spendingDelta,
    monthlyInvestment: sim.monthlyInvestment,
    surplusToPropertyPct: sim.surplusToPropertyPct,
    careerStart: sim.useCareer ? { month: sim.careerMonth, netIncome: sim.careerIncome } : null,
  };
  const p = data.property;
  const target = equityLevels(purchaseCosts(sim.price, p.transferTaxRate, p.notaryRate, p.brokerRate), p.equityTargetPct).target;

  // Berechnung ist günstig (3 × 60 Monate) – kein Memo nötig
  const runs = {
    conservative: project(data, month, 60, sc.conservative, overrides),
    realistic: project(data, month, 60, sc.realistic, overrides),
    ambitious: project(data, month, 60, sc.ambitious, overrides),
  };
  const run = runs[scenario].slice(0, horizon + 1);
  const end = run[run.length - 1];
  const reached = monthWhenPropertyReaches(runs[scenario], target);
  const freeNow = sim.netIncome - basePlan.plannedSpending + sim.spendingDelta - sim.monthlyInvestment - basePlan.savingsPlans;

  return (
    <>
      <PageHeader title="Finanzprognose & Simulator" description="Dynamische Vermögensprognose über 12–60 Monate in drei Szenarien. Sicheres Sparguthaben und schwankendes Investmentvermögen werden getrennt dargestellt." />

      <div className="mb-4 flex flex-wrap gap-2">
        <Tabs value={scenario} onChange={setScenario} options={(["conservative", "realistic", "ambitious"] as const).map((k) => ({ value: k, label: sc[k].label }))} />
        <Tabs value={String(horizon) as `${(typeof HORIZONS)[number]}`} onChange={(v) => setHorizon(Number(v) as (typeof HORIZONS)[number])} options={HORIZONS.map((h) => ({ value: String(h) as `${(typeof HORIZONS)[number]}`, label: `${h} M` }))} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label={`Nettovermögen ${monthLabel(end.month)}`} value={fmtEUR(end.netWorth)} sub={`heute ${fmtEUR(run[0].netWorth)}`} />
        <Stat label="Sicheres Guthaben" value={fmtEUR(end.safe)} sub="Tagesgeld + Immobilien-EK" />
        <Stat label="Investments (erwartet)" value={fmtEUR(end.invested)} sub={`Spanne ${fmtEUR(end.investedLow)} – ${fmtEUR(end.investedHigh)}`} />
        <Stat label="Immobilien-EK" value={fmtEUR(end.property)} sub={`Ziel ${fmtEUR(target)}`} tone={end.property >= target ? "good" : "warn"} />
        <Stat label="EK-Ziel erreicht" value={reached ? monthLabel(reached.month, true) : "nicht in 5 J."} tone={reached && reached.month <= toMonth(p.targetDate) ? "good" : "warn"} sub={`Wunschtermin ${monthLabel(toMonth(p.targetDate))}`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title={`Vermögensprognose – ${sc[scenario].label}`} subtitle={`${horizon} Monate · Investmentrendite ${fmtPct(sc[scenario].investReturnPct)} p. a. ± ${sc[scenario].investVolPct} % Volatilität`}>
          <ProjectionBand label="Vermögensprognose" data={run} height={300} target={target} />
        </Card>

        <Card
          title="Simulator"
          subtitle="Verändere Einkommen, Sparrate und Immobilienziel"
          action={
            <Button size="sm" variant="ghost" onClick={() => setSim(defaults)}>
              <RotateCcw size={13} /> Zurücksetzen
            </Button>
          }
        >
          <div className="space-y-3">
            <Slider label="Netto-Einkommen heute" value={sim.netIncome} min={800} max={4000} step={50} onChange={(netIncome) => setSim({ ...sim, netIncome })} format={fmtEUR} />
            <Slider label="Ausgaben senken (+) / erhöhen (−)" value={sim.spendingDelta} min={-300} max={300} step={10} onChange={(spendingDelta) => setSim({ ...sim, spendingDelta })} format={(v) => `${v >= 0 ? "+" : ""}${fmtEUR(v)}`} />
            <Slider label="Investment-Sparplan" value={sim.monthlyInvestment} min={0} max={800} step={10} onChange={(monthlyInvestment) => setSim({ ...sim, monthlyInvestment })} format={fmtEUR} />
            <Slider label="Anteil Überschuss → Immobilien-EK" value={sim.surplusToPropertyPct} min={0} max={100} step={5} onChange={(surplusToPropertyPct) => setSim({ ...sim, surplusToPropertyPct })} format={(v) => `${v} %`} />
            <Slider label="Kaufpreis Immobilie" value={sim.price} min={100_000} max={400_000} step={5_000} onChange={(price) => setSim({ ...sim, price })} format={fmtEUR} />
            <Toggle checked={sim.useCareer} onChange={(useCareer) => setSim({ ...sim, useCareer })} label="Berufseinstieg berücksichtigen" description="Neues Netto-Einkommen ab einem Monat" />
            {sim.useCareer && (
              <div className="grid gap-2">
                <Slider label="Netto danach" value={sim.careerIncome} min={1200} max={5000} step={50} onChange={(careerIncome) => setSim({ ...sim, careerIncome })} format={fmtEUR} />
                <Field label="ab Monat">
                  <input type="month" value={sim.careerMonth} onChange={(e) => e.target.value && setSim({ ...sim, careerMonth: e.target.value })} className="h-10 rounded-xl border border-border bg-surface-2 px-3 text-sm" />
                </Field>
              </div>
            )}
            <div className={cx("rounded-xl p-3 text-sm", freeNow >= 0 ? "bg-good/10" : "bg-critical/10")}>
              Frei für Immobilien-EK heute: <span className="tabular font-semibold">{fmtEUR(freeNow)}</span>/Monat
              {data.recurring
                .filter((r) => r.kind !== "income" && r.endMonth && r.endMonth >= month)
                .map((r) => (
                  <div key={r.id} className="text-xs text-text-2">
                    ab {monthLabel(addMonths(r.endMonth!, 1), true)} zusätzlich +{fmtEUR(r.amount)} ({r.name} endet)
                  </div>
                ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4" title="Szenarienvergleich" subtitle="Nettovermögen und Immobilien-Eigenkapital je Zeitraum">
        <Table head={["Zeitraum", ...(["conservative", "realistic", "ambitious"] as const).flatMap((k) => [`${sc[k].label}: Netto`, "Immo-EK"])]}>
          {HORIZONS.map((h) => (
            <tr key={h} className={h === horizon ? "font-semibold" : ""}>
              <td>
                {h} Monate <span className="text-xs text-muted">({monthLabel(addMonths(month, h))})</span>
              </td>
              {(["conservative", "realistic", "ambitious"] as const).flatMap((k) => [
                <td key={`${k}n`}>{fmtEUR(runs[k][h].netWorth)}</td>,
                <td key={`${k}p`} className={runs[k][h].property >= target ? "text-good" : "text-text-2"}>
                  {fmtEUR(runs[k][h].property)}
                </td>,
              ])}
            </tr>
          ))}
        </Table>
        <div className="mt-4">
          <Lines
            label="Nettovermögen je Szenario"
            data={runs.realistic.map((r, i) => ({ month: r.month, conservative: runs.conservative[i].netWorth, realistic: r.netWorth, ambitious: runs.ambitious[i].netWorth }))}
            height={220}
            series={[
              { key: "conservative", label: "Konservativ", color: "var(--s2)" },
              { key: "realistic", label: "Realistisch", color: "var(--s1)" },
              { key: "ambitious", label: "Ambitioniert", color: "var(--s3)" },
            ]}
          />
        </div>
        <Table className="mt-4" head={["Annahme", "Konservativ", "Realistisch", "Ambitioniert"]}>
          {[
            ["Investmentrendite p. a.", "investReturnPct"],
            ["Tagesgeld-Zins p. a.", "safeRatePct"],
            ["Gehaltssteigerung p. a.", "incomeGrowthPct"],
            ["Steigerung variable Ausgaben p. a.", "inflationPct"],
          ].map(([l, k]) => (
            <tr key={k}>
              <td>{l}</td>
              {(["conservative", "realistic", "ambitious"] as const).map((s) => (
                <td key={s}>{fmtPct(sc[s][k as "investReturnPct"])}</td>
              ))}
            </tr>
          ))}
        </Table>
        <Assumption>
          Alle Szenario-Parameter sind Annahmen, keine Vorhersage. Wertentwicklungen der Vergangenheit sind kein verlässlicher Indikator. Wegfall des Kredits (April 2027), Ende des Handyvertrags und alle Start-/Endmonate aus „Fixkosten & Abos“ fließen automatisch ein. Gehaltssteigerung und Berufseinstieg kannst du in den Einstellungen hinterlegen.
        </Assumption>
      </Card>
    </>
  );
}
