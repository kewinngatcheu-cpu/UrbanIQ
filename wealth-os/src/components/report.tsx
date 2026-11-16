"use client";
import { useMemo } from "react";
import { useFinance, useNow } from "./providers";
import { Missing } from "./ui";
import { buildMonthReport, generateInsights, nextMonthTasks } from "@/lib/finance/analyst";
import { actualsForMonth, planForMonth } from "@/lib/finance/plan";
import { addMonths, monthLabel } from "@/lib/finance/months";
import { historyWithCurrent } from "@/lib/finance/series";
import { CATEGORIES, type Month } from "@/lib/types";
import { fmtEUR, fmtPct } from "@/lib/format";

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border/60 py-3 last:border-0">
      <h3 className="mb-1.5 text-sm font-semibold">
        <span className="mr-1.5 text-muted">{n}.</span>
        {title}
      </h3>
      <div className="space-y-1 text-sm text-text-2">{children}</div>
    </section>
  );
}

/** Regelbasierter Monatsbericht (7 Abschnitte) – ausschließlich aus gespeicherten Daten. */
export function LocalMonthReport({ month }: { month: Month }) {
  const data = useFinance();
  const now = useNow();
  const r = useMemo(() => buildMonthReport(data, month), [data, month]);
  const plan = planForMonth(data, month);
  const a = actualsForMonth(data.transactions, month);
  const prev = actualsForMonth(data.transactions, addMonths(month, -1));
  const hist = historyWithCurrent(data, now, 3);
  const insights = generateInsights(data, now);
  const tasks = nextMonthTasks(data, now);
  const rising = a.hasData && prev.hasData
    ? CATEGORIES.filter((c) => c !== "Sparen" && c !== "Investments").map((c) => ({ c, d: a.byCategory[c] - prev.byCategory[c] })).filter((x) => x.d > 10).sort((x, y) => y.d - x.d)
    : [];

  return (
    <div>
      <Section n={1} title="Finanzielle Entwicklung">
        <p>
          Nettovermögen aktuell <b className="text-text">{fmtEUR(r.netWorth)}</b>.{" "}
          {r.netWorthChange !== null ? <>Veränderung (brutto) ggü. Vormonat: <b className="text-text">{r.netWorthChange >= 0 ? "+" : ""}{fmtEUR(r.netWorthChange)}</b>.</> : <Missing>Vormonats-Snapshot fehlt – Veränderung nicht berechenbar.</Missing>}
        </p>
      </Section>
      <Section n={2} title="Einnahmen und Ausgaben">
        {a.hasData ? (
          <p>
            Einnahmen {fmtEUR(a.income)} (Plan {fmtEUR(plan.income)}), Konsumausgaben {fmtEUR(a.spending)} (Plan {fmtEUR(plan.plannedSpending)}), in Sparen/Investments überwiesen {fmtEUR(a.savingsTransfers)}.
          </p>
        ) : (
          <Missing>Keine Buchungen für {monthLabel(month, true)} – Ist-Werte fehlen.</Missing>
        )}
      </Section>
      <Section n={3} title="Sparquote">
        <p>
          Plan {fmtPct(r.plannedSavingsRate * 100)} · Ist {r.actualSavingsRate !== null ? fmtPct(r.actualSavingsRate * 100) : <Missing>nicht berechenbar</Missing>}
        </p>
      </Section>
      <Section n={4} title="Vermögensentwicklung">
        {hist.length > 1 ? (
          <ul className="tabular">
            {hist.map((h) => (
              <li key={h.month}>
                {monthLabel(h.month)}: {fmtEUR(h.total)} (Immobilien-EK {fmtEUR(h.property)}, investiert {fmtEUR(h.invested)})
              </li>
            ))}
          </ul>
        ) : (
          <Missing>Zu wenige Snapshots.</Missing>
        )}
      </Section>
      <Section n={5} title="Auffälligkeiten">
        {r.overBudget.length === 0 && rising.length === 0 ? <p>Keine Budgetüberschreitungen oder auffälligen Anstiege.</p> : null}
        {r.overBudget.map((o) => (
          <p key={o.category}>
            {o.category}: {fmtEUR(o.actual)} bei {fmtEUR(o.planned)} Budget
          </p>
        ))}
        {rising.map((x) => (
          <p key={x.c}>
            {x.c}: +{fmtEUR(x.d)} ggü. Vormonat
          </p>
        ))}
        {r.openBills.length > 0 && <p>Offen/nicht gebucht: {r.openBills.map((b) => `${b.name} (${fmtEUR(b.amount)})`).join(", ")}</p>}
      </Section>
      <Section n={6} title="Verbesserungspotenzial">
        {insights.filter((i) => i.action).length === 0 ? <p>Keine Hinweise.</p> : insights.filter((i) => i.action).map((i) => <p key={i.id}>• {i.action}</p>)}
      </Section>
      <Section n={7} title="Aufgaben für den nächsten Monat">
        <ul>
          {tasks.map((t) => (
            <li key={t} className="flex gap-2">
              <input type="checkbox" className="mt-1" aria-label={t} /> <span>{t}</span>
            </li>
          ))}
        </ul>
      </Section>
      {r.missing.length > 0 && (
        <div className="mt-2 rounded-xl border border-dashed border-border p-3 text-xs text-muted">
          <b>Fehlende Daten:</b> {r.missing.join(" · ")}
        </div>
      )}
    </div>
  );
}

/** Minimaler, sicherer Markdown-Renderer (Überschriften, Listen, fett) – kein HTML aus der KI-Antwort. */
export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <b key={i} className="text-text">{part.slice(2, -2)}</b> : <span key={i}>{part}</span>));
  return (
    <div className="space-y-1.5 text-sm text-text-2">
      {lines.map((l, i) => {
        if (/^#{1,6}\s/.test(l)) return <h4 key={i} className="pt-2 text-sm font-semibold text-text">{inline(l.replace(/^#+\s/, ""))}</h4>;
        if (/^\s*([-*]|\d+\.)\s/.test(l)) return <p key={i} className="pl-3">• {inline(l.replace(/^\s*([-*]|\d+\.)\s(\[.\]\s)?/, ""))}</p>;
        if (!l.trim()) return null;
        return <p key={i}>{inline(l)}</p>;
      })}
    </div>
  );
}
