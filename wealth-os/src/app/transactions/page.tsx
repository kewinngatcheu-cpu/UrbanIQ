"use client";
import { useState } from "react";
import { Download, Plus, Search, Upload } from "lucide-react";
import { useFinance, useNow } from "@/components/providers";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, Stat } from "@/components/ui";
import { TransactionModal } from "@/components/transaction-modal";
import { CsvImportModal } from "@/components/csv-import";
import { fmtEUR, fmtEUR2, todayISO, uid } from "@/lib/format";
import { monthLabel, toMonth } from "@/lib/finance/months";
import { transactionsToCsv } from "@/lib/finance/csv";
import { downloadText } from "@/lib/export";
import { CATEGORIES, type Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const data = useFinance();
  const now = useNow();
  const [month, setMonth] = useState<string>(toMonth(now));
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [importing, setImporting] = useState(false);

  const months = Array.from(new Set(data.transactions.map((t) => t.date.slice(0, 7)))).sort().reverse();
  const list = data.transactions.filter(
    (t) =>
      (!month || t.date.startsWith(month)) &&
      (!category || t.category === category) &&
      (!type || t.type === type) &&
      (!q || t.description.toLowerCase().includes(q.toLowerCase())),
  );
  const income = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const groups = new Map<string, Transaction[]>();
  for (const t of list) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);
  const grouped = Array.from(groups.entries());

  return (
    <>
      <PageHeader
        title="Transaktionen"
        description="Einnahmen und Ausgaben erfassen, kategorisieren, importieren und exportieren."
        actions={
          <>
            <Button onClick={() => setImporting(true)}>
              <Upload size={15} /> Import
            </Button>
            <Button onClick={() => downloadText(`transaktionen-${month || "alle"}.csv`, transactionsToCsv(list), "text/csv;charset=utf-8")}>
              <Download size={15} /> CSV
            </Button>
            <Button variant="primary" onClick={() => setEditing({ id: uid("tx"), date: todayISO(now), amount: 0, type: "expense", category: "Sonstiges", description: "", source: "manual" })}>
              <Plus size={15} /> Neu
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Einnahmen" value={fmtEUR(income)} />
        <Stat label="Ausgaben (inkl. Sparen)" value={fmtEUR(expense)} />
        <Stat label="Saldo" value={fmtEUR(income - expense)} tone={income - expense >= 0 ? "good" : "critical"} sub={`${list.length} Buchungen`} />
      </div>

      <Card>
        <div className="mb-4 grid gap-2 sm:grid-cols-4">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Suche" />
          </div>
          <Select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Monat">
            <option value="">Alle Monate</option>
            {[toMonth(now), ...months.filter((m) => m !== toMonth(now))].map((m) => (
              <option key={m} value={m}>
                {monthLabel(m, true)}
              </option>
            ))}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Kategorie">
            <option value="">Alle Kategorien</option>
            {["Einkommen", ...CATEGORIES].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Typ">
            <option value="">Einnahmen & Ausgaben</option>
            <option value="income">Nur Einnahmen</option>
            <option value="expense">Nur Ausgaben</option>
          </Select>
        </div>

        {list.length === 0 ? (
          <EmptyState title="Keine Transaktionen" description="Erfasse eine Buchung manuell oder importiere einen Kontoauszug als CSV/Excel." />
        ) : (
          <div className="space-y-4">
            {grouped.map(([date, txs]) => (
              <div key={date}>
                <div className="mb-1 text-xs font-medium text-muted">{new Date(date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long" })}</div>
                <ul className="divide-y divide-border/60 rounded-xl border border-border">
                  {txs.map((t) => (
                    <li key={t.id}>
                      <button onClick={() => setEditing(t)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{t.description}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                            {t.category}
                            {t.source === "recurring" && <Badge>wiederkehrend</Badge>}
                            {t.source === "csv" && <Badge>Import</Badge>}
                            {t.isDemo && <Badge tone="demo">Demo</Badge>}
                          </div>
                        </div>
                        <span className={`tabular shrink-0 text-sm font-medium ${t.type === "income" ? "text-good" : ""}`}>
                          {t.type === "income" ? "+" : "−"}
                          {fmtEUR2(t.amount)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && <TransactionModal key={editing.id} tx={editing} onClose={() => setEditing(null)} />}
      {importing && <CsvImportModal onClose={() => setImporting(false)} />}
    </>
  );
}
