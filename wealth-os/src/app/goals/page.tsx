"use client";
import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useFinance, useNow } from "@/components/providers";
import { Assumption, Badge, Button, Card, Field, Input, Modal, NumberInput, PageHeader, Progress, Select, Table } from "@/components/ui";
import { goalProgress } from "@/lib/finance/goals";
import { emergencyFund, wealthSummary } from "@/lib/finance/wealth";
import { planForMonth } from "@/lib/finance/plan";
import { monthLabel, toMonth } from "@/lib/finance/months";
import { fmtEUR, fmtPct, uid } from "@/lib/format";
import { remove, upsert, updateSettings } from "@/lib/db";
import type { Goal, GoalType } from "@/lib/types";

const TYPE_LABEL: Record<GoalType, string> = { property: "Immobilie", emergency: "Notgroschen", travel: "Reisen", investment: "Investment", custom: "Eigenes Ziel" };

export default function GoalsPage() {
  const data = useFinance();
  const now = useNow();
  const [editing, setEditing] = useState<Goal | null>(null);
  return (
    <>
      <PageHeader
        title="Ziele & Rechner"
        description="Finanzielle Ziele verwalten, Notgroschen und Nettovermögen berechnen."
        actions={<Button variant="primary" onClick={() => setEditing({ id: uid("goal"), name: "", type: "custom", targetAmount: 0, linkedAccountIds: [], priority: 2 })}><Plus size={15} /> Ziel</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...data.goals].sort((a, b) => a.priority - b.priority).map((g) => {
          const p = goalProgress(g, data, now);
          return (
            <Card key={g.id} title={g.name} subtitle={`${TYPE_LABEL[g.type]} · Priorität ${g.priority}`} action={<Button size="sm" variant="ghost" onClick={() => setEditing(g)}>Bearbeiten</Button>}>
              <div className="tabular mb-1 flex items-baseline justify-between">
                <span className="text-xl font-semibold">{fmtEUR(p.current)}</span>
                <span className="text-sm text-muted">von {fmtEUR(g.targetAmount)}</span>
              </div>
              <Progress value={p.progressPct} tone={p.progressPct >= 100 ? "good" : "accent"} label={g.name} />
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-surface-2 p-2"><div className="text-muted">Fehlt noch</div><div className="tabular font-semibold">{fmtEUR(p.remaining)}</div></div>
                <div className="rounded-lg bg-surface-2 p-2">
                  <div className="text-muted">{g.targetDate ? `Bis ${monthLabel(toMonth(g.targetDate))}` : "Kein Zieldatum"}</div>
                  <div className="tabular font-semibold">{p.requiredMonthly !== null ? `${fmtEUR(p.requiredMonthly)}/Monat` : "–"}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted">{g.linkedAccountIds.length ? `Stand aus: ${data.accounts.filter((a) => g.linkedAccountIds.includes(a.id)).map((a) => a.name).join(", ")}` : "Stand manuell gepflegt"}</div>
            </Card>
          );
        })}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <EmergencyCalculator />
        <NetWorthCalculator />
      </div>
      {editing && <GoalModal key={editing.id} goal={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function EmergencyCalculator() {
  const data = useFinance();
  const now = useNow();
  const plan = planForMonth(data, toMonth(now));
  const defaultEssentials = Math.round(plan.fixedCosts + plan.variableByCategory.Lebensmittel + plan.variableByCategory.Transport);
  const [essentials, setEssentials] = useState(defaultEssentials);
  const months = data.settings.emergencyFundMonths;
  const efAccounts = data.accounts.filter((a) => a.type === "emergency" || a.type === "savings");
  const current = efAccounts.reduce((s, a) => s + a.balance, 0);
  const ef = emergencyFund(essentials, months, current);
  return (
    <Card title="Notgroschen-Rechner" subtitle="Wie viele Monate kannst du ohne Einkommen überbrücken?">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Essenzielle Kosten / Monat" hint="Vorschlag: Fixkosten + Lebensmittel + Transport">
          <NumberInput value={essentials} suffix="€" onChange={setEssentials} />
        </Field>
        <Field label={`Zielgröße: ${months} Monate`}>
          <input type="range" min={1} max={12} value={months} onChange={(e) => updateSettings({ emergencyFundMonths: Number(e.target.value) })} className="mt-3 w-full accent-[var(--accent)]" aria-label="Monate" />
        </Field>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-surface-2 p-3"><div className="text-xs text-muted">Ziel</div><div className="tabular font-semibold">{fmtEUR(ef.target)}</div></div>
        <div className="rounded-xl bg-surface-2 p-3"><div className="text-xs text-muted">Aktuell</div><div className="tabular font-semibold">{fmtEUR(ef.current)}</div></div>
        <div className="rounded-xl bg-surface-2 p-3"><div className="text-xs text-muted">Reichweite</div><div className="tabular font-semibold">{ef.coverageMonths.toFixed(1)} Monate</div></div>
      </div>
      <div className="mt-3"><Progress value={ef.progressPct} tone={ef.progressPct >= 100 ? "good" : "warn"} label="Notgroschen" /></div>
      <Assumption>Gezählt werden Konten vom Typ Notgroschen/Tagesgeld: {efAccounts.map((a) => a.name).join(", ") || "keine"}. Da du bei deinen Eltern wohnst, sind 3 Monate ein sinnvoller Start; mit eigener Wohnung eher 3–6 Monatsausgaben inkl. Miete.</Assumption>
    </Card>
  );
}

function NetWorthCalculator() {
  const data = useFinance();
  const s = wealthSummary(data);
  const [extra, setExtra] = useState<{ id: string; name: string; value: number; kind: "asset" | "liability" }[]>([]);
  const extraAssets = extra.filter((e) => e.kind === "asset").reduce((t, e) => t + e.value, 0);
  const extraLiab = extra.filter((e) => e.kind === "liability").reduce((t, e) => t + e.value, 0);
  const net = s.totalAssets + extraAssets - s.debts - extraLiab;
  return (
    <Card title="Nettovermögens-Rechner" subtitle="Gespeicherte Werte + hypothetische Posten (z. B. Auto, BAföG-Rückzahlung)">
      <Table compact head={["Posten", "Betrag"]}>
        <tr><td>Liquide Mittel</td><td>{fmtEUR(s.liquid)}</td></tr>
        <tr><td>Immobilien-Eigenkapital</td><td>{fmtEUR(s.property)}</td></tr>
        <tr><td>Investments</td><td>{fmtEUR(s.invested)}</td></tr>
        <tr><td>Sonstige Investments</td><td>{fmtEUR(s.other)}</td></tr>
        <tr><td>Schulden</td><td className="text-critical">−{fmtEUR(s.debts)}</td></tr>
        {extra.map((e) => (
          <tr key={e.id}>
            <td>
              <div className="flex items-center gap-2">
                <Input value={e.name} onChange={(ev) => setExtra(extra.map((x) => (x.id === e.id ? { ...x, name: ev.target.value } : x)))} aria-label="Bezeichnung" />
                <Badge tone={e.kind === "asset" ? "good" : "critical"}>{e.kind === "asset" ? "Vermögen" : "Schuld"}</Badge>
              </div>
            </td>
            <td>
              <div className="flex items-center gap-1">
                <NumberInput value={e.value} suffix="€" onChange={(value) => setExtra(extra.map((x) => (x.id === e.id ? { ...x, value } : x)))} aria-label="Betrag" />
                <button onClick={() => setExtra(extra.filter((x) => x.id !== e.id))} aria-label="Entfernen" className="p-1 text-muted hover:text-critical"><X size={14} /></button>
              </div>
            </td>
          </tr>
        ))}
        <tr className="text-base font-semibold"><td>Nettovermögen</td><td className={net >= 0 ? "text-good" : "text-critical"}>{fmtEUR(net)}</td></tr>
      </Table>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => setExtra([...extra, { id: uid(), name: "Weiteres Vermögen", value: 0, kind: "asset" }])}><Plus size={13} /> Vermögen</Button>
        <Button size="sm" onClick={() => setExtra([...extra, { id: uid(), name: "Weitere Schuld", value: 0, kind: "liability" }])}><Plus size={13} /> Schuld</Button>
      </div>
      <Assumption>Hypothetische Posten werden nicht gespeichert. Dauerhafte Werte legst du als Konto oder Schuld an. Verschuldungsquote: {s.totalAssets > 0 ? fmtPct((s.debts / s.totalAssets) * 100) : "–"}.</Assumption>
    </Card>
  );
}

function GoalModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const data = useFinance();
  const [g, setG] = useState(goal);
  const exists = data.goals.some((x) => x.id === goal.id);
  return (
    <Modal
      open
      onClose={onClose}
      title={exists ? "Ziel bearbeiten" : "Neues Ziel"}
      footer={
        <>
          {exists && <Button variant="danger" onClick={() => remove("goals", g.id).then(onClose)}><Trash2 size={14} /> Löschen</Button>}
          <Button variant="primary" disabled={!g.name.trim() || g.targetAmount <= 0} onClick={() => upsert("goals", { ...g, targetDate: g.targetDate || undefined }).then(onClose)}>Speichern</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><Input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} /></Field>
        <Field label="Typ">
          <Select value={g.type} onChange={(e) => setG({ ...g, type: e.target.value as GoalType })}>
            {Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Priorität">
          <Select value={g.priority} onChange={(e) => setG({ ...g, priority: Number(e.target.value) as Goal["priority"] })}>
            <option value={1}>1 – hoch</option><option value={2}>2 – mittel</option><option value={3}>3 – niedrig</option>
          </Select>
        </Field>
        <Field label="Zielbetrag"><NumberInput value={g.targetAmount} min={0} suffix="€" onChange={(targetAmount) => setG({ ...g, targetAmount })} /></Field>
        <Field label="Zieldatum (optional)"><Input type="date" value={g.targetDate ?? ""} onChange={(e) => setG({ ...g, targetDate: e.target.value || undefined })} /></Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-xs font-medium text-text-2">Verknüpfte Konten (Stand = Summe)</legend>
          <div className="flex flex-wrap gap-2">
            {data.accounts.map((a) => (
              <label key={a.id} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
                <input type="checkbox" checked={g.linkedAccountIds.includes(a.id)} onChange={(e) => setG({ ...g, linkedAccountIds: e.target.checked ? [...g.linkedAccountIds, a.id] : g.linkedAccountIds.filter((x) => x !== a.id) })} />
                {a.name}
              </label>
            ))}
          </div>
        </fieldset>
        {g.linkedAccountIds.length === 0 && (
          <Field label="Aktueller Stand (manuell)" className="sm:col-span-2"><NumberInput value={g.manualCurrent ?? 0} min={0} suffix="€" onChange={(manualCurrent) => setG({ ...g, manualCurrent })} /></Field>
        )}
      </div>
    </Modal>
  );
}
