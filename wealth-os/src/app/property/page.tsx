"use client";
import { useState } from "react";
import { RefreshCw, Target } from "lucide-react";
import { useFinance, useNow } from "@/components/providers";
import { Alert, Assumption, Badge, Button, Card, Field, Input, NumberInput, PageHeader, Progress, Select, Stat, Table, Tabs, cx } from "@/components/ui";
import { Lines } from "@/components/charts";
import { fmtEUR, fmtPct } from "@/lib/format";
import { DEFAULT_RATE_ASSUMPTION, REGION_DEFAULTS, equityLevels, financing, monthsToTarget, priceScenarios, rateSensitivity, requiredMonthlySaving } from "@/lib/finance/property";
import { amortizationSchedule } from "@/lib/finance/loan";
import { propertyStatus } from "@/lib/finance/analyst";
import { planForMonth } from "@/lib/finance/plan";
import { project, scenarioPresets } from "@/lib/finance/projection";
import { addMonths, monthDiff, monthLabel, toMonth } from "@/lib/finance/months";
import { upsert, updateProperty } from "@/lib/db";
import type { PropertyPlan, Region } from "@/lib/types";

export default function PropertyPage() {
  const data = useFinance();
  const now = useNow();
  const p = data.property;
  const month = toMonth(now);
  const [rateMsg, setRateMsg] = useState<{ tone: "good" | "critical" | "info"; text: string } | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const set = (patch: Partial<PropertyPlan>) => updateProperty(patch);

  const ps = propertyStatus(data, now);
  const equity = ps.equity;
  const f = ps.financing;
  const levels = equityLevels(f.costs, p.equityTargetPct);
  const plan = planForMonth(data, month);
  const monthsLeft = Math.max(1, monthDiff(month, toMonth(p.targetDate)));
  const career = data.settings.careerStart;
  const futureIncome = career?.netIncome ?? null;
  const burdenNow = plan.income > 0 ? (f.monthlyOwnerCost / plan.income) * 100 : null;
  const burdenFuture = futureIncome ? (f.monthlyOwnerCost / futureIncome) * 100 : null;
  const scenarios = priceScenarios(p, equity, monthsLeft, plan.income, data.settings.safeInterestPct);
  const sens = rateSensitivity(f.loan, p.repaymentRate, [3, 3.5, 4, 4.5, 5, 6]);
  const sc = scenarioPresets(data.settings.salaryGrowthPct, data.settings.safeInterestPct);
  const runs = (["conservative", "realistic", "ambitious"] as const).map((k) => project(data, month, monthsLeft, sc[k]));
  const proj = runs[0].map((pt, i) => ({ month: pt.month, conservative: runs[0][i].property, realistic: runs[1][i].property, ambitious: runs[2][i].property }));
  const schedule = amortizationSchedule(f.loan, p.interestRate, f.monthlyRate, 12 * 40);
  const yearly = schedule.filter((r) => r.index % 12 === 0 || r.index === schedule.length).map((r) => ({ month: `Jahr ${Math.ceil(r.index / 12)}`, balance: r.balance }));
  const levelsMonthly = (target: number) => requiredMonthlySaving(target, equity, monthsLeft, data.settings.safeInterestPct);
  const eta = monthsToTarget(levels.target, equity, ps.currentMonthly, data.settings.safeInterestPct);
  const goal = data.goals.find((g) => g.type === "property");

  async function fetchRate() {
    if (!data.settings.consent.interestRates) {
      setRateMsg({ tone: "info", text: "Zinsdaten-Abruf ist deaktiviert. Aktiviere ihn unter Integrationen (kostenlos, EZB Data Portal, read-only)." });
      return;
    }
    setLoadingRate(true);
    try {
      const r = await fetch("/api/rates/mortgage");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Abruf fehlgeschlagen");
      await set({ interestRate: Math.round(j.latest.value * 100) / 100, rateSource: `${j.source}, ${j.latest.period} (Durchschnittszins Neugeschäft; dein Angebot kann abweichen)` });
      setRateMsg({ tone: "good", text: `Übernommen: ${j.latest.value} % (${j.latest.period}).` });
    } catch (e) {
      setRateMsg({ tone: "critical", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoadingRate(false);
    }
  }

  function applyRegion(region: Region) {
    if (region === "custom") return set({ region });
    const d = REGION_DEFAULTS[region];
    set({ region, transferTaxRate: d.transferTaxRate, location: p.location === REGION_DEFAULTS[p.region as "berlin"]?.label || !p.location ? d.label : p.location });
  }

  return (
    <>
      <PageHeader
        title="Immobilien-Ziel: erste Eigentumswohnung"
        description="Eigenkapital-Tracker, Kaufnebenkosten, Finanzierung und Szenarien. Alle Ergebnisse sind Modellrechnungen auf Basis deiner Annahmen – keine Finanzierungszusage."
        actions={
          goal && goal.targetAmount !== levels.target ? (
            <Button onClick={() => upsert("goals", { ...goal, targetAmount: levels.target, targetDate: p.targetDate })}>
              <Target size={15} /> Ziel auf {fmtEUR(levels.target)} setzen
            </Button>
          ) : undefined
        }
      />

      <Alert tone="info" title="Keine Finanzierung ist sicher oder garantiert">
        Banken entscheiden individuell (Bonität, unbefristeter Job, Haushaltsrechnung, Objektbewertung). Als Student mit {fmtEUR(plan.income)} Netto ist eine Finanzierung in dieser Größenordnung heute unrealistisch – die Rechnung zeigt, was du für den Zeitpunkt nach dem Berufseinstieg vorbereiten musst.
      </Alert>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Eigenkapital heute" value={fmtEUR(equity)} sub="aus Immobilien-Konten" />
        <Stat label="Ziel-Eigenkapital" value={fmtEUR(levels.target)} sub={`Nebenkosten + ${p.equityTargetPct} %`} />
        <Stat label="Gesamtkosten" value={fmtEUR(f.costs.total)} sub={`davon NK ${fmtEUR(f.costs.ancillary)} (${fmtPct(f.costs.ancillaryPct)})`} />
        <Stat label="Finanzierungsbedarf" value={fmtEUR(f.loan)} sub={`bei ${fmtEUR(f.equity)} EK · Auslauf ${fmtPct(f.ltvPct, 0)}`} tone={f.ltvPct > 100 ? "critical" : f.ltvPct > 90 ? "warn" : undefined} />
        <Stat label="Monatliche Rate" value={fmtEUR(f.monthlyRate)} sub={`${fmtPct(p.interestRate, 2)} Zins + ${fmtPct(p.repaymentRate)} Tilgung`} />
        <Stat label="Restschuld nach Zinsbindung" value={fmtEUR(f.remainingAfterFixation)} sub={`nach ${p.fixationYears} Jahren`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Annahmen & Eingaben" subtitle="Änderungen werden sofort gespeichert">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kaufpreis" className="col-span-2">
              <NumberInput value={p.purchasePrice} min={0} step={5000} suffix="€" onChange={(purchasePrice) => set({ purchasePrice })} />
            </Field>
            <Field label="Region">
              <Select value={p.region} onChange={(e) => applyRegion(e.target.value as Region)}>
                <option value="berlin">Berlin</option>
                <option value="brandenburg">Brandenburg</option>
                <option value="custom">Andere</option>
              </Select>
            </Field>
            <Field label="Standort">
              <Input value={p.location} onChange={(e) => set({ location: e.target.value })} />
            </Field>
            <Field label="Wohnungsgröße">
              <NumberInput value={p.sizeSqm} min={0} suffix="m²" onChange={(sizeSqm) => set({ sizeSqm })} />
            </Field>
            <Field label="Nutzung">
              <Select value={p.usage} onChange={(e) => set({ usage: e.target.value as PropertyPlan["usage"] })}>
                <option value="self">Selbstnutzung</option>
                <option value="rental">Kapitalanlage / Vermietung</option>
              </Select>
            </Field>
            <Field label="Eigenkapital beim Kauf" hint="Leer = dein Ziel-Eigenkapital. Basis für Darlehen, Rate & Restschuld.">
              <Input
                type="number"
                inputMode="decimal"
                value={p.equity ?? ""}
                placeholder={String(Math.round(ps.target))}
                onChange={(e) => set({ equity: e.target.value === "" ? undefined : Number(e.target.value) })}
                className="h-10 rounded-xl border border-border bg-surface-2 px-3 text-sm"
              />
            </Field>
            <Field label="Zieldatum Kauf">
              <Input type="date" value={p.targetDate} onChange={(e) => e.target.value && set({ targetDate: e.target.value })} />
            </Field>
            <Field label="Grunderwerbsteuer">
              <NumberInput value={p.transferTaxRate} step={0.1} suffix="%" onChange={(transferTaxRate) => set({ transferTaxRate })} />
            </Field>
            <Field label="Notar & Grundbuch">
              <NumberInput value={p.notaryRate} step={0.1} suffix="%" onChange={(notaryRate) => set({ notaryRate })} />
            </Field>
            <Field label="Makler (Käuferanteil)">
              <NumberInput value={p.brokerRate} step={0.01} suffix="%" onChange={(brokerRate) => set({ brokerRate })} />
            </Field>
            <Field label="Ziel-EK zusätzl. zu NK">
              <NumberInput value={p.equityTargetPct} step={1} suffix="%" onChange={(equityTargetPct) => set({ equityTargetPct })} />
            </Field>
            <Field label="Sollzins" hint={p.rateSource}>
              <NumberInput value={p.interestRate} step={0.05} suffix="%" onChange={(interestRate) => set({ interestRate, rateSource: "manuell eingegeben" })} />
            </Field>
            <Field label="Anfängliche Tilgung">
              <NumberInput value={p.repaymentRate} step={0.25} suffix="%" onChange={(repaymentRate) => set({ repaymentRate })} />
            </Field>
            <Field label="Zinsbindung">
              <NumberInput value={p.fixationYears} step={1} suffix="J." onChange={(fixationYears) => set({ fixationYears: Math.max(1, Math.round(fixationYears)) })} />
            </Field>
            <Field label="Sicherheitsabschlag Beleihungswert">
              <NumberInput value={p.lendingValueDiscount} step={1} suffix="%" onChange={(lendingValueDiscount) => set({ lendingValueDiscount })} />
            </Field>
            <Field label="Hausgeld gesamt">
              <NumberInput value={p.hoaMonthly} suffix="€/M" onChange={(hoaMonthly) => set({ hoaMonthly })} />
            </Field>
            <Field label="davon nicht umlagefähig">
              <NumberInput value={p.hoaNonAllocableShare} suffix="%" onChange={(hoaNonAllocableShare) => set({ hoaNonAllocableShare })} />
            </Field>
            <Field label="Eigene Instandhaltungsrücklage" className="col-span-2" hint="Zusätzlich zur Rücklage im Hausgeld, für Sondereigentum (Bad, Küche, Böden)">
              <NumberInput value={p.maintenancePerSqmYear} suffix="€/m²/J" onChange={(maintenancePerSqmYear) => set({ maintenancePerSqmYear })} />
            </Field>
            {p.usage === "rental" && (
              <>
                <Field label="Erwartete Kaltmiete">
                  <NumberInput value={p.expectedColdRentPerSqm} step={0.5} suffix="€/m²" onChange={(expectedColdRentPerSqm) => set({ expectedColdRentPerSqm })} />
                </Field>
                <Field label="Mietausfallwagnis">
                  <NumberInput value={p.vacancyRiskPct} suffix="%" onChange={(vacancyRiskPct) => set({ vacancyRiskPct })} />
                </Field>
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={fetchRate} disabled={loadingRate}>
              <RefreshCw size={13} className={loadingRate ? "animate-spin" : ""} /> Aktuellen Marktzins abrufen (EZB)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => set({ interestRate: DEFAULT_RATE_ASSUMPTION.value, rateSource: DEFAULT_RATE_ASSUMPTION.label })}>
              Standardannahme
            </Button>
          </div>
          {rateMsg && <div className="mt-2"><Alert tone={rateMsg.tone === "good" ? "good" : rateMsg.tone === "critical" ? "critical" : "info"} title={rateMsg.text} /></div>}
          {p.region !== "custom" && <Assumption>{REGION_DEFAULTS[p.region].source}</Assumption>}
        </Card>

        <div className="space-y-4 xl:col-span-2">
          <Card title="Eigenkapital-Fortschritt" subtitle={`Zieldatum ${new Date(p.targetDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" })} · noch ${monthsLeft} Monate`}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-text-2">{fmtEUR(equity)} von {fmtEUR(levels.target)}</span>
              <span className="font-medium">{fmtPct(ps.progressPct, 0)}</span>
            </div>
            <Progress value={ps.progressPct} tone={ps.onTrack ? "good" : "warn"} label="Eigenkapital-Fortschritt" />
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {[
                { l: "Minimum (nur NK)", v: levels.minimum },
                { l: "Empfohlen (NK + 10 %)", v: levels.recommended },
                { l: "Komfort (NK + 20 %)", v: levels.comfortable },
                { l: `Dein Ziel (NK + ${p.equityTargetPct} %)`, v: levels.target },
              ].map((x) => (
                <div key={x.l} className="rounded-xl bg-surface-2 p-3">
                  <div className="text-[11px] text-muted">{x.l}</div>
                  <div className="tabular font-semibold">{fmtEUR(x.v)}</div>
                  <div className={cx("tabular mt-1 text-xs", levelsMonthly(x.v) <= ps.currentMonthly ? "text-good" : "text-warn")}>{fmtEUR(levelsMonthly(x.v))}/Monat nötig</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-border p-3 text-sm">
                <div className="text-xs text-muted">Monatlich aufzubauen (Ziel)</div>
                <div className="tabular text-lg font-semibold">{fmtEUR(ps.requiredMonthly)}</div>
              </div>
              <div className="rounded-xl border border-border p-3 text-sm">
                <div className="text-xs text-muted">Aktuell geplant (Überschuss)</div>
                <div className={cx("tabular text-lg font-semibold", ps.currentMonthly >= ps.requiredMonthly ? "text-good" : "text-warn")}>{fmtEUR(ps.currentMonthly)}</div>
              </div>
              <div className="rounded-xl border border-border p-3 text-sm">
                <div className="text-xs text-muted">Ziel erreicht bei heutiger Rate</div>
                <div className="tabular text-lg font-semibold">{eta !== null ? monthLabel(addMonths(month, eta), true) : "> 50 Jahre"}</div>
              </div>
            </div>
            <div className="mt-4">
              <Lines
                label="Eigenkapital-Prognose"
                data={proj}
                height={220}
                reference={{ y: levels.target, label: "Ziel" }}
                series={[
                  { key: "conservative", label: "Konservativ", color: "var(--s2)" },
                  { key: "realistic", label: "Realistisch", color: "var(--s1)" },
                  { key: "ambitious", label: "Ambitioniert", color: "var(--s3)" },
                ]}
              />
            </div>
            <Assumption>
              Prognose inkl. Wegfall der Kreditrate ab April 2027{career ? `, Berufseinstieg ${monthLabel(career.month, true)} mit ${fmtEUR(career.netIncome)} netto (Einstellungen)` : ""}. Der gesamte Monatsüberschuss fließt ins Eigenkapital (Tagesgeld-Zins {fmtPct(data.settings.safeInterestPct)} p. a., Annahme).
            </Assumption>
          </Card>

          <Card title="Monatliche Belastung nach Kauf" subtitle={p.usage === "self" ? "Selbstnutzung" : "Kapitalanlage / Vermietung"}>
            <div className="grid gap-4 md:grid-cols-2">
              <Table compact head={["Posten", "pro Monat"]}>
                <tr><td>Kreditrate (Zins + Tilgung)</td><td>{fmtEUR(f.monthlyRate)}</td></tr>
                <tr><td>Hausgeld, nicht umlagefähig</td><td>{fmtEUR(f.hoaNonAllocable)}</td></tr>
                <tr><td>Eigene Instandhaltungsrücklage</td><td>{fmtEUR(f.maintenanceMonthly)}</td></tr>
                {p.usage === "self" && <tr><td>Umlagefähiges Hausgeld (zahlst du selbst)</td><td>{fmtEUR(p.hoaMonthly - f.hoaNonAllocable)}</td></tr>}
                <tr className="font-semibold">
                  <td>Gesamt{p.usage === "self" ? " (Wohnkosten)" : ""}</td>
                  <td>{fmtEUR(f.monthlyOwnerCost + (p.usage === "self" ? p.hoaMonthly - f.hoaNonAllocable : 0))}</td>
                </tr>
                {p.usage === "rental" && (
                  <>
                    <tr><td>Kaltmiete nach Ausfallwagnis</td><td className="text-good">+{fmtEUR(f.rentMonthly)}</td></tr>
                    <tr className="font-semibold"><td>Cashflow vor Steuern</td><td className={f.monthlyNetCashflow >= 0 ? "text-good" : "text-critical"}>{fmtEUR(f.monthlyNetCashflow)}</td></tr>
                  </>
                )}
              </Table>
              <div className="space-y-2 text-sm">
                <div className="rounded-xl bg-surface-2 p-3">
                  <div className="text-xs text-muted">Belastungsquote heute ({fmtEUR(plan.income)} netto)</div>
                  <div className={cx("tabular text-lg font-semibold", burdenNow !== null && burdenNow > 40 ? "text-critical" : burdenNow !== null && burdenNow > 35 ? "text-warn" : "text-good")}>{burdenNow !== null ? fmtPct(burdenNow, 0) : "–"}</div>
                </div>
                <div className="rounded-xl bg-surface-2 p-3">
                  <div className="text-xs text-muted">Belastungsquote nach Berufseinstieg</div>
                  <div className={cx("tabular text-lg font-semibold", burdenFuture !== null && burdenFuture > 40 ? "text-critical" : burdenFuture !== null && burdenFuture > 35 ? "text-warn" : "text-good")}>
                    {burdenFuture !== null ? `${fmtPct(burdenFuture, 0)} von ${fmtEUR(futureIncome!)}` : <span className="text-sm font-normal italic text-muted">Kein künftiges Einkommen hinterlegt (Einstellungen)</span>}
                  </div>
                </div>
                {p.usage === "rental" && (
                  <div className="rounded-xl bg-surface-2 p-3 text-xs text-text-2">
                    Bruttomietrendite {fmtPct(f.grossYieldPct)} · Kaufpreisfaktor {f.priceFactor.toFixed(1)}. Steuerliche Effekte (AfA, Werbungskosten) sind nicht modelliert.
                  </div>
                )}
                <Assumption>Faustregel vieler Banken: Wohnkosten max. 35–40 % des Nettoeinkommens. Eigene Haushaltsrechnung der Bank ist maßgeblich.</Assumption>
              </div>
            </div>
            {f.warnings.length > 0 && (
              <div className="mt-3 space-y-2">
                {f.warnings.map((w) => (
                  <Alert key={w} tone="warn" title={w} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-4" title="Kaufpreisszenarien: Berlin vs. Brandenburg" subtitle={`Empfohlenes Eigenkapital (NK + 10 %), Zins ${fmtPct(p.interestRate, 2)}, Tilgung ${fmtPct(p.repaymentRate)} · Sparrate bis ${monthLabel(toMonth(p.targetDate), true)}`}>
        <ScenarioTable rows={scenarios} />
        <Assumption>Grunderwerbsteuer: Berlin 6,0 %, Brandenburg 6,5 % (Landesrecht). Notar/Grundbuch {fmtPct(p.notaryRate)} und Makler {fmtPct(p.brokerRate, 2)} sind Annahmen aus deinen Eingaben. Hausgeld/Rücklage aus deinen Eingaben (nicht skaliert).</Assumption>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Finanzierungsszenarien: Zinsänderung" subtitle={`Darlehen ${fmtEUR(f.loan)}, Tilgung ${fmtPct(p.repaymentRate)}`}>
          <Table compact head={["Sollzins", "Monatsrate", "Δ zur Annahme"]}>
            {sens.map((r) => (
              <tr key={r.rate} className={Math.abs(r.rate - p.interestRate) < 0.01 ? "font-semibold" : ""}>
                <td>{fmtPct(r.rate)}</td>
                <td>{fmtEUR(r.monthlyRate)}</td>
                <td className={r.monthlyRate > f.monthlyRate ? "text-critical" : "text-good"}>{`${r.monthlyRate - f.monthlyRate >= 0 ? "+" : ""}${fmtEUR(r.monthlyRate - f.monthlyRate)}`}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Voraussichtliche Restschuld" subtitle={`Tilgungsverlauf bei ${fmtEUR(f.monthlyRate)}/Monat · ${f.payoffMonths ? `schuldenfrei nach ~${Math.ceil(f.payoffMonths / 12)} Jahren` : "keine vollständige Tilgung"}`}>
          <Lines label="Restschuldverlauf" xKey="month" data={yearly} height={220} series={[{ key: "balance", label: "Restschuld", color: "var(--s1)" }]} />
          <Assumption>Annahme: gleicher Zins über die gesamte Laufzeit. Nach {p.fixationYears} Jahren ist eine Anschlussfinanzierung zum dann gültigen Zins nötig (Zinsänderungsrisiko).</Assumption>
        </Card>
      </div>
    </>
  );
}

function ScenarioTable({ rows }: { rows: ReturnType<typeof priceScenarios> }) {
  const [region, setRegion] = useState<"berlin" | "brandenburg" | "both">("both");
  const list = rows.filter((r) => region === "both" || r.region === region);
  return (
    <>
      <div className="mb-3">
        <Tabs value={region} onChange={setRegion} options={[{ value: "both", label: "Beide" }, { value: "berlin", label: "Berlin" }, { value: "brandenburg", label: "Brandenburg" }]} />
      </div>
      <Table head={["Kaufpreis", "Region", "GrESt", "Nebenkosten", "EK min.", "EK empfohlen", "Darlehen", "Rate", "Wohnkosten", "Sparrate/Monat"]}>
        {list.map((r) => (
          <tr key={`${r.region}-${r.price}`}>
            <td className="font-medium">{fmtEUR(r.price)}</td>
            <td><Badge tone={r.region === "berlin" ? "accent" : "neutral"}>{r.region === "berlin" ? "Berlin" : "Brandenburg"}</Badge></td>
            <td>{fmtEUR(r.costs.transferTax)}</td>
            <td>{fmtEUR(r.costs.ancillary)}</td>
            <td>{fmtEUR(r.equityMin)}</td>
            <td>{fmtEUR(r.equityRecommended)}</td>
            <td>{fmtEUR(r.loanAtRecommended)}</td>
            <td>{fmtEUR(r.monthlyRateAtRecommended)}</td>
            <td className={r.burdenPct !== null && r.burdenPct > 40 ? "text-critical" : ""}>
              {fmtEUR(r.ownerCostAtRecommended)}
              {r.burdenPct !== null && <span className="text-xs text-muted"> ({fmtPct(r.burdenPct, 0)})</span>}
            </td>
            <td className="font-medium">{fmtEUR(r.monthlySavingNeeded)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
