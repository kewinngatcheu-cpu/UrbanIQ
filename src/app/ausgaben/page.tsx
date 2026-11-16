"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Plus } from "lucide-react";
import { useActions, useData, useNow } from "@/components/providers";
import { Button, Card, PageTitle, Progress, Segmented, Stat, cx } from "@/components/ui";
import { PeriodPicker, inPeriod, type Period } from "@/components/period";
import { ExpenseList, categoryColor } from "@/components/lists";
import { Bars, Donut } from "@/components/charts";
import { CATEGORIES, TRAVEL_CATEGORY, type Category } from "@/lib/types";
import { eur, pct } from "@/lib/format";
import { monthSummary } from "@/lib/calc/finance";
import { monthLabel, monthsOfYear, toMonth } from "@/lib/calc/months";
import { download, expensesCsv } from "@/lib/csv";

export default function AusgabenPage() {
  return (
    <Suspense>
      <Ausgaben />
    </Suspense>
  );
}

function Ausgaben() {
  const params = useSearchParams();
  const router = useRouter();
  const view = params.get("ansicht") === "monat" ? "overview" : "list";
  const setView = (v: "list" | "overview") => router.replace(v === "overview" ? "/ausgaben?ansicht=monat" : "/ausgaben", { scroll: false });
  const now = useNow();
  const [period, setPeriod] = useState<Period>({ mode: "month", month: toMonth(now) });
  const open = useActions();

  return (
    <>
      <PageTitle
        title="Ausgaben"
        subtitle="Eintragen, filtern, auswerten"
        action={
          <div className="hidden sm:block">
            <Button variant="primary" onClick={() => open({ type: "expense" })}>
              <Plus size={18} /> Ausgabe hinzufügen
            </Button>
          </div>
        }
      />
      <Segmented
        className="mb-4"
        value={view}
        onChange={setView}
        options={[
          { value: "list", label: "Ausgaben" },
          { value: "overview", label: "Monatsübersicht" },
        ]}
      />
      <div className="mb-4">
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>
      {view === "list" ? <ExpenseView period={period} /> : period.mode === "month" ? <MonthOverview month={period.month} /> : <YearOverview year={period.year} />}
    </>
  );
}

function ExpenseView({ period }: { period: Period }) {
  const data = useData();
  const [cat, setCat] = useState<Category | "">("");
  const list = data.expenses.filter((e) => inPeriod(e.date, period) && (!cat || e.category === cat));
  const all = data.expenses.filter((e) => inPeriod(e.date, period));
  const total = list.reduce((s, e) => s + e.amount, 0);
  const byCat = CATEGORIES.map((c) => ({ name: c, value: all.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) }));
  const periodName = period.mode === "month" ? monthLabel(period.month) : String(period.year);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3" title={`${eur(total)} ${cat ? `für ${cat}` : "ausgegeben"}`} subtitle={`${list.length} Einträge · ${periodName}`} action={
        <Button size="sm" onClick={() => download(`ausgaben-${period.mode === "month" ? period.month : period.year}.csv`, expensesCsv(data, (d) => inPeriod(d, period)), "text/csv;charset=utf-8")}>
          <Download size={14} /> CSV
        </Button>
      }>
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(["", ...CATEGORIES] as const).map((c) => (
            <button
              key={c || "alle"}
              onClick={() => setCat(c)}
              className={cx("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium", cat === c ? "border-accent bg-accent text-white" : "border-border text-text-2")}
            >
              {c || "Alle"}
            </button>
          ))}
        </div>
        <ExpenseList items={list} empty={`Keine Ausgaben ${cat ? `in ${cat} ` : ""}im Zeitraum ${periodName}.`} />
      </Card>
      <Card className="lg:col-span-2" title="Nach Kategorie">
        <Donut items={byCat} colorOf={categoryColor} label="Ausgaben nach Kategorie" />
      </Card>
    </div>
  );
}

function MonthOverview({ month }: { month: string }) {
  const data = useData();
  const s = monthSummary(data, month);
  const plannedSaving = s.plan.savingsPlans + Math.max(0, s.plan.free);
  const rows = [
    { name: "Fixkosten", plan: s.plan.fixed, actual: s.fixed },
    { name: "Persönlich", plan: s.plan.personalBudget, actual: s.personalSpent },
    { name: "Reisen", plan: s.plan.travelBudget, actual: s.travelSpent },
    { name: "Sparen", plan: plannedSaving, actual: s.saved },
  ];
  const byCat = CATEGORIES.map((c) => ({ name: c, value: s.byCategory[c] }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Einnahmen" value={eur(s.income)} />
        <Stat label="Fixkosten" value={eur(s.fixed)} sub={s.plan.activeItems.some((p) => p.endMonth === month) ? "letzter Monat mit Kredit" : undefined} />
        <Stat label="Variable Ausgaben" value={eur(s.variable)} sub={`${s.expenseCount} Einträge`} />
        <Stat label="Gespart" value={eur(s.saved)} sub={s.savingsRate !== null ? `Sparquote ${pct(s.savingsRate * 100)}` : undefined} tone="good" />
        <Stat label="davon Investments" value={eur(s.invested)} />
        <Stat label="Reisebudget" value={eur(s.travelLeft)} sub={`übrig von ${eur(s.plan.travelBudget)}`} tone={s.travelLeft < 0 ? "bad" : undefined} />
        <Stat label="Persönliches Budget" value={eur(s.personalLeft)} sub={`übrig von ${eur(s.plan.personalBudget)}`} tone={s.personalLeft < 0 ? "bad" : undefined} />
        <Stat label="Verbleibendes Geld" value={eur(s.remaining)} tone={s.remaining < 0 ? "bad" : "good"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Geplant vs. tatsächlich" subtitle={monthLabel(month)}>
          <Bars
            label="Geplant gegenüber tatsächlich"
            xKey="name"
            data={rows}
            series={[
              { key: "plan", label: "Geplant", color: "var(--s9)" },
              { key: "actual", label: "Tatsächlich", color: "var(--s1)" },
            ]}
          />
          <ul className="mt-3 space-y-3">
            {rows.map((r) => {
              const ratio = r.plan > 0 ? (r.actual / r.plan) * 100 : 0;
              const over = r.name !== "Sparen" && r.actual > r.plan + 0.001;
              return (
                <li key={r.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{r.name}</span>
                    <span className={cx("tabular", over && "text-bad")}>
                      {eur(r.actual)} <span className="text-muted">/ {eur(r.plan)}</span>
                    </span>
                  </div>
                  <Progress value={ratio} tone={over ? "bad" : r.name === "Sparen" ? "good" : r.name !== "Fixkosten" && ratio > 85 ? "warn" : "accent"} label={r.name} />
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title="Ausgaben nach Kategorie" subtitle={`${s.byCategory[TRAVEL_CATEGORY] > 0 ? "inkl. Reisen · " : ""}${monthLabel(month)}`}>
          <Donut items={byCat} colorOf={categoryColor} label="Ausgaben nach Kategorie" />
        </Card>
      </div>
    </div>
  );
}

function YearOverview({ year }: { year: number }) {
  const data = useData();
  const months = monthsOfYear(year).map((m) => ({ m, s: monthSummary(data, m) }));
  const sum = (f: (s: ReturnType<typeof monthSummary>) => number) => months.reduce((t, x) => t + f(x.s), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Einnahmen" value={eur(sum((s) => s.income))} />
        <Stat label="Fixkosten" value={eur(sum((s) => s.fixed))} />
        <Stat label="Variable Ausgaben" value={eur(sum((s) => s.variable))} />
        <Stat label="Gespart" value={eur(sum((s) => s.saved))} tone="good" />
      </div>
      <Card title={`Jahr ${year}`} subtitle="Ausgaben und Sparen je Monat">
        <Bars
          label="Jahresübersicht"
          xKey="month"
          data={months.map(({ m, s }) => ({ month: m, spent: s.fixed + s.variable, saved: s.saved }))}
          series={[
            { key: "spent", label: "Fixkosten + Ausgaben", color: "var(--s2)" },
            { key: "saved", label: "Gespart", color: "var(--s3)" },
          ]}
        />
        <div className="-mx-4 mt-4 overflow-x-auto px-4">
          <table className="tabular w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 font-medium">Monat</th>
                <th className="font-medium">Fixkosten</th>
                <th className="font-medium">Ausgaben</th>
                <th className="font-medium">Gespart</th>
                <th className="font-medium">Übrig</th>
              </tr>
            </thead>
            <tbody>
              {months.map(({ m, s }) => (
                <tr key={m} className="border-t border-border/70">
                  <td className="py-2">{monthLabel(m, false)}</td>
                  <td>{eur(s.fixed)}</td>
                  <td>{eur(s.variable)}</td>
                  <td className="text-good">{eur(s.saved)}</td>
                  <td className={s.remaining < 0 ? "text-bad" : ""}>{eur(s.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
