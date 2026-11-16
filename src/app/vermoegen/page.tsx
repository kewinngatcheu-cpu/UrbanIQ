"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useData, useNow } from "@/components/providers";
import { Badge, Button, Card, Field, Input, MoneyInput, Note, PageTitle, Segmented, Select, Sheet } from "@/components/ui";
import { Donut, Trend } from "@/components/charts";
import { ACCOUNT_GROUP, GOAL_GROUP, WEALTH_GROUPS, accountBalance, debtBalance, goalBalance, wealth } from "@/lib/calc/finance";
import { addMonths, monthLabel, toMonth } from "@/lib/calc/months";
import { eur, parseEuro, uid } from "@/lib/format";
import { deleteAccount, deleteDebt, saveAccount, saveDebt } from "@/lib/db";
import type { Account, Debt } from "@/lib/types";

const GROUP_COLOR = (g: string) => `var(--s${WEALTH_GROUPS.indexOf(g as never) + 1})`;

export default function VermoegenPage() {
  const data = useData();
  const now = useNow();
  const w = wealth(data, now);
  const [acc, setAcc] = useState<Account | null>(null);
  const [debt, setDebt] = useState<Debt | null>(null);
  const [range, setRange] = useState<"month" | "year">("month");

  const snaps = data.snapshots;
  const yearly = Object.values(
    snaps.reduce<Record<string, (typeof snaps)[number]>>((acc2, s) => ((acc2[s.month.slice(0, 4)] = s), acc2), {}),
  );
  const first = snaps[0];
  const prev = snaps.length > 1 ? snaps[snaps.length - 2] : null;

  return (
    <>
      <PageTitle title="Vermögen" subtitle="Was du besitzt minus was du schuldest" />

      <section className="animate-rise rounded-[28px] border border-border bg-surface p-5">
        <div className="text-sm text-muted">Nettovermögen</div>
        <div className={`tabular text-[40px] font-bold leading-tight tracking-tight ${w.netWorth < 0 ? "text-bad" : ""}`}>{eur(w.netWorth)}</div>
        <div className="tabular mt-1 text-sm text-text-2">
          {eur(w.assets)} Vermögen − {eur(w.debts)} Verbindlichkeiten
        </div>
        {prev && (
          <div className={`tabular mt-2 text-xs ${w.netWorth - prev.netWorth >= 0 ? "text-good" : "text-bad"}`}>
            {w.netWorth - prev.netWorth >= 0 ? "+" : ""}
            {eur(w.netWorth - prev.netWorth)} seit {monthLabel(prev.month)}
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Zusammensetzung">
          <ul className="divide-y divide-border/70">
            {WEALTH_GROUPS.map((g) => {
              const accounts = data.accounts.filter((a) => ACCOUNT_GROUP[a.type] === g);
              const goals = data.goals.filter((x) => GOAL_GROUP[x.type] === g);
              return (
                <li key={g} className="py-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR(g) }} />
                      {g}
                    </span>
                    <span className="tabular font-semibold">{eur(w.groups[g])}</span>
                  </div>
                  <ul className="mt-1 space-y-0.5 pl-4.5 text-xs text-text-2">
                    {accounts.map((a) => (
                      <li key={a.id}>
                        <button onClick={() => setAcc(a)} className="flex w-full justify-between hover:text-accent">
                          <span className="flex items-center gap-1">
                            {a.name} <Pencil size={11} />
                          </span>
                          <span className="tabular">{eur(accountBalance(a, data.movements))}</span>
                        </button>
                      </li>
                    ))}
                    {goals.map((x) => (
                      <li key={x.id}>
                        <Link href="/sparziele" className="flex justify-between hover:text-accent">
                          <span>Sparziel: {x.name}</span>
                          <span className="tabular">{eur(goalBalance(x, data.movements))}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
            <li className="py-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Verbleibende Kreditschulden</span>
                <span className="tabular font-semibold text-bad">−{eur(w.debts)}</span>
              </div>
              <ul className="mt-1 space-y-0.5 pl-4.5 text-xs text-text-2">
                {data.debts.map((d) => (
                  <li key={d.id}>
                    <button onClick={() => setDebt(d)} className="flex w-full justify-between hover:text-accent">
                      <span className="flex items-center gap-1">
                        {d.name} {d.isEstimate && <Badge tone="warn">geschätzt</Badge>} <Pencil size={11} />
                      </span>
                      <span className="tabular">{eur(debtBalance(d, now))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setAcc({ id: uid("acc"), name: "", type: "tagesgeld", balance: 0, balanceSetAt: new Date().toISOString() })}>
              <Plus size={14} /> Konto / Wert
            </Button>
            <Button size="sm" onClick={() => setDebt({ id: uid("debt"), name: "", balance: 0, asOfMonth: toMonth(now), monthlyPayment: 0, dueDay: 1 })}>
              <Plus size={14} /> Schuld
            </Button>
          </div>
          <Note>Sparziele sind Rücklagen innerhalb deines Vermögens. Eine Einzahlung verschiebt Geld vom Girokonto in die Rücklage – das Nettovermögen bleibt dabei gleich.</Note>
        </Card>

        <Card title="Aufteilung">
          <Donut items={WEALTH_GROUPS.map((g) => ({ name: g, value: Math.max(0, w.groups[g]) }))} colorOf={GROUP_COLOR} label="Aufteilung des Vermögens" />
        </Card>
      </div>

      <Card
        className="mt-4"
        title="Entwicklung des Nettovermögens"
        subtitle={first ? `Aufgezeichnet seit ${monthLabel(first.month)} – ein Wert pro Monat, automatisch` : undefined}
        action={<Segmented className="w-44" value={range} onChange={setRange} options={[{ value: "month", label: "Monatlich" }, { value: "year", label: "Jährlich" }]} />}
      >
        {range === "month" ? (
          snaps.length ? (
            <Trend label="Nettovermögen pro Monat" data={snaps.slice(-24).map((s) => ({ month: s.month, netWorth: s.netWorth }))} series={[{ key: "netWorth", label: "Nettovermögen", color: "var(--s1)" }]} />
          ) : (
            <p className="text-sm text-muted">Noch keine Daten.</p>
          )
        ) : (
          <table className="tabular w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 font-medium">Jahr</th>
                <th className="font-medium">Nettovermögen (Jahresende bzw. aktuell)</th>
                <th className="font-medium">Veränderung</th>
              </tr>
            </thead>
            <tbody>
              {yearly.map((s, i) => {
                const d = i > 0 ? s.netWorth - yearly[i - 1].netWorth : null;
                return (
                  <tr key={s.month} className="border-t border-border/70">
                    <td className="py-2">{s.month.slice(0, 4)}</td>
                    <td>{eur(s.netWorth)}</td>
                    <td className={d === null ? "text-muted" : d >= 0 ? "text-good" : "text-bad"}>{d === null ? "–" : `${d >= 0 ? "+" : ""}${eur(d)}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Note>Jeden Monat wird beim Öffnen der App automatisch ein Stand gespeichert. Es werden keine früheren Werte erfunden – der Verlauf beginnt mit deinem ersten Monat.</Note>
      </Card>

      {acc && <AccountSheet key={acc.id} account={acc} onClose={() => setAcc(null)} />}
      {debt && <DebtSheet key={debt.id} debt={debt} onClose={() => setDebt(null)} />}
    </>
  );
}

function AccountSheet({ account, onClose }: { account: Account; onClose: () => void }) {
  const data = useData();
  const exists = data.accounts.some((a) => a.id === account.id);
  const current = accountBalance(account, data.movements);
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<Account["type"]>(account.type);
  const [balance, setBalance] = useState(exists ? String(current).replace(".", ",") : "");
  return (
    <Sheet
      title={exists ? `${account.name} aktualisieren` : "Konto / Vermögenswert hinzufügen"}
      onClose={onClose}
      footer={
        <>
          {exists && !account.isMainBank && (
            <Button variant="danger" size="lg" aria-label="Löschen" onClick={() => confirm("Löschen?") && deleteAccount(account.id).then(onClose)}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={!name.trim() || parseEuro(balance) === null}
            onClick={() => saveAccount({ ...account, name: name.trim(), type, balance: parseEuro(balance)!, balanceSetAt: new Date().toISOString() }).then(onClose)}
          >
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Aktueller Stand" hint={account.isMainBank ? "Trage den Kontostand aus deiner Banking-App ein. Spätere Sparbuchungen werden automatisch verrechnet." : undefined}>
          <MoneyInput large value={balance} onChange={setBalance} autoFocus aria-label="Aktueller Stand" />
        </Field>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Tagesgeld" />
        </Field>
        {!account.isMainBank && (
          <Field label="Art">
            <Select value={type} onChange={(e) => setType(e.target.value as Account["type"])}>
              <option value="tagesgeld">Tagesgeld</option>
              <option value="investment">Sonstige Investments</option>
              <option value="other">Sonstige Ersparnisse</option>
              <option value="bank">Bankguthaben</option>
            </Select>
          </Field>
        )}
      </div>
    </Sheet>
  );
}

function DebtSheet({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const data = useData();
  const now = useNow();
  const exists = data.debts.some((d) => d.id === debt.id);
  const [name, setName] = useState(debt.name);
  const [balance, setBalance] = useState(exists ? String(debtBalance(debt, now)).replace(".", ",") : "");
  const [rate, setRate] = useState(debt.monthlyPayment ? String(debt.monthlyPayment).replace(".", ",") : "");
  const [end, setEnd] = useState(debt.endMonth ?? "");
  const month = toMonth(now);
  return (
    <Sheet
      title={exists ? "Schuld aktualisieren" : "Schuld hinzufügen"}
      onClose={onClose}
      footer={
        <>
          {exists && (
            <Button variant="danger" size="lg" aria-label="Löschen" onClick={() => confirm("Löschen?") && deleteDebt(debt.id).then(onClose)}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={!name.trim() || parseEuro(balance) === null}
            onClick={() =>
              saveDebt({ ...debt, name: name.trim(), balance: parseEuro(balance)!, asOfMonth: now.getDate() >= debt.dueDay ? month : addMonths(month, -1), monthlyPayment: parseEuro(rate) ?? 0, endMonth: end || undefined, isEstimate: false }).then(onClose)
            }
          >
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Aktuelle Restschuld" hint={debt.isEstimate ? "Bisher geschätzt (Restraten × Rate, ohne Zinsen). Trage den genauen Wert aus deinem Kreditvertrag ein." : "Stand heute laut Kreditvertrag / Online-Banking"}>
          <MoneyInput large value={balance} onChange={setBalance} autoFocus aria-label="Restschuld" />
        </Field>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monatliche Rate">
            <MoneyInput value={rate} onChange={setRate} aria-label="Monatliche Rate" />
          </Field>
          <Field label="Letzte Rate (Monat)">
            <Input type="month" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Note>Die Restschuld sinkt automatisch jeden Monat um die Rate. Die Rate selbst steht als Fixkosten in den Einstellungen.</Note>
      </div>
    </Sheet>
  );
}

