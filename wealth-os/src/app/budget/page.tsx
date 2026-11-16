"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useFinance, useNow } from "@/components/providers";
import { Alert, Assumption, Badge, Button, Card, Field, Missing, Modal, NumberInput, PageHeader, Progress, Select, Stat, Table, Tabs, cx } from "@/components/ui";
import { Bars } from "@/components/charts";
import { MonthPicker } from "@/components/month-picker";
import { fmtEUR, fmtPct, uid } from "@/lib/format";
import { actualsForMonth, budgetAlerts, compareBudget, planForMonth } from "@/lib/finance/plan";
import { addMonths, monthLabel, monthRange, toMonth } from "@/lib/finance/months";
import { CATEGORIES, type Budget, type ExpenseCategory } from "@/lib/types";
import { remove, upsert } from "@/lib/db";

export default function BudgetPage() {
  const data = useFinance();
  const now = useNow();
  const [month, setMonth] = useState(toMonth(now));
  const [view, setView] = useState<"month" | "compare" | "year">("month");
  const [editing, setEditing] = useState<Budget | null>(null);

  const plan = useMemo(() => planForMonth(data, month), [data, month]);
  const act = useMemo(() => actualsForMonth(data.transactions, month), [data, month]);
  const comps = useMemo(() => compareBudget(plan, act, data.settings.warnThresholdPct), [plan, act, data.settings.warnThresholdPct]);
  const alerts = budgetAlerts(comps, data.settings.personalCategories, data.settings.personalBudgetCap);
  const personalPlanned = data.settings.personalCategories.reduce((s, c) => s + plan.variableByCategory[c], 0);
  const personalActual = data.settings.personalCategories.reduce((s, c) => s + act.byCategory[c], 0);

  return (
    <>
      <PageHeader
        title="Budget"
        description="Monatsplanung, Soll-Ist-Vergleich je Kategorie und automatische Warnungen. Fixkosten kommen aus „Fixkosten & Abos“, variable Budgets legst du hier fest."
        actions={<MonthPicker value={month} onChange={setMonth} />}
      />
      <div className="mb-4">
        <Tabs value={view} onChange={setView} options={[{ value: "month", label: "Monat" }, { value: "compare", label: "Monatsvergleich" }, { value: "year", label: "Jahresübersicht" }]} />
      </div>

      {view === "month" && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Einkommen (Plan)" value={fmtEUR(plan.income)} sub={act.hasData ? `Ist ${fmtEUR(act.income)}` : "Ist: keine Buchungen"} />
            <Stat label="Fixkosten" value={fmtEUR(plan.fixedCosts)} sub={`${plan.items.filter((i) => i.item.kind === "expense").length} Posten`} />
            <Stat label="Variable Budgets" value={fmtEUR(plan.variableBudget)} sub={`davon persönlich ${fmtEUR(personalPlanned)} / max. ${fmtEUR(data.settings.personalBudgetCap)}`} tone={personalPlanned > data.settings.personalBudgetCap ? "critical" : undefined} />
            <Stat label="Investments" value={fmtEUR(plan.investments)} sub="Sparpläne" />
            <Stat label="→ Immobilien-EK" value={fmtEUR(plan.surplus)} sub="frei verfügbarer Rest" tone={plan.surplus < 0 ? "critical" : "good"} />
            <Stat label="Sparquote (Plan)" value={fmtPct(plan.savingsRate * 100)} sub={act.savingsRate !== null ? `Ist ${fmtPct(act.savingsRate * 100)}` : "Ist: n. v."} />
          </div>

          {plan.items.some((i) => i.item.endMonth === month) && (
            <div className="mt-3">
              <Alert tone="info" title="Änderung ab nächstem Monat">
                {plan.items.filter((i) => i.item.endMonth === month).map((i) => `${i.item.name} (${fmtEUR(i.amount)}) endet mit ${monthLabel(month, true)} – ab ${monthLabel(addMonths(month, 1), true)} steigt dein Überschuss automatisch.`).join("\n")}
              </Alert>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {alerts.map((a) => (
                <Alert key={a.message} tone={a.severity === "over" ? "critical" : "warn"} title={a.message} />
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2" title="Soll-Ist-Vergleich" subtitle={act.hasData ? `${act.count} Buchungen in ${monthLabel(month, true)}` : "Keine Buchungen in diesem Monat – Ist-Werte fehlen"}>
              <Table head={["Kategorie", "Soll", "Ist", "Differenz", "Verbrauch"]}>
                {comps
                  .filter((c) => c.planned > 0 || c.actual > 0)
                  .map((c) => (
                    <tr key={c.category}>
                      <td className="font-medium">
                        <span className="flex items-center gap-2">
                          {c.category}
                          {c.status === "over" && <Badge tone="critical">über Budget</Badge>}
                          {c.status === "warning" && <Badge tone="warn">≥ {data.settings.warnThresholdPct} %</Badge>}
                          {c.status === "unplanned" && <Badge tone="warn">ungeplant</Badge>}
                        </span>
                      </td>
                      <td>{fmtEUR(c.planned)}</td>
                      <td>{act.hasData ? fmtEUR(c.actual) : <Missing>–</Missing>}</td>
                      <td className={cx(c.diff < 0 && !["Sparen", "Investments"].includes(c.category) ? "text-critical" : "text-text-2")}>{act.hasData ? `${c.diff >= 0 ? "+" : ""}${fmtEUR(c.diff)}` : "–"}</td>
                      <td className="w-36">
                        {c.usedPct !== null && act.hasData ? (
                          <div className="flex items-center gap-2">
                            <Progress value={c.usedPct} tone={c.status === "over" ? "critical" : c.status === "warning" ? "warn" : "good"} label={`${c.category} Verbrauch`} />
                            <span className="w-12 whitespace-nowrap text-right text-xs text-muted">{Math.round(c.usedPct)} %</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">–</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </Table>
              <div className="mt-3 rounded-xl bg-surface-2 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-2">Persönliche Ausgaben ({data.settings.personalCategories.join(", ")})</span>
                  <span className="tabular font-medium">
                    {act.hasData ? fmtEUR(personalActual) : "–"} / {fmtEUR(data.settings.personalBudgetCap)}
                  </span>
                </div>
                <div className="mt-2">
                  <Progress value={(personalActual / Math.max(1, data.settings.personalBudgetCap)) * 100} tone={personalActual > data.settings.personalBudgetCap ? "critical" : personalActual > data.settings.personalBudgetCap * 0.8 ? "warn" : "good"} label="Persönliches Budget" />
                </div>
              </div>
            </Card>

            <Card
              title="Variable Budgets"
              subtitle="Monatslimit je Kategorie"
              action={
                <Button size="sm" onClick={() => setEditing({ id: uid("bud"), category: "Freizeit", monthlyLimit: 0 })}>
                  <Plus size={14} /> Budget
                </Button>
              }
            >
              <ul className="divide-y divide-border/60">
                {data.budgets.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <button className="min-w-0 text-left hover:text-accent" onClick={() => setEditing(b)}>
                      <div className="font-medium">{b.category}</div>
                      <div className="text-xs text-muted">
                        {b.startMonth || b.endMonth ? `${b.startMonth ? monthLabel(b.startMonth) : "…"} – ${b.endMonth ? monthLabel(b.endMonth) : "…"}` : "dauerhaft"}
                        {data.settings.personalCategories.includes(b.category) && " · persönlich"}
                      </div>
                    </button>
                    <span className="tabular font-medium">{fmtEUR(b.monthlyLimit)}</span>
                  </li>
                ))}
              </ul>
              <Assumption>Zeitlich begrenzte Budgets (z. B. höheres Reisebudget im Sommer) über Start-/Endmonat.</Assumption>
            </Card>
          </div>
        </>
      )}

      {view === "compare" && <MonthCompare month={month} />}
      {view === "year" && <YearOverview year={Number(month.slice(0, 4))} />}

      {editing && <BudgetModal key={editing.id} budget={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function MonthCompare({ month }: { month: string }) {
  const data = useFinance();
  const prev = addMonths(month, -1);
  const a = actualsForMonth(data.transactions, month);
  const b = actualsForMonth(data.transactions, prev);
  const rows = CATEGORIES.map((c) => ({ month: c, current: a.byCategory[c], previous: b.byCategory[c] })).filter((r) => r.current > 0 || r.previous > 0);
  return (
    <Card title={`${monthLabel(prev, true)} vs. ${monthLabel(month, true)}`} subtitle="Ist-Ausgaben je Kategorie">
      {!a.hasData || !b.hasData ? (
        <Missing>Für einen Vergleich werden Buchungen in beiden Monaten benötigt.</Missing>
      ) : (
        <>
          <Bars
            label="Monatsvergleich"
            xKey="month"
            data={rows as never}
            height={260}
            series={[
              { key: "previous", label: monthLabel(prev), color: "var(--s2)" },
              { key: "current", label: monthLabel(month), color: "var(--s1)" },
            ]}
          />
          <Table className="mt-4" head={["Kategorie", monthLabel(prev), monthLabel(month), "Veränderung"]}>
            {rows.map((r) => {
              const d = r.current - r.previous;
              return (
                <tr key={r.month}>
                  <td>{r.month}</td>
                  <td>{fmtEUR(r.previous)}</td>
                  <td>{fmtEUR(r.current)}</td>
                  <td className={d > 0 && !["Sparen", "Investments"].includes(r.month) ? "text-critical" : "text-good"}>{`${d >= 0 ? "+" : ""}${fmtEUR(d)}`}</td>
                </tr>
              );
            })}
            <tr className="font-semibold">
              <td>Konsum gesamt</td>
              <td>{fmtEUR(b.spending)}</td>
              <td>{fmtEUR(a.spending)}</td>
              <td>{`${a.spending - b.spending >= 0 ? "+" : ""}${fmtEUR(a.spending - b.spending)}`}</td>
            </tr>
          </Table>
        </>
      )}
    </Card>
  );
}

function YearOverview({ year }: { year: number }) {
  const data = useFinance();
  const months = monthRange(`${year}-01`, 12);
  const rows = months.map((m) => ({ m, p: planForMonth(data, m), a: actualsForMonth(data.transactions, m) }));
  const withData = rows.filter((r) => r.a.hasData);
  const sum = (f: (r: (typeof rows)[number]) => number, list = rows) => list.reduce((s, r) => s + f(r), 0);
  return (
    <Card title={`Jahresübersicht ${year}`} subtitle={`${withData.length} von 12 Monaten mit Buchungen · Plan berücksichtigt alle zeitlichen Änderungen`}>
      <Table head={["Monat", "Einnahmen Plan", "Einnahmen Ist", "Ausgaben Plan", "Ausgaben Ist", "Sparquote Plan", "Sparquote Ist", "→ Immobilien-EK (Plan)"]}>
        {rows.map(({ m, p, a }) => (
          <tr key={m}>
            <td className="font-medium">{monthLabel(m)}</td>
            <td>{fmtEUR(p.income)}</td>
            <td>{a.hasData ? fmtEUR(a.income) : <Missing>–</Missing>}</td>
            <td>{fmtEUR(p.plannedSpending)}</td>
            <td className={a.hasData && a.spending > p.plannedSpending ? "text-critical" : ""}>{a.hasData ? fmtEUR(a.spending) : <Missing>–</Missing>}</td>
            <td>{fmtPct(p.savingsRate * 100)}</td>
            <td>{a.savingsRate !== null ? fmtPct(a.savingsRate * 100) : <Missing>–</Missing>}</td>
            <td>{fmtEUR(p.surplus)}</td>
          </tr>
        ))}
        <tr className="font-semibold">
          <td>Summe</td>
          <td>{fmtEUR(sum((r) => r.p.income))}</td>
          <td>{withData.length ? fmtEUR(sum((r) => r.a.income, withData)) : "–"}</td>
          <td>{fmtEUR(sum((r) => r.p.plannedSpending))}</td>
          <td>{withData.length ? fmtEUR(sum((r) => r.a.spending, withData)) : "–"}</td>
          <td />
          <td />
          <td>{fmtEUR(sum((r) => r.p.surplus))}</td>
        </tr>
      </Table>
      <Assumption>Ist-Summen beziehen sich nur auf Monate mit erfassten Buchungen.</Assumption>
    </Card>
  );
}

function BudgetModal({ budget, onClose }: { budget: Budget; onClose: () => void }) {
  const data = useFinance();
  const [draft, setDraft] = useState<Budget>(budget);
  const exists = data.budgets.some((b) => b.id === draft.id);
  return (
    <Modal
      open
      onClose={onClose}
      title={exists ? "Budget bearbeiten" : "Neues Budget"}
      footer={
        <>
          {exists && (
            <Button variant="danger" onClick={() => remove("budgets", draft.id).then(onClose)}>
              <Trash2 size={14} /> Löschen
            </Button>
          )}
          <Button variant="primary" onClick={() => upsert("budgets", { ...draft, startMonth: draft.startMonth || undefined, endMonth: draft.endMonth || undefined }).then(onClose)}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kategorie">
          <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ExpenseCategory })}>
            {CATEGORIES.filter((c) => c !== "Investments" && c !== "Sparen").map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Monatslimit">
          <NumberInput value={draft.monthlyLimit} min={0} suffix="€" onChange={(v) => setDraft({ ...draft, monthlyLimit: v })} />
        </Field>
        <Field label="Gültig ab (optional)">
          <input type="month" className="h-10 rounded-xl border border-border bg-surface-2 px-3 text-sm" value={draft.startMonth ?? ""} onChange={(e) => setDraft({ ...draft, startMonth: e.target.value || undefined })} />
        </Field>
        <Field label="Gültig bis (optional)">
          <input type="month" className="h-10 rounded-xl border border-border bg-surface-2 px-3 text-sm" value={draft.endMonth ?? ""} onChange={(e) => setDraft({ ...draft, endMonth: e.target.value || undefined })} />
        </Field>
      </div>
    </Modal>
  );
}
