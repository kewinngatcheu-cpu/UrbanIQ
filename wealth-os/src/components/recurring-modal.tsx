"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Alert, Button, Field, Input, Modal, NumberInput, Select } from "./ui";
import { useFinance } from "./providers";
import { CATEGORIES, type Category, type RecurringItem, type RecurringKind } from "@/lib/types";
import { remove, upsert } from "@/lib/db";

const KIND_LABEL: Record<RecurringKind, string> = { income: "Einnahme", expense: "Ausgabe / Fixkosten", investment: "Investment-Sparplan", saving: "Sparplan (Tagesgeld)" };

export function RecurringModal({ item, onClose }: { item: RecurringItem; onClose: () => void }) {
  const data = useFinance();
  const [d, setD] = useState<RecurringItem>(item);
  const exists = data.recurring.some((r) => r.id === item.id);
  const valid = d.name.trim() && d.amount >= 0 && /^\d{4}-\d{2}$/.test(d.startMonth) && (!d.endMonth || d.endMonth >= d.startMonth);
  const set = (p: Partial<RecurringItem>) => setD({ ...d, ...p });

  return (
    <Modal
      open
      onClose={onClose}
      title={exists ? "Wiederkehrenden Posten bearbeiten" : "Neuer wiederkehrender Posten"}
      footer={
        <>
          {exists && (
            <Button variant="danger" onClick={() => remove("recurring", d.id).then(onClose)}>
              <Trash2 size={14} /> Löschen
            </Button>
          )}
          <Button variant="primary" disabled={!valid} onClick={() => upsert("recurring", { ...d, endMonth: d.endMonth || undefined }).then(onClose)}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="z. B. Handyvertrag" />
        </Field>
        <Field label="Art">
          <Select
            value={d.kind}
            onChange={(e) => {
              const kind = e.target.value as RecurringKind;
              set({ kind, category: kind === "income" ? "Einkommen" : kind === "investment" ? "Investments" : kind === "saving" ? "Sparen" : d.category === "Einkommen" ? "Sonstiges" : d.category });
            }}
          >
            {Object.entries(KIND_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kategorie">
          <Select value={d.category} onChange={(e) => set({ category: e.target.value as Category })} disabled={d.kind !== "expense"}>
            {(d.kind === "income" ? ["Einkommen"] : d.kind === "investment" ? ["Investments"] : d.kind === "saving" ? ["Sparen"] : CATEGORIES.filter((c) => c !== "Investments" && c !== "Sparen")).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Betrag">
          <NumberInput value={d.amount} min={0} suffix="€" onChange={(amount) => set({ amount })} />
        </Field>
        <Field label="Intervall">
          <Select value={d.interval} onChange={(e) => set({ interval: e.target.value as RecurringItem["interval"] })}>
            <option value="monthly">monatlich</option>
            <option value="quarterly">quartalsweise</option>
            <option value="yearly">jährlich</option>
          </Select>
        </Field>
        <Field label="Fällig am (Tag)">
          <NumberInput value={d.dayOfMonth} min={1} step={1} onChange={(v) => set({ dayOfMonth: Math.max(1, Math.min(28, Math.round(v))) })} />
        </Field>
        <Field label="Erste Zahlung (Monat)">
          <Input type="month" value={d.startMonth} onChange={(e) => set({ startMonth: e.target.value })} />
        </Field>
        <Field label="Letzte Zahlung (Monat, optional)" hint="z. B. Kredit bis 2027-03 → ab April automatisch nicht mehr eingeplant" className="sm:col-span-2">
          <Input type="month" value={d.endMonth ?? ""} onChange={(e) => set({ endMonth: e.target.value || undefined })} />
        </Field>
        {(d.kind === "investment" || d.kind === "saving") && (
          <Field label="Zielkonto" className="sm:col-span-2">
            <Select value={d.targetAccountId ?? ""} onChange={(e) => set({ targetAccountId: e.target.value || undefined })}>
              <option value="">–</option>
              {data.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!d.isSubscription} onChange={(e) => set({ isSubscription: e.target.checked })} /> Abonnement
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!d.isContract} onChange={(e) => set({ isContract: e.target.checked })} /> Vertrag mit Laufzeit
        </label>
        {d.isContract && (
          <Field label="Kündigungsfrist / Hinweis" className="sm:col-span-2">
            <Input value={d.cancellationNotice ?? ""} onChange={(e) => set({ cancellationNotice: e.target.value })} placeholder="z. B. 3 Monate zum Laufzeitende" />
          </Field>
        )}
        <Field label="Notiz" className="sm:col-span-2">
          <Input value={d.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
        </Field>
      </div>
      {d.endMonth && d.endMonth < d.startMonth && (
        <div className="mt-3">
          <Alert tone="critical" title="Endmonat liegt vor dem Startmonat" />
        </div>
      )}
    </Modal>
  );
}
