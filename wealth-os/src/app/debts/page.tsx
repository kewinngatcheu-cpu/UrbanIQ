"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useFinance, useNow } from "@/components/providers";
import { Alert, Assumption, Badge, Button, Card, EmptyState, Field, Input, Modal, NumberInput, PageHeader, Stat, Table } from "@/components/ui";
import { Lines } from "@/components/charts";
import { amortizationSchedule, payoffMonths } from "@/lib/finance/loan";
import { addMonths, monthLabel, toMonth } from "@/lib/finance/months";
import { fmtEUR, fmtEUR2, fmtPct, uid } from "@/lib/format";
import { remove, upsert } from "@/lib/db";
import type { Debt } from "@/lib/types";

export default function DebtsPage() {
  const data = useFinance();
  const now = useNow();
  const month = toMonth(now);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [selected, setSelected] = useState(data.debts[0]?.id ?? "");
  const total = data.debts.reduce((s, d) => s + d.balance, 0);
  const monthly = data.debts.reduce((s, d) => s + (d.balance > 0 ? d.monthlyPayment : 0), 0);
  const debt = data.debts.find((d) => d.id === selected) ?? data.debts[0];
  const schedule = debt ? amortizationSchedule(debt.balance, debt.interestRate, debt.monthlyPayment, 600) : [];
  const freeFrom = data.debts.map((d) => (d.balance > 0 ? payoffMonths(d.balance, d.interestRate, d.monthlyPayment) : 0)).reduce<number | null>((m, x) => (x === null || m === null ? null : Math.max(m, x)), 0);

  return (
    <>
      <PageHeader
        title="Schuldenmanagement"
        description="Restschuld, Tilgungsplan und Schuldenfreiheit. Kreditraten in „Fixkosten & Abos“ mit Endmonat sorgen dafür, dass Budget und Prognose die Rate automatisch nicht mehr einplanen."
        actions={<Button variant="primary" onClick={() => setEditing({ id: uid("debt"), name: "", balance: 0, interestRate: 0, monthlyPayment: 0 })}><Plus size={15} /> Schuld</Button>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Restschuld gesamt" value={fmtEUR(total)} tone={total > 0 ? "warn" : "good"} />
        <Stat label="Monatliche Raten" value={fmtEUR(monthly)} />
        <Stat label="Schuldenfrei ab" value={freeFrom === null ? "nie (Rate zu niedrig)" : freeFrom === 0 ? "jetzt" : monthLabel(addMonths(month, freeFrom), true)} tone={freeFrom === null ? "critical" : "good"} />
        <Stat label="Danach frei / Monat" value={`+${fmtEUR(monthly)}`} sub="für Eigenkapital & Investments" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Verbindlichkeiten">
          {data.debts.length === 0 ? (
            <EmptyState title="Keine Schulden erfasst" />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.debts.map((d) => {
                const months = payoffMonths(d.balance, d.interestRate, d.monthlyPayment);
                return (
                  <li key={d.id} className="py-2.5">
                    <button className="w-full text-left" onClick={() => setSelected(d.id)}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {d.name} {d.balanceIsEstimate && <Badge tone="warn">geschätzt</Badge>} {selected === d.id && <Badge tone="accent">ausgewählt</Badge>}
                        </span>
                        <span className="tabular text-sm font-semibold">{fmtEUR(d.balance)}</span>
                      </div>
                      <div className="text-xs text-muted">
                        {fmtEUR(d.monthlyPayment)}/Monat · {fmtPct(d.interestRate, 2)} · {months === null ? "Rate deckt Zinsen nicht!" : months === 0 ? "getilgt" : `noch ${months} Raten`}
                        {d.endMonth && ` · Vertragsende ${monthLabel(d.endMonth)}`}
                      </div>
                    </button>
                    <Button size="sm" variant="ghost" className="mt-1" onClick={() => setEditing(d)}>Bearbeiten</Button>
                  </li>
                );
              })}
            </ul>
          )}
          {data.debts.some((d) => d.balanceIsEstimate) && <Assumption>Geschätzt = Restraten × Rate ohne Zinsen. Trage die exakte Restschuld aus deinem Kreditvertrag/Online-Banking ein.</Assumption>}
        </Card>

        <Card className="lg:col-span-2" title={debt ? `Tilgungsplan: ${debt.name}` : "Tilgungsplan"}>
          {!debt || schedule.length === 0 ? (
            <p className="text-sm text-muted">Keine offene Restschuld.</p>
          ) : (
            <>
              <Lines label="Restschuldverlauf" data={schedule.map((r) => ({ month: addMonths(month, r.index), balance: r.balance }))} height={200} series={[{ key: "balance", label: "Restschuld", color: "var(--s1)" }]} />
              <Table className="mt-3" head={["Monat", "Rate", "Zins", "Tilgung", "Restschuld"]}>
                {schedule.slice(0, 24).map((r) => (
                  <tr key={r.index}>
                    <td>{monthLabel(addMonths(month, r.index))}</td>
                    <td>{fmtEUR2(r.payment)}</td>
                    <td>{fmtEUR2(r.interest)}</td>
                    <td>{fmtEUR2(r.principal)}</td>
                    <td>{fmtEUR2(r.balance)}</td>
                  </tr>
                ))}
              </Table>
              {debt.endMonth && schedule.length > 0 && addMonths(month, schedule.length) !== debt.endMonth && (
                <div className="mt-3">
                  <Alert tone="warn" title="Restschuld und Vertragsende passen nicht zusammen">
                    Laut Tilgungsplan letzte Rate {monthLabel(addMonths(month, schedule.length), true)}, laut Vertrag {monthLabel(debt.endMonth, true)}. Bitte Restschuld/Zins prüfen.
                  </Alert>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
      {editing && <DebtModal key={editing.id} debt={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function DebtModal({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const data = useFinance();
  const [d, setD] = useState(debt);
  const exists = data.debts.some((x) => x.id === debt.id);
  return (
    <Modal
      open
      onClose={onClose}
      title={exists ? "Schuld bearbeiten" : "Neue Schuld"}
      footer={
        <>
          {exists && <Button variant="danger" onClick={() => remove("debts", d.id).then(onClose)}><Trash2 size={14} /> Löschen</Button>}
          <Button variant="primary" disabled={!d.name.trim()} onClick={() => upsert("debts", { ...d, endMonth: d.endMonth || undefined }).then(onClose)}>Speichern</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
        <Field label="Restschuld"><NumberInput value={d.balance} min={0} suffix="€" onChange={(balance) => setD({ ...d, balance, balanceIsEstimate: false })} /></Field>
        <Field label="Zinssatz p. a."><NumberInput value={d.interestRate} min={0} step={0.1} suffix="%" onChange={(interestRate) => setD({ ...d, interestRate })} /></Field>
        <Field label="Monatliche Rate"><NumberInput value={d.monthlyPayment} min={0} suffix="€" onChange={(monthlyPayment) => setD({ ...d, monthlyPayment })} /></Field>
        <Field label="Letzte Rate (Monat)"><Input type="month" value={d.endMonth ?? ""} onChange={(e) => setD({ ...d, endMonth: e.target.value || undefined })} /></Field>
        <Field label="Kreditgeber (optional)" className="sm:col-span-2"><Input value={d.lender ?? ""} onChange={(e) => setD({ ...d, lender: e.target.value || undefined })} /></Field>
      </div>
    </Modal>
  );
}
