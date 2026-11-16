"use client";
import { useMemo, useState } from "react";
import { CheckCircle2, FileDown, Lock, Receipt } from "lucide-react";
import { useFinance, useNow } from "@/components/providers";
import { Alert, Badge, Button, Card, Missing, NumberInput, PageHeader, Progress, Stat, Table } from "@/components/ui";
import { MonthPicker } from "@/components/month-picker";
import { LocalMonthReport } from "@/components/report";
import { buildMonthReport, nextMonthTasks, openBills } from "@/lib/finance/analyst";
import { actualsForMonth, planForMonth } from "@/lib/finance/plan";
import { accountValue, makeSnapshots } from "@/lib/finance/wealth";
import { goalProgress } from "@/lib/finance/goals";
import { daysInMonth, monthLabel, toMonth } from "@/lib/finance/months";
import { db } from "@/lib/db";
import { exportMonthPdf } from "@/lib/export";
import { fmtEUR, fmtPct } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export default function MonthlyCheckPage() {
  const data = useFinance();
  const now = useNow();
  const [month, setMonth] = useState(toMonth(now));
  const [msg, setMsg] = useState<string | null>(null);
  const plan = planForMonth(data, month);
  const act = actualsForMonth(data.transactions, month);
  const bills = useMemo(() => openBills(data, month), [data, month]);
  const closing = data.closings.find((c) => c.id === month);
  const [balances, setBalances] = useState<Record<string, number>>({});

  async function postBill(id: string) {
    const r = data.recurring.find((x) => x.id === id)!;
    const day = Math.min(r.dayOfMonth, daysInMonth(month));
    const tx: Transaction = { id: `tx_rec_${r.id}_${month}`, date: `${month}-${String(day).padStart(2, "0")}`, amount: bills.find((b) => b.id === id)!.amount, type: "expense", category: r.category, description: r.name, recurringId: r.id, source: "recurring" };
    await db().transactions.put(tx);
  }
  async function postAll() {
    for (const b of bills) await postBill(b.id);
    setMsg(`${bills.length} wiederkehrende Zahlungen gebucht.`);
  }
  async function updateBalances() {
    await db().transaction("rw", db().accounts, async () => {
      for (const [id, balance] of Object.entries(balances)) {
        const a = data.accounts.find((x) => x.id === id);
        if (a) await db().accounts.put({ ...a, balance });
      }
    });
    setBalances({});
    setMsg("Kontostände aktualisiert.");
  }
  async function closeMonth() {
    const fresh = await import("@/lib/db").then((m) => m.loadAll());
    if (!fresh) return;
    await db().transaction("rw", [db().snapshots, db().closings], async () => {
      await db().snapshots.bulkPut(makeSnapshots(fresh, month));
      await db().closings.put({ id: month, closedAt: new Date().toISOString(), summary: buildMonthReport(fresh, month) });
    });
    setMsg(`Monat ${monthLabel(month, true)} abgeschlossen: Snapshot & Abschlussbericht gespeichert.`);
  }

  return (
    <>
      <PageHeader
        title="Monatlicher Finanz-Check"
        description="Plan vs. Ist, offene Rechnungen, Kontostände und Ziele – am Monatsende mit Abschlussbericht."
        actions={<MonthPicker value={month} onChange={setMonth} />}
      />
      {msg && <div className="mb-4"><Alert tone="good" title={msg} /></div>}
      {closing && (
        <div className="mb-4">
          <Alert tone="good" title={`Abgeschlossen am ${new Date(closing.closedAt).toLocaleDateString("de-DE")}`}>Du kannst den Monat erneut abschließen, um Snapshot und Bericht zu aktualisieren.</Alert>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Geplantes Budget" value={fmtEUR(plan.plannedSpending)} sub={`Fix ${fmtEUR(plan.fixedCosts)} + variabel ${fmtEUR(plan.variableBudget)}`} />
        <Stat label="Tatsächliche Ausgaben" value={act.hasData ? fmtEUR(act.spending) : <Missing>keine Buchungen</Missing>} tone={act.hasData && act.spending > plan.plannedSpending ? "critical" : "good"} sub={act.hasData ? `${act.spending <= plan.plannedSpending ? "−" : "+"}${fmtEUR(Math.abs(plan.plannedSpending - act.spending))} ggü. Plan` : undefined} />
        <Stat label="Geplante Sparrate" value={fmtEUR(plan.plannedSavings)} sub={fmtPct(plan.savingsRate * 100)} />
        <Stat label="Tatsächliche Sparrate" value={act.hasData ? fmtEUR(act.netSavings) : <Missing>n. v.</Missing>} sub={act.savingsRate !== null ? fmtPct(act.savingsRate * 100) : undefined} tone={act.savingsRate !== null && act.savingsRate < plan.savingsRate ? "warn" : "good"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Offene Rechnungen"
          subtitle="Fällige wiederkehrende Zahlungen ohne Buchung"
          action={bills.length > 0 && <Button size="sm" onClick={postAll}><Receipt size={14} /> Alle buchen</Button>}
        >
          {bills.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-good"><CheckCircle2 size={16} /> Alle fälligen Zahlungen sind gebucht.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {bills.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-muted">fällig am {b.dueDay}. · {b.category}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular">{fmtEUR(b.amount)}</span>
                    <Button size="sm" variant="ghost" onClick={() => postBill(b.id)}>buchen</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Kontostände" subtitle="Aktualisiere die Stände zum Monatsende" action={Object.keys(balances).length > 0 && <Button size="sm" variant="primary" onClick={updateBalances}>Speichern</Button>}>
          <Table head={["Konto", "Kontostand / Cash", "Gesamtwert"]}>
            {data.accounts.map((a) => (
              <tr key={a.id}>
                <td className="font-medium">{a.name}</td>
                <td className="w-40">
                  <NumberInput value={balances[a.id] ?? a.balance} suffix="€" onChange={(v) => setBalances({ ...balances, [a.id]: v })} aria-label={`Kontostand ${a.name}`} />
                </td>
                <td>{fmtEUR(accountValue({ ...a, balance: balances[a.id] ?? a.balance }, data.holdings))}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Fortschritt deiner Ziele">
          <ul className="space-y-3">
            {data.goals.map((g) => {
              const p = goalProgress(g, data, now);
              return (
                <li key={g.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="tabular text-text-2">{fmtEUR(p.current)} / {fmtEUR(g.targetAmount)}</span>
                  </div>
                  <Progress value={p.progressPct} tone={p.progressPct >= 100 ? "good" : "accent"} label={g.name} />
                  {p.requiredMonthly !== null && <div className="mt-1 text-xs text-muted">{fmtEUR(p.requiredMonthly)}/Monat bis {monthLabel(toMonth(g.targetDate!), true)}</div>}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card
          title="Monatsabschluss"
          subtitle="Speichert Vermögens-Snapshot + Abschlussbericht"
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => exportMonthPdf(data, buildMonthReport(data, month), nextMonthTasks(data, now), data.aiReports.find((r) => r.month === month)?.content)}>
                <FileDown size={14} /> PDF
              </Button>
              <Button size="sm" variant="primary" onClick={closeMonth}>
                <Lock size={14} /> Abschließen
              </Button>
            </div>
          }
        >
          <ol className="space-y-2 text-sm">
            {[
              { ok: bills.length === 0, t: "Fixkosten gebucht" },
              { ok: act.hasData, t: "Transaktionen erfasst / importiert" },
              { ok: Object.keys(balances).length === 0 && data.accounts.length > 0, t: "Kontostände aktuell" },
              { ok: data.holdings.every((h) => h.priceDate?.startsWith(month)), t: "Kurse der Positionen aktualisiert" },
              { ok: !!closing, t: "Monat abgeschlossen" },
            ].map((s) => (
              <li key={s.t} className="flex items-center gap-2">
                {s.ok ? <CheckCircle2 size={16} className="text-good" /> : <span className="h-4 w-4 rounded-full border border-border" />}
                <span className={s.ok ? "text-text-2" : ""}>{s.t}</span>
                {!s.ok && <Badge tone="warn">offen</Badge>}
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card className="mt-4" title={`Abschlussbericht ${monthLabel(month, true)}`}>
        <LocalMonthReport month={month} />
      </Card>
    </>
  );
}
