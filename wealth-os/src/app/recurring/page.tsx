"use client";
import { useMemo, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { useFinance, useNow } from "@/components/providers";
import { Badge, Button, Card, PageHeader, Stat, Table, Tabs, cx } from "@/components/ui";
import { RecurringModal } from "@/components/recurring-modal";
import { MonthPicker } from "@/components/month-picker";
import { fmtEUR, uid } from "@/lib/format";
import { addMonths, daysInMonth, monthLabel, parseMonth, toMonth } from "@/lib/finance/months";
import { recurringAmountForMonth, recurringMonthlyEquivalent } from "@/lib/finance/plan";
import { openBills } from "@/lib/finance/analyst";
import type { RecurringItem } from "@/lib/types";

const INTERVAL = { monthly: "mtl.", quarterly: "quartalsw.", yearly: "jährl." };

export default function RecurringPage() {
  const data = useFinance();
  const now = useNow();
  const [view, setView] = useState<"list" | "subs" | "calendar" | "timeline">("list");
  const [editing, setEditing] = useState<RecurringItem | null>(null);
  const month = toMonth(now);
  const active = data.recurring.filter((r) => recurringAmountForMonth(r, month) > 0 || (r.interval !== "monthly" && (!r.endMonth || r.endMonth >= month) && r.startMonth <= month));
  const sumKind = (k: RecurringItem["kind"]) => active.filter((r) => r.kind === k).reduce((s, r) => s + recurringMonthlyEquivalent(r), 0);
  const subs = data.recurring.filter((r) => (r.isSubscription || r.isContract) && (!r.endMonth || r.endMonth >= month));

  return (
    <>
      <PageHeader
        title="Fixkosten & Abos"
        description="Wiederkehrende Einnahmen, Fixkosten, Verträge, Abonnements und Sparpläne – mit Laufzeiten. Änderungen wirken automatisch auf Budget und Prognosen."
        actions={
          <Button variant="primary" onClick={() => setEditing({ id: uid("rec"), name: "", amount: 0, kind: "expense", category: "Abonnements", interval: "monthly", dayOfMonth: 1, startMonth: month })}>
            <Plus size={15} /> Neuer Posten
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Einnahmen / Monat" value={fmtEUR(sumKind("income"))} />
        <Stat label="Fixkosten / Monat" value={fmtEUR(sumKind("expense"))} sub="inkl. anteilige Jahresbeträge" />
        <Stat label="Sparpläne / Monat" value={fmtEUR(sumKind("investment") + sumKind("saving"))} />
        <Stat label="Abos / Jahr" value={fmtEUR(subs.filter((s) => s.isSubscription).reduce((s, r) => s + recurringMonthlyEquivalent(r) * 12, 0))} sub={`${subs.filter((s) => s.isSubscription).length} Abonnements`} />
      </div>
      <div className="mb-4">
        <Tabs value={view} onChange={setView} options={[{ value: "list", label: "Alle Posten" }, { value: "subs", label: "Verträge & Abos" }, { value: "calendar", label: "Zahlungskalender" }, { value: "timeline", label: "Zukünftige Änderungen" }]} />
      </div>

      {view === "list" && (
        <Card>
          <Table head={["Name", "Art", "Kategorie", "Betrag", "Fällig", "Laufzeit"]}>
            {[...data.recurring]
              .sort((a, b) => ["income", "expense", "investment", "saving"].indexOf(a.kind) - ["income", "expense", "investment", "saving"].indexOf(b.kind) || b.amount - a.amount)
              .map((r) => {
                const ended = r.endMonth && r.endMonth < month;
                return (
                  <tr key={r.id} className={cx("cursor-pointer hover:bg-surface-2", ended && "opacity-50")} onClick={() => setEditing(r)}>
                    <td className="font-medium">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {r.name}
                        {r.isSubscription && <Badge>Abo</Badge>}
                        {r.isContract && <Badge>Vertrag</Badge>}
                        {ended && <Badge>beendet</Badge>}
                      </span>
                    </td>
                    <td className="text-text-2">{{ income: "Einnahme", expense: "Ausgabe", investment: "Investment", saving: "Sparen" }[r.kind]}</td>
                    <td className="text-text-2">{r.category}</td>
                    <td className={r.kind === "income" ? "text-good" : ""}>
                      {fmtEUR(r.amount)} <span className="text-xs text-muted">{INTERVAL[r.interval]}</span>
                    </td>
                    <td className="text-text-2">{r.dayOfMonth}.</td>
                    <td className="text-xs text-text-2">
                      {monthLabel(r.startMonth)} – {r.endMonth ? <span className="font-medium text-warn">{monthLabel(r.endMonth)}</span> : "unbefristet"}
                    </td>
                  </tr>
                );
              })}
          </Table>
        </Card>
      )}

      {view === "subs" && (
        <Card title="Verträge & Abonnements" subtitle="Monats- und Jahreskosten, Laufzeitenden und Kündigungshinweise">
          <Table head={["Name", "Monatlich", "Jährlich", "Laufzeitende", "Hinweis"]}>
            {subs.map((r) => {
              const monthsLeft = r.endMonth ? (parseMonth(r.endMonth).y - parseMonth(month).y) * 12 + parseMonth(r.endMonth).m - parseMonth(month).m : null;
              return (
                <tr key={r.id} className="cursor-pointer hover:bg-surface-2" onClick={() => setEditing(r)}>
                  <td className="font-medium">{r.name}</td>
                  <td>{fmtEUR(recurringMonthlyEquivalent(r))}</td>
                  <td>{fmtEUR(recurringMonthlyEquivalent(r) * 12)}</td>
                  <td>
                    {r.endMonth ? (
                      <span className="flex items-center gap-1.5">
                        {monthLabel(r.endMonth, true)}
                        {monthsLeft !== null && monthsLeft <= 3 && <Badge tone="warn">in {monthsLeft} Mon.</Badge>}
                      </span>
                    ) : (
                      <span className="text-muted">–</span>
                    )}
                  </td>
                  <td className="max-w-64 text-xs text-text-2">{r.cancellationNotice ?? r.note ?? ""}</td>
                </tr>
              );
            })}
            <tr className="font-semibold">
              <td>Summe</td>
              <td>{fmtEUR(subs.reduce((s, r) => s + recurringMonthlyEquivalent(r), 0))}</td>
              <td>{fmtEUR(subs.reduce((s, r) => s + recurringMonthlyEquivalent(r) * 12, 0))}</td>
              <td />
              <td />
            </tr>
          </Table>
        </Card>
      )}

      {view === "calendar" && <PaymentCalendar onSelect={setEditing} />}
      {view === "timeline" && <Timeline />}

      {editing && <RecurringModal key={editing.id} item={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function PaymentCalendar({ onSelect }: { onSelect: (r: RecurringItem) => void }) {
  const data = useFinance();
  const now = useNow();
  const [month, setMonth] = useState(toMonth(now));
  const days = daysInMonth(month);
  const { y, m } = parseMonth(month);
  const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Mo = 0
  const open = new Set(openBills(data, month).map((b) => b.id));
  const due = useMemo(
    () =>
      data.recurring
        .map((r) => ({ r, amount: recurringAmountForMonth(r, month) }))
        .filter((x) => x.amount > 0),
    [data.recurring, month],
  );
  const byDay = (d: number) => due.filter((x) => Math.min(x.r.dayOfMonth, days) === d);
  const isToday = (d: number) => toMonth(now) === month && now.getDate() === d;

  return (
    <Card title="Zahlungskalender" action={<MonthPicker value={month} onChange={setMonth} />}>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
          <div key={d} className={cx("min-h-16 rounded-lg border border-border/60 p-1 sm:min-h-20", isToday(d) && "border-accent")}>
            <div className={cx("text-[11px]", isToday(d) ? "font-semibold text-accent" : "text-muted")}>{d}</div>
            <div className="mt-0.5 space-y-0.5">
              {byDay(d).map(({ r, amount }) => (
                <button
                  key={r.id}
                  onClick={() => onSelect(r)}
                  title={`${r.name}: ${fmtEUR(amount)}`}
                  className={cx(
                    "block w-full truncate rounded px-1 text-left text-[10px] leading-4",
                    r.kind === "income" ? "bg-good/15 text-good" : r.kind === "expense" ? (open.has(r.id) ? "bg-warn/15 text-warn" : "bg-surface-2 text-text-2") : "bg-accent/15 text-accent",
                  )}
                >
                  <span className="hidden sm:inline">{r.name} </span>
                  {fmtEUR(amount)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-good" /> Einnahme</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-warn" /> offen (noch nicht gebucht)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-border" /> gebucht</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-accent" /> Sparplan</span>
      </div>
    </Card>
  );
}

function Timeline() {
  const data = useFinance();
  const now = useNow();
  const month = toMonth(now);
  const events = data.recurring
    .flatMap((r) => [
      ...(r.startMonth > month ? [{ month: r.startMonth, r, type: "start" as const }] : []),
      ...(r.endMonth && r.endMonth >= month ? [{ month: addMonths(r.endMonth, 1), r, type: "end" as const }] : []),
    ])
    .sort((a, b) => a.month.localeCompare(b.month));
  return (
    <Card title="Zukünftige Änderungen" subtitle="Werden in Budget, Monats-Check und Prognose automatisch berücksichtigt">
      {events.length === 0 ? (
        <p className="text-sm text-muted">Keine geplanten Änderungen. Setze Start-/Endmonate bei wiederkehrenden Posten, um künftige Einnahmen/Ausgaben zu planen.</p>
      ) : (
        <ol className="relative ml-2 border-l border-border">
          {events.map((e, i) => {
            const delta = e.r.kind === "income" ? (e.type === "start" ? e.r.amount : -e.r.amount) : e.type === "start" ? -e.r.amount : e.r.amount;
            return (
              <li key={i} className="mb-4 ml-4">
                <span className="absolute -left-[7px] mt-1 grid h-3.5 w-3.5 place-items-center rounded-full border border-border bg-surface">
                  <CalendarClock size={9} className="text-muted" />
                </span>
                <div className="text-xs text-muted">ab {monthLabel(e.month, true)}</div>
                <div className="text-sm font-medium">
                  {e.r.name} {e.type === "start" ? "beginnt" : "entfällt"}
                </div>
                <div className={cx("tabular text-xs", delta >= 0 ? "text-good" : "text-critical")}>
                  {delta >= 0 ? "+" : "−"}
                  {fmtEUR(Math.abs(delta))} / Monat verfügbar
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
