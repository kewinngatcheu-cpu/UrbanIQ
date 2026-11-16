"use client";
import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Alert, Button, Field, Input, Modal, NumberInput, Select } from "./ui";
import { useFinance, useNow } from "./providers";
import type { Account, AccountBucket, AccountType, Holding, HoldingType, Transaction } from "@/lib/types";
import { db, remove, upsert } from "@/lib/db";
import { round2, todayISO, uid } from "@/lib/format";

export const BUCKET_LABEL: Record<AccountBucket, string> = {
  liquid: "A · Tagesgeld & Notgroschen / Liquidität",
  property: "B · Immobilien-Eigenkapital",
  invested: "C · Trade Republic & ETF-Portfolio",
  other: "D · Sonstige Investments",
};
const TYPE_LABEL: Record<AccountType, string> = {
  checking: "Girokonto",
  savings: "Tagesgeld",
  emergency: "Notgroschen",
  property_equity: "Immobilien-Rücklage",
  broker: "Depot / Broker",
  other_investment: "Sonstiges Investment",
  cash: "Bargeld",
};
const DEFAULT_BUCKET: Record<AccountType, AccountBucket> = {
  checking: "liquid", savings: "liquid", emergency: "liquid", cash: "liquid", property_equity: "property", broker: "invested", other_investment: "other",
};

export function AccountModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const data = useFinance();
  const [d, setD] = useState(account);
  const exists = data.accounts.some((a) => a.id === account.id);
  const hasHoldings = data.holdings.some((h) => h.accountId === account.id);
  return (
    <Modal
      open
      onClose={onClose}
      title={exists ? "Konto bearbeiten" : "Neues Konto"}
      footer={
        <>
          {exists && (
            <Button
              variant="danger"
              onClick={async () => {
                if (!confirm(`Konto „${d.name}“ inkl. Positionen und Snapshots löschen?`)) return;
                await db().transaction("rw", [db().accounts, db().holdings, db().snapshots], async () => {
                  await db().holdings.where("accountId").equals(d.id).delete();
                  await db().snapshots.where("accountId").equals(d.id).delete();
                  await db().accounts.delete(d.id);
                });
                onClose();
              }}
            >
              <Trash2 size={14} /> Löschen
            </Button>
          )}
          <Button variant="primary" disabled={!d.name.trim()} onClick={() => upsert("accounts", { ...d, isDemo: false }).then(onClose)}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </Field>
        <Field label="Kontoart">
          <Select value={d.type} onChange={(e) => { const type = e.target.value as AccountType; setD({ ...d, type, bucket: DEFAULT_BUCKET[type] }); }}>
            {Object.entries(TYPE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Vermögensbereich">
          <Select value={d.bucket} onChange={(e) => setD({ ...d, bucket: e.target.value as AccountBucket })}>
            {Object.entries(BUCKET_LABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label={d.type === "broker" ? "Cash-Bestand im Depot" : "Kontostand"} hint={hasHoldings ? "Positionen werden separat bewertet und addiert." : undefined}>
          <NumberInput value={d.balance} suffix="€" onChange={(balance) => setD({ ...d, balance })} />
        </Field>
        <Field label="Summe Einzahlungen" hint="Netto eingezahltes Kapital – trennt Einzahlungen von Rendite">
          <NumberInput value={d.contributions} suffix="€" onChange={(contributions) => setD({ ...d, contributions })} />
        </Field>
        <Field label="Institut (optional)">
          <Input value={d.institution ?? ""} onChange={(e) => setD({ ...d, institution: e.target.value || undefined })} />
        </Field>
        <Field label="Zins p. a. (optional)">
          <NumberInput value={d.interestRate ?? 0} suffix="%" onChange={(interestRate) => setD({ ...d, interestRate })} />
        </Field>
      </div>
    </Modal>
  );
}

/** Einzahlung/Entnahme: aktualisiert Kontostand + Einzahlungssumme und protokolliert optional eine Transaktion. */
export function DepositModal({ accountId, onClose }: { accountId?: string; onClose: () => void }) {
  const data = useFinance();
  const now = useNow();
  const [target, setTarget] = useState(accountId ?? data.accounts[0]?.id ?? "");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayISO(now));
  const [withdraw, setWithdraw] = useState(false);
  const [log, setLog] = useState(true);
  const acc = data.accounts.find((a) => a.id === target);

  async function save() {
    if (!acc || amount <= 0) return;
    const signed = withdraw ? -amount : amount;
    await db().transaction("rw", [db().accounts, db().transactions], async () => {
      await db().accounts.put({ ...acc, balance: round2(acc.balance + signed), contributions: round2(acc.contributions + signed) });
      if (log && acc.bucket !== "liquid") {
        const tx: Transaction = {
          id: uid("tx"), date, amount, type: withdraw ? "income" : "expense",
          category: acc.bucket === "invested" || acc.bucket === "other" ? "Investments" : "Sparen",
          description: `${withdraw ? "Entnahme" : "Einzahlung"} ${acc.name}`, accountId: acc.id, source: "deposit",
        };
        await db().transactions.put(tx);
      }
    });
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Einzahlung erfassen" footer={<Button variant="primary" disabled={!acc || amount <= 0} onClick={save}>Speichern</Button>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Konto" className="sm:col-span-2">
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Betrag">
          <NumberInput value={amount} min={0} suffix="€" onChange={setAmount} autoFocus />
        </Field>
        <Field label="Datum">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={withdraw} onChange={(e) => setWithdraw(e.target.checked)} /> Entnahme statt Einzahlung
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={log} onChange={(e) => setLog(e.target.checked)} /> als Transaktion (Sparen/Investments) buchen
        </label>
      </div>
      {acc?.type === "broker" && (
        <div className="mt-3">
          <Alert tone="info" title="Hinweis für Depots">Die Einzahlung erhöht zunächst den Cash-Bestand. Kaufst du davon ETF-Anteile, trage die Stückzahl bei der Position ein und reduziere den Cash-Bestand im Konto.</Alert>
        </div>
      )}
    </Modal>
  );
}

const HOLDING_TYPES: Record<HoldingType, string> = { etf: "ETF", stock: "Aktie", bond: "Anleihe", crypto: "Krypto", fund: "Fonds", other: "Sonstiges" };

export function HoldingModal({ holding, onClose }: { holding: Holding; onClose: () => void }) {
  const data = useFinance();
  const now = useNow();
  const [d, setD] = useState(holding);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tone: "good" | "critical" | "info"; text: string } | null>(null);
  const exists = data.holdings.some((h) => h.id === holding.id);
  const brokers = data.accounts.filter((a) => a.bucket === "invested" || a.bucket === "other");

  async function fetchQuote() {
    if (!d.symbol) return;
    if (!data.settings.consent.marketData) {
      setMsg({ tone: "info", text: "Marktdaten sind deaktiviert. Aktiviere die Integration unter Integrationen (Zustimmung erforderlich)." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/market/quote?symbol=${encodeURIComponent(d.symbol)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Abruf fehlgeschlagen");
      setD({ ...d, currentPrice: j.price, priceDate: j.date, priceSource: "alphavantage" });
      setMsg({ tone: "good", text: `Kurs ${j.price} ${j.currency ?? ""} vom ${j.date} (Quelle: Alpha Vantage). Prüfe die Währung!` });
    } catch (e) {
      setMsg({ tone: "critical", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={exists ? "Position bearbeiten" : "Neue Position"}
      footer={
        <>
          {exists && (
            <Button variant="danger" onClick={() => remove("holdings", d.id).then(onClose)}>
              <Trash2 size={14} /> Löschen
            </Button>
          )}
          <Button variant="primary" disabled={!d.name.trim() || !d.accountId} onClick={() => upsert("holdings", { ...d, isDemo: false }).then(onClose)}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="z. B. Vanguard FTSE All-World" />
        </Field>
        <Field label="Depot">
          <Select value={d.accountId} onChange={(e) => setD({ ...d, accountId: e.target.value })}>
            {brokers.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Typ">
          <Select value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as HoldingType })}>
            {Object.entries(HOLDING_TYPES).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="ISIN (optional)">
          <Input value={d.isin ?? ""} onChange={(e) => setD({ ...d, isin: e.target.value.toUpperCase() || undefined })} />
        </Field>
        <Field label="Ticker für Kursabruf (optional)" hint="Alpha Vantage, z. B. VWCE.DEX (Xetra)">
          <Input value={d.symbol ?? ""} onChange={(e) => setD({ ...d, symbol: e.target.value.toUpperCase() || undefined })} />
        </Field>
        <Field label="Stückzahl">
          <NumberInput value={d.quantity} min={0} onChange={(quantity) => setD({ ...d, quantity })} />
        </Field>
        <Field label="Einstandskurs (Ø je Stück)">
          <NumberInput value={d.avgPrice} min={0} suffix="€" onChange={(avgPrice) => setD({ ...d, avgPrice })} />
        </Field>
        <Field label="Aktueller Kurs">
          <NumberInput value={d.currentPrice} min={0} suffix="€" onChange={(currentPrice) => setD({ ...d, currentPrice, priceDate: todayISO(now), priceSource: "manual" })} />
        </Field>
        <Field label="Kursdatum">
          <Input type="date" value={d.priceDate ?? ""} onChange={(e) => setD({ ...d, priceDate: e.target.value })} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={fetchQuote} disabled={!d.symbol || loading}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Kurs abrufen
        </Button>
        <span className="text-xs text-muted">Optional, read-only, nur mit deiner Zustimmung.</span>
      </div>
      {msg && (
        <div className="mt-3">
          <Alert tone={msg.tone === "good" ? "good" : msg.tone === "critical" ? "critical" : "info"} title={msg.text} />
        </div>
      )}
    </Modal>
  );
}
