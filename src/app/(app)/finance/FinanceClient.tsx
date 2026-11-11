"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Calculator, FileUp, Plus, Trash2, Wallet } from "lucide-react";
import { apiFetch, fmtDate } from "@/lib/client/api";
import { berlinDay, fmtEUR } from "@/lib/time";

type Cat = Record<string, { label: string; kind: string }>;
type Summary = { month: string; income: number; fixed: number; variable: number; savings: number; investment: number; net: number; cashflow: number; savingsRate: number | null; byCategory: Record<string, number> };
type Overview = {
  hasData: boolean; month: string; current: Summary; baseline: { months: number; income: number; fixed: number; variable: number; savings: number; investment: number };
  budgets: Record<string, number>; budgetStatus: { category: string; budget: number; spent: number; ratio: number; state: string }[];
  spendable: null | { expectedIncome: number; fixedCosts: number; plannedSaving: number; variableSpent: number; available: number; perDay: number; daysLeft: number; explanation: string[] };
  history: Summary[]; balances: { liquid: number | null; saved: number | null; asOf: string | null };
};
type Tx = { id: string; day: string; amount_cents: number; kind: string; category: string; description: string; source: string };
type Data = { overview: Overview; transactions: Tx[]; categories: Cat };

const KIND_LABEL: Record<string, string> = { income: "Einnahme", fixed: "Fixkosten", variable: "Variabel", savings: "Sparen", investment: "Investment" };

export function FinanceClient() {
  const [d, setD] = useState<Data | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => apiFetch<Data>(`/api/finance${month ? `?month=${month}` : ""}`).then(setD).catch((e) => setErr(e.message)), [month]);
  useEffect(() => { load(); }, [load]);
  if (err) return <p className="text-err">{err}</p>;
  if (!d) return <p className="text-muted">Lade…</p>;
  const o = d.overview;
  return (
    <div className="space-y-6">
      {o.spendable ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Noch verfügbar (Monat)" value={fmtEUR(o.spendable.available)} warn={o.spendable.available < 0} sub={`${fmtEUR(o.spendable.perDay)} pro Tag · ${o.spendable.daysLeft} Tage`} />
          <Kpi label="Cashflow (gebucht)" value={fmtEUR(o.current.cashflow)} warn={o.current.cashflow < 0} sub={`Einnahmen ${fmtEUR(o.current.income)}`} />
          <Kpi label="Fixkosten" value={fmtEUR(o.spendable.fixedCosts)} sub={`variabel bisher ${fmtEUR(o.current.variable)}`} />
          <Kpi label="Sparquote" value={o.current.savingsRate == null ? "–" : `${Math.round(o.current.savingsRate * 100)} %`} sub={`reserviert ${fmtEUR(o.spendable.plannedSaving)}`} />
        </div>
      ) : (
        <div className="card p-5 text-sm text-muted">Noch keine Buchungen. Erfasse Einnahmen/Ausgaben unten oder importiere einen CSV-Export deiner Bank – dann beantwortet JARVIS „Wie viel kann ich diesen Monat ausgeben?“.</div>
      )}
      {o.spendable && o.spendable.explanation.length > 0 && (
        <div className="text-xs text-muted">Berechnung: Einnahmen {fmtEUR(o.spendable.expectedIncome)} − Fixkosten {fmtEUR(o.spendable.fixedCosts)} − Sparen {fmtEUR(o.spendable.plannedSaving)} − variabel {fmtEUR(o.spendable.variableSpent)}. {o.spendable.explanation.join(" ")}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Budgets o={o} cats={d.categories} onChange={load} />
        <History o={o} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <AddTx cats={d.categories} onChange={load} />
        <CsvImport onChange={load} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Balances o={o} onChange={load} />
        <Scenario />
      </div>
      <Transactions txs={d.transactions} cats={d.categories} month={month ?? o.month} setMonth={setMonth} onChange={load} />
    </div>
  );
}

function Kpi({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return <div className="card p-4"><div className="label">{label}</div><div className={`mt-1 text-2xl font-semibold tabular-nums ${warn ? "text-err" : ""}`}>{value}</div>{sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}</div>;
}

function Budgets({ o, cats, onChange }: { o: Overview; cats: Cat; onChange: () => void }) {
  const [edit, setEdit] = useState<Record<string, string>>({});
  const expenseCats = Object.entries(cats).filter(([, c]) => c.kind !== "income");
  async function save(category: string) {
    await apiFetch("/api/finance/budgets", { method: "PUT", body: { category, euros: Number((edit[category] ?? "0").replace(",", ".")) || 0 } });
    setEdit((e) => { const n = { ...e }; delete n[category]; return n; });
    onChange();
  }
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2"><Wallet size={18} className="text-cyan" /><h2 className="font-medium">Budgets · {o.month}</h2></div>
      <div className="space-y-2">
        {expenseCats.map(([k, c]) => {
          const budget = o.budgets[k] ?? 0;
          const spent = k === "sparen" ? o.current.savings : k === "investments" ? o.current.investment : o.current.byCategory[k] ?? 0;
          const st = o.budgetStatus.find((b) => b.category === k);
          const ratio = budget ? spent / budget : 0;
          const color = st?.state === "over" ? "#EF4444" : st?.state === "warning" ? "#F59E0B" : "#37CFFF";
          return (
            <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[140px_1fr_auto]">
              <span className="truncate">{c.label}</span>
              <div className="order-3 col-span-2 h-1.5 overflow-hidden rounded-full bg-ink-900 sm:order-none sm:col-span-1">
                {budget > 0 && <div className="h-full rounded-full" style={{ width: `${Math.min(100, ratio * 100)}%`, background: color }} />}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="tabular-nums text-muted">{fmtEUR(spent)} /</span>
                <input className="input !w-20 !px-2 !py-0.5 text-right text-xs" inputMode="decimal" aria-label={`Budget ${c.label}`}
                  value={edit[k] ?? (budget ? String(budget / 100) : "")} placeholder="–"
                  onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} onBlur={() => edit[k] !== undefined && save(k)}
                  onKeyDown={(e) => e.key === "Enter" && save(k)} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted">Warnung ab 80 % oder wenn die Ausgaben dem Monatsfortschritt deutlich vorauslaufen. Sparen/Investments-Budgets werden in „Noch verfügbar“ reserviert.</p>
    </section>
  );
}

function History({ o }: { o: Overview }) {
  const max = Math.max(1, ...o.history.map((h) => Math.max(h.income, h.fixed + h.variable + h.savings + h.investment)));
  return (
    <section className="card p-5">
      <h2 className="mb-1 font-medium">Verlauf · 6 Monate</h2>
      <div className="mb-3 flex gap-3 text-[11px] text-muted"><span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-ok" />Einnahmen</span><span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-electric" />Fix</span><span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-cyan" />Variabel</span><span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-muted" />Sparen/Invest</span></div>
      <div className="flex h-44 items-end gap-3">
        {o.history.map((h) => (
          <div key={h.month} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex h-full items-end gap-1">
              <div className="flex-1 rounded-t bg-ok/80" style={{ height: `${(h.income / max) * 100}%` }} title={`Einnahmen ${fmtEUR(h.income)}`} />
              <div className="flex flex-1 flex-col justify-end" style={{ height: "100%" }}>
                <div className="bg-muted/60" style={{ height: `${((h.savings + h.investment) / max) * 100}%` }} title={`Sparen ${fmtEUR(h.savings + h.investment)}`} />
                <div className="bg-cyan/80" style={{ height: `${(h.variable / max) * 100}%` }} title={`Variabel ${fmtEUR(h.variable)}`} />
                <div className="rounded-b bg-electric/80" style={{ height: `${(h.fixed / max) * 100}%` }} title={`Fix ${fmtEUR(h.fixed)}`} />
              </div>
            </div>
            <div className="mt-1 text-center text-[10px] text-muted">{h.month.slice(5)}/{h.month.slice(2, 4)}</div>
          </div>
        ))}
      </div>
      {o.baseline.months > 0 && <p className="mt-3 text-xs text-muted">Ø der letzten {o.baseline.months} Monate mit Daten: Einnahmen {fmtEUR(o.baseline.income)}, Ausgaben {fmtEUR(o.baseline.fixed + o.baseline.variable)}, Sparen {fmtEUR(o.baseline.savings + o.baseline.investment)}.</p>}
    </section>
  );
}

function AddTx({ cats, onChange }: { cats: Cat; onChange: () => void }) {
  const [f, setF] = useState({ day: berlinDay(), amount: "", category: "lebensmittel", description: "" });
  const [msg, setMsg] = useState<string | null>(null);
  async function save() {
    try {
      await apiFetch("/api/finance", { body: { day: f.day, amount: Number(f.amount.replace(",", ".")), kind: cats[f.category].kind, category: f.category, description: f.description } });
      setF({ ...f, amount: "", description: "" }); setMsg("Gebucht."); onChange();
    } catch (e) { setMsg((e as Error).message); }
  }
  return (
    <section className="card space-y-2 p-5">
      <div className="flex items-center gap-2"><Plus size={18} className="text-cyan" /><h2 className="font-medium">Buchung erfassen</h2></div>
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="input" type="date" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} aria-label="Datum" />
        <input className="input" inputMode="decimal" placeholder="Betrag in €" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} aria-label="Betrag" />
        <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} aria-label="Kategorie">
          {Object.entries(cats).map(([k, c]) => <option key={k} value={k}>{c.label} ({KIND_LABEL[c.kind]})</option>)}
        </select>
      </div>
      <input className="input" placeholder="Beschreibung (optional)" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} aria-label="Beschreibung" />
      <button className="btn btn-primary" disabled={!(Number(f.amount.replace(",", ".")) > 0)} onClick={save}>Buchen</button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </section>
  );
}

type ImportResult = { columns: Record<string, string | null>; total: number; newRows: number; duplicates: number; skipped: { line: number; reason: string }[];
  preview: { day: string; amount_cents: number; description: string; category: string }[]; imported: boolean };

function CsvImport({ onChange }: { onChange: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [res, setRes] = useState<ImportResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  async function pick(file: File) {
    setErr(null); setRes(null);
    if (file.size > 2_000_000) return setErr("Datei zu groß (max. 2 MB).");
    const buf = await file.arrayBuffer();
    // Many German banks export ISO-8859-1/Windows-1252; fall back if UTF-8 decoding produces replacement chars.
    let t = new TextDecoder("utf-8").decode(buf);
    if (t.includes("�")) t = new TextDecoder("windows-1252").decode(buf);
    setText(t); setName(file.name);
    try { setRes(await apiFetch<ImportResult>("/api/finance/import", { body: { csv: t, dryRun: true } })); } catch (e) { setErr((e as Error).message); }
  }
  async function confirmImport() {
    if (!text) return;
    try { setRes(await apiFetch<ImportResult>("/api/finance/import", { body: { csv: text, dryRun: false } })); onChange(); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <section className="card space-y-2 p-5">
      <div className="flex items-center gap-2"><FileUp size={18} className="text-cyan" /><h2 className="font-medium">CSV-Import</h2></div>
      <p className="text-xs text-muted">Kontoumsätze aus dem Online-Banking als CSV exportieren. Die Datei wird nur gelesen; gespeichert werden ausschließlich die Buchungen. Doppelte Importe werden erkannt.</p>
      <input ref={ref} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      <button className="btn btn-ghost" onClick={() => ref.current?.click()}>Datei wählen{name ? ` · ${name}` : ""}</button>
      {err && <p className="text-sm text-err">{err}</p>}
      {res && (
        <div className="space-y-2 text-sm">
          <p>{res.imported ? `✓ ${res.newRows} Buchungen importiert.` : `${res.newRows} neue Buchungen erkannt`}{res.duplicates ? ` · ${res.duplicates} bereits vorhanden` : ""}{res.skipped.length ? ` · ${res.skipped.length} Zeilen übersprungen` : ""}</p>
          <p className="text-xs text-muted">Spalten: {Object.entries(res.columns).filter(([, v]) => v).map(([k, v]) => `${k}=„${v}“`).join(", ") || "nicht erkannt"}</p>
          {!res.imported && res.preview.length > 0 && (
            <>
              <ul className="max-h-48 space-y-0.5 overflow-auto rounded-lg bg-ink-900/70 p-2 text-xs">{res.preview.map((p, i) => (
                <li key={i} className="flex gap-2"><span className="text-muted">{p.day}</span><span className="min-w-0 flex-1 truncate">{p.description}</span><span className="text-muted">{p.category}</span>
                  <span className={`tabular-nums ${p.amount_cents < 0 ? "" : "text-ok"}`}>{fmtEUR(p.amount_cents)}</span></li>))}</ul>
              <button className="btn btn-primary" onClick={confirmImport}>{res.newRows} Buchungen importieren</button>
            </>
          )}
          {res.skipped.length > 0 && <p className="text-xs text-muted">Übersprungen: {res.skipped.slice(0, 5).map((s) => `Zeile ${s.line} (${s.reason})`).join(", ")}</p>}
        </div>
      )}
    </section>
  );
}

function Balances({ o, onChange }: { o: Overview; onChange: () => void }) {
  const [liquid, setLiquid] = useState(o.balances.liquid == null ? "" : String(o.balances.liquid / 100));
  const [saved, setSaved] = useState(o.balances.saved == null ? "" : String(o.balances.saved / 100));
  const [target, setTarget] = useState("");
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
  async function save() { await apiFetch("/api/finance/balances", { method: "PUT", body: { liquid: num(liquid), saved: num(saved) } }); onChange(); }
  const monthly = o.baseline.months ? o.baseline.savings + o.baseline.investment : o.current.savings + o.current.investment;
  const t = num(target), s = num(saved);
  const months = t != null && s != null ? (s * 100 >= t * 100 ? 0 : monthly > 0 ? Math.ceil((t * 100 - s * 100) / monthly) : null) : undefined;
  return (
    <section className="card space-y-2 p-5">
      <h2 className="font-medium">Kontostände & Sparziel</h2>
      <p className="text-xs text-muted">Manuell gepflegt{o.balances.asOf ? ` · Stand ${fmtDate(o.balances.asOf)}` : " · noch nicht gesetzt"}. Grundlage für Prognosen.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted">Girokonto / verfügbar (€)<input className="input mt-1" inputMode="decimal" value={liquid} onChange={(e) => setLiquid(e.target.value)} /></label>
        <label className="text-xs text-muted">Erspartes + Investments (€)<input className="input mt-1" inputMode="decimal" value={saved} onChange={(e) => setSaved(e.target.value)} /></label>
      </div>
      <button className="btn btn-primary" onClick={save}>Speichern</button>
      <div className="border-t border-ink-600/40 pt-3">
        <label className="text-xs text-muted">Wie lange bis zu meinem Sparziel? Ziel (€)<input className="input mt-1" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="z. B. 10000" /></label>
        {months !== undefined && (
          <p className="mt-2 text-sm">{months === 0 ? "Ziel bereits erreicht." : months == null ? "Bei aktueller Sparrate (0 €/Monat) nie – Sparrate erhöhen." : `≈ ${months} Monate bei ${fmtEUR(monthly)} pro Monat.`}</p>
        )}
      </div>
    </section>
  );
}

type ProjMonth = { month: string; income: number; expenses: number; saving: number; liquid: number; saved: number };
function Scenario() {
  const [f, setF] = useState({ incomeChangePct: "", expenseChangePct: "", rentChange: "", oneOff: "", savingsRatePct: "", months: "6" });
  const [r, setR] = useState<{ reference: ProjMonth[]; scenario: ProjMonth[]; baselineMonths: number; balancesKnown: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const n = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(",", ".")));
  async function run() {
    try {
      setErr(null);
      setR(await apiFetch("/api/finance/scenario", { body: { months: n(f.months) ?? 6, incomeChangePct: n(f.incomeChangePct), expenseChangePct: n(f.expenseChangePct),
        rentChange: n(f.rentChange), oneOff: n(f.oneOff), savingsRatePct: n(f.savingsRatePct) ?? null } }));
    } catch (e) { setErr((e as Error).message); }
  }
  const field = (k: keyof typeof f, label: string, ph: string) => (
    <label className="text-xs text-muted">{label}<input className="input mt-1" inputMode="decimal" placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
  );
  const last = (a: ProjMonth[]) => a[a.length - 1];
  return (
    <section className="card space-y-2 p-5">
      <div className="flex items-center gap-2"><Calculator size={18} className="text-cyan" /><h2 className="font-medium">Szenario-Simulation</h2></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {field("incomeChangePct", "Einkommen ± %", "+20")}{field("expenseChangePct", "Ausgaben ± %", "-10")}{field("rentChange", "Miete ± €/Monat", "+150")}
        {field("oneOff", "Einmalkosten € (Monat 1)", "800")}{field("savingsRatePct", "Sparquote %", "20")}{field("months", "Monate", "6")}
      </div>
      <button className="btn btn-primary" onClick={run}>Simulieren</button>
      {err && <p className="text-sm text-err">{err}</p>}
      {r && (
        <div className="space-y-2 text-sm">
          {r.baselineMonths === 0 && <p className="text-xs text-warn">Keine abgeschlossenen Vormonate – Basis ist nur der aktuelle Monat. Ergebnis mit Vorsicht lesen.</p>}
          {!r.balancesKnown && <p className="text-xs text-warn">Kontostand nicht gesetzt – Prognose startet bei 0 €.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted"><tr><th className="text-left font-normal">Monat</th><th className="text-right font-normal">Konto (Basis)</th><th className="text-right font-normal">Konto (Szenario)</th><th className="text-right font-normal">Erspartes (Szenario)</th></tr></thead>
              <tbody>{r.scenario.map((m, i) => (
                <tr key={m.month} className="border-t border-ink-600/30">
                  <td className="py-1">{m.month}</td><td className="text-right tabular-nums">{fmtEUR(r.reference[i].liquid)}</td>
                  <td className={`text-right tabular-nums ${m.liquid < 0 ? "text-err" : ""}`}>{fmtEUR(m.liquid)}</td><td className="text-right tabular-nums">{fmtEUR(m.saved)}</td></tr>))}</tbody>
            </table>
          </div>
          <p>Differenz nach {r.scenario.length} Monaten: <b>{fmtEUR(last(r.scenario).liquid + last(r.scenario).saved - last(r.reference).liquid - last(r.reference).saved)}</b> Vermögen
            {last(r.scenario).liquid < 0 && <span className="text-err"> · Konto rutscht ins Minus</span>}</p>
          <p className="text-[11px] text-muted">Annahme: Ø-Werte der letzten Monate bleiben konstant. Keine Zinsen/Renditen. Das ist eine Rechnung, keine Anlageberatung.</p>
        </div>
      )}
    </section>
  );
}

function Transactions({ txs, cats, month, setMonth, onChange }: { txs: Tx[]; cats: Cat; month: string; setMonth: (m: string) => void; onChange: () => void }) {
  async function recat(id: string, category: string) { await apiFetch(`/api/finance/tx/${id}`, { method: "PATCH", body: { category } }); onChange(); }
  async function del(id: string) { if (confirm("Buchung löschen?")) { await apiFetch(`/api/finance/tx/${id}`, { method: "DELETE" }); onChange(); } }
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-medium">Buchungen</h2>
        <input className="input !w-auto !py-1" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Monat" /></div>
      {txs.length === 0 ? <p className="text-sm text-muted">Keine Buchungen in diesem Monat.</p> : (
        <ul className="divide-y divide-ink-600/30 text-sm">
          {txs.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="w-20 text-xs text-muted">{fmtDate(t.day)}</span>
              <span className="min-w-0 flex-1 truncate">{t.description || <span className="text-muted">–</span>}{t.source === "csv" && <span className="ml-1 text-[10px] text-muted">CSV</span>}</span>
              <select className="input !w-auto !py-0.5 text-xs" value={t.category} onChange={(e) => recat(t.id, e.target.value)} aria-label="Kategorie">
                {Object.entries(cats).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
              </select>
              <span className={`w-24 text-right tabular-nums ${t.amount_cents > 0 ? "text-ok" : ""}`}>{fmtEUR(t.amount_cents)}</span>
              <button className="rounded p-1 text-muted hover:text-err" onClick={() => del(t.id)} aria-label="Löschen"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
