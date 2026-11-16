"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Field, Input, Modal, NumberInput, Select, Tabs } from "./ui";
import { useFinance } from "./providers";
import { CATEGORIES, type Category, type Transaction } from "@/lib/types";
import { remove, upsert } from "@/lib/db";
import { suggestCategory } from "@/lib/finance/csv";

export function TransactionModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const data = useFinance();
  const [draft, setDraft] = useState<Transaction>(tx);
  const [touchedCat, setTouchedCat] = useState(false);
  const exists = data.transactions.some((t) => t.id === tx.id);
  const valid = draft.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(draft.date);
  const categories: Category[] = draft.type === "income" ? ["Einkommen", "Sparen", "Investments", "Sonstiges"] : [...CATEGORIES];

  return (
    <Modal
      open
      onClose={onClose}
      title={exists ? "Transaktion bearbeiten" : "Neue Transaktion"}
      footer={
        <>
          {exists && (
            <Button variant="danger" onClick={() => remove("transactions", draft.id).then(onClose)}>
              <Trash2 size={14} /> Löschen
            </Button>
          )}
          <Button variant="primary" disabled={!valid} onClick={() => upsert("transactions", { ...draft, isDemo: false }).then(onClose)}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="mb-3">
        <Tabs
          value={draft.type}
          onChange={(type) => setDraft({ ...draft, type, category: type === "income" ? "Einkommen" : draft.category === "Einkommen" ? "Sonstiges" : draft.category })}
          options={[{ value: "expense", label: "Ausgabe" }, { value: "income", label: "Einnahme" }]}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Betrag">
          <NumberInput value={draft.amount} min={0} suffix="€" onChange={(amount) => setDraft({ ...draft, amount })} autoFocus />
        </Field>
        <Field label="Datum">
          <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </Field>
        <Field label="Beschreibung" className="sm:col-span-2">
          <Input
            value={draft.description}
            placeholder="z. B. REWE, Gehalt, Kino …"
            onChange={(e) => {
              const description = e.target.value;
              setDraft({ ...draft, description, category: touchedCat ? draft.category : suggestCategory(description, draft.type === "income") });
            }}
          />
        </Field>
        <Field label="Kategorie" hint={!touchedCat ? "wird anhand der Beschreibung vorgeschlagen" : undefined}>
          <Select
            value={draft.category}
            onChange={(e) => {
              setTouchedCat(true);
              setDraft({ ...draft, category: e.target.value as Category });
            }}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Konto (optional)">
          <Select value={draft.accountId ?? ""} onChange={(e) => setDraft({ ...draft, accountId: e.target.value || undefined })}>
            <option value="">–</option>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
