"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Field, Input, MoneyInput, Segmented, Select, Sheet, cx } from "../ui";
import { useData, useNow } from "../providers";
import type { Movement, MovementKind } from "@/lib/types";
import { deleteMovement, saveMovement } from "@/lib/db";
import { eur, parseEuro, round2, todayISO, uid } from "@/lib/format";
import { goalBalance } from "@/lib/calc/finance";

const HINT: Record<MovementKind, string> = {
  deposit: "Geld wird vom Girokonto in die Rücklage verschoben. Keine Ausgabe – dein Nettovermögen bleibt gleich, dein verfügbares Monatsgeld sinkt.",
  withdrawal: "Geld fließt aus der Rücklage zurück aufs Girokonto.",
  transfer: "Umschichtung zwischen zwei Sparzielen – ändert weder Gespartes noch Vermögen.",
  valuation: "Für Depots & Zinsen: Trage den aktuellen Gesamtwert ein. Die Differenz wird als Wertänderung gebucht (zählt nicht als gespart).",
};

export function SaveSheet({ movement, goalId, mode, onClose }: { movement?: Movement; goalId?: string; mode?: MovementKind; onClose: () => void }) {
  const data = useData();
  const now = useNow();
  const goals = data.goals;
  const [kind, setKind] = useState<MovementKind>(movement?.kind ?? mode ?? "deposit");
  const [target, setTarget] = useState(movement?.goalId ?? goalId ?? goals[0]?.id ?? "");
  const [from, setFrom] = useState(movement?.fromGoalId ?? goals.find((g) => g.id !== (goalId ?? goals[0]?.id))?.id ?? "");
  const [amount, setAmount] = useState(movement ? String(Math.abs(movement.amount)).replace(".", ",") : "");
  const [date, setDate] = useState(movement?.date ?? todayISO(now));
  const [note, setNote] = useState(movement?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const goal = goals.find((g) => g.id === target);
  const others = movement ? data.movements.filter((m) => m.id !== movement.id) : data.movements;
  const current = goal ? goalBalance(goal, others) : 0;
  const value = parseEuro(amount);

  async function save() {
    setError(null);
    if (!goal) return setError("Bitte zuerst ein Sparziel anlegen.");
    if (value === null || (kind !== "valuation" && value <= 0) || (kind === "valuation" && value < 0)) return setError("Bitte einen gültigen Betrag eingeben.");
    if (kind === "withdrawal" && value > current + 0.001) return setError(`Im Ziel sind nur ${eur(current)} vorhanden.`);
    if (kind === "transfer") {
      const src = goals.find((g) => g.id === from);
      if (!src || src.id === target) return setError("Bitte zwei verschiedene Sparziele wählen.");
      if (value > goalBalance(src, others) + 0.001) return setError(`Im Quellziel sind nur ${eur(goalBalance(src, others))} vorhanden.`);
    }
    const amt = kind === "valuation" ? round2(value - current) : value;
    if (kind === "valuation" && amt === 0) return onClose();
    try {
      await saveMovement({
        id: movement?.id ?? uid("mv"),
        kind,
        amount: amt,
        date,
        goalId: target,
        fromGoalId: kind === "transfer" ? from : undefined,
        note: note.trim() || (kind === "valuation" ? (amt > 0 ? "Wertzuwachs" : "Wertverlust") : undefined),
        planItemId: movement?.planItemId,
        createdAt: movement?.createdAt ?? new Date().toISOString(),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Sheet
      title={movement ? "Sparbewegung bearbeiten" : "Geld sparen"}
      onClose={onClose}
      footer={
        <>
          {movement && (
            <Button variant="danger" size="lg" aria-label="Löschen" onClick={() => confirm("Sparbewegung löschen?") && deleteMovement(movement.id).then(onClose)}>
              <Trash2 size={18} />
            </Button>
          )}
          <Button variant="primary" size="lg" className="flex-1" onClick={save} disabled={!goals.length}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!movement && (
          <Segmented
            value={kind}
            onChange={(k) => (setKind(k), setError(null))}
            options={[
              { value: "deposit", label: "Einzahlen" },
              { value: "withdrawal", label: "Entnehmen" },
              { value: "transfer", label: "Umschichten" },
              { value: "valuation", label: "Wert" },
            ]}
          />
        )}
        <Field label={kind === "valuation" ? `Aktueller Gesamtwert (bisher ${eur(current)})` : "Betrag"}>
          <MoneyInput large value={amount} onChange={(v) => (setAmount(v), setError(null))} autoFocus aria-label="Betrag in Euro" />
        </Field>
        {kind === "transfer" && (
          <Field label="Von Sparziel">
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({eur(goalBalance(g, others))})
                </option>
              ))}
            </Select>
          </Field>
        )}
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-text-2">{kind === "transfer" ? "Nach Sparziel" : kind === "withdrawal" ? "Aus Sparziel" : "Sparziel"}</legend>
          <div className="grid gap-2">
            {goals.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setTarget(g.id)}
                aria-pressed={target === g.id}
                className={cx("flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition", target === g.id ? "border-accent bg-accent/10" : "border-border bg-surface-2")}
              >
                <span className="font-medium">{g.name}</span>
                <span className="tabular text-xs text-muted">{eur(goalBalance(g, others))}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Notiz (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} />
          </Field>
        </div>
        <p className="rounded-2xl bg-surface-2 p-3 text-xs text-text-2">{HINT[kind]}</p>
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>
    </Sheet>
  );
}
