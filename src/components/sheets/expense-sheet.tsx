"use client";
import { useState } from "react";
import { Bike, Dumbbell, HeartPulse, Music, MoreHorizontal, Plane, Popcorn, Shirt, ShoppingBasket, Trash2, type LucideIcon } from "lucide-react";
import { Button, Field, Input, MoneyInput, Sheet, cx } from "../ui";
import { useData, useNow } from "../providers";
import { CATEGORIES, TRAVEL_CATEGORY, type Category, type Expense } from "@/lib/types";
import { deleteExpense, saveExpense } from "@/lib/db";
import { eur, parseEuro, todayISO, uid } from "@/lib/format";
import { monthSummary } from "@/lib/calc/finance";
import { toMonth } from "@/lib/calc/months";

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  Lebensmittel: ShoppingBasket,
  Freizeit: Popcorn,
  Kleidung: Shirt,
  Transport: Bike,
  Fitness: Dumbbell,
  Gesundheit: HeartPulse,
  Abonnements: Music,
  Reisen: Plane,
  Sonstiges: MoreHorizontal,
};

function lastCategory(): Category {
  try {
    const c = localStorage.getItem("kf-last-category") as Category | null;
    return c && (CATEGORIES as readonly string[]).includes(c) ? c : "Lebensmittel";
  } catch {
    return "Lebensmittel";
  }
}

export function ExpenseSheet({ expense, onClose }: { expense?: Expense; onClose: () => void }) {
  const data = useData();
  const now = useNow();
  const [amount, setAmount] = useState(expense ? String(expense.amount).replace(".", ",") : "");
  const [category, setCategory] = useState<Category>(expense?.category ?? lastCategory);
  const [date, setDate] = useState(expense?.date ?? todayISO(now));
  const [note, setNote] = useState(expense?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const value = parseEuro(amount);

  // Budget-Vorschau: Monat ohne diese Ausgabe berechnen, dann den neuen Betrag abziehen
  const others = expense ? { ...data, expenses: data.expenses.filter((e) => e.id !== expense.id) } : data;
  const s = monthSummary(others, toMonth(/^\d{4}-\d{2}/.test(date) ? date : todayISO(now)));
  const isTravel = category === TRAVEL_CATEGORY;
  const leftAfter = (isTravel ? s.travelLeft : s.personalLeft) - (value ?? 0);

  async function save() {
    if (!value || value <= 0) return setError("Bitte einen Betrag größer als 0 eingeben.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Bitte ein Datum wählen.");
    await saveExpense({ id: expense?.id ?? uid("exp"), amount: value, category, date, note: note.trim() || undefined, createdAt: expense?.createdAt ?? new Date().toISOString() });
    try {
      localStorage.setItem("kf-last-category", category);
    } catch {
      /* ignore */
    }
    onClose();
  }

  return (
    <Sheet
      title={expense ? "Ausgabe bearbeiten" : "Ausgabe hinzufügen"}
      onClose={onClose}
      footer={
        <>
          {expense && (
            <Button variant="danger" size="lg" aria-label="Löschen" onClick={() => confirm("Ausgabe löschen?") && deleteExpense(expense.id).then(onClose)}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button variant="primary" size="lg" className="flex-1" onClick={save}>
            Speichern
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => (e.preventDefault(), save())} className="space-y-4">
        <Field label="Betrag">
          <MoneyInput large value={amount} onChange={(v) => (setAmount(v), setError(null))} autoFocus aria-label="Betrag in Euro" />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-text-2">Kategorie</legend>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c];
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cx("flex flex-col items-center gap-1 rounded-2xl border py-2.5 text-[11px] font-medium transition", category === c ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface-2 text-text-2")}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Beschreibung (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. REWE" maxLength={80} />
          </Field>
        </div>
        <div className={cx("rounded-2xl p-3 text-sm", leftAfter < 0 ? "bg-bad/10 text-bad" : "bg-surface-2 text-text-2")}>
          {isTravel ? "Reisebudget" : "Persönliches Budget"} danach: <b className="tabular">{eur(leftAfter)}</b> übrig
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}
