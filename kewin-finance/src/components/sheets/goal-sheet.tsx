"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Field, Input, MoneyInput, Select, Sheet } from "../ui";
import { useData } from "../providers";
import type { Goal, GoalType } from "@/lib/types";
import { deleteGoal, saveGoal } from "@/lib/db";
import { eur, parseEuro, uid } from "@/lib/format";
import { goalBalance } from "@/lib/calc/finance";

export const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  property: "Immobilie / Eigenkapital",
  travel: "Reisen",
  emergency: "Notgroschen",
  investment: "Investments",
  custom: "Individuell",
};

const num = (v: number) => (v ? String(v).replace(".", ",") : "");

export function GoalSheet({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const data = useData();
  const [name, setName] = useState(goal?.name ?? "");
  const [type, setType] = useState<GoalType>(goal?.type ?? "custom");
  const [target, setTarget] = useState(num(goal?.target ?? 0));
  const [start, setStart] = useState(num(goal?.startAmount ?? 0));
  const [monthly, setMonthly] = useState(num(goal?.monthlyPlan ?? 0));
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const current = goal ? goalBalance(goal, data.movements) : null;

  async function save() {
    const t = parseEuro(target);
    if (!name.trim()) return setError("Bitte einen Namen eingeben.");
    if (!t || t <= 0) return setError("Bitte einen Zielbetrag eingeben.");
    await saveGoal({
      id: goal?.id ?? uid("goal"),
      name: name.trim(),
      type,
      target: t,
      startAmount: parseEuro(start) ?? 0,
      monthlyPlan: Math.max(0, parseEuro(monthly) ?? 0),
      targetDate: targetDate || undefined,
      createdAt: goal?.createdAt ?? new Date().toISOString(),
      order: goal?.order ?? Math.max(0, ...data.goals.map((g) => g.order)) + 1,
    });
    onClose();
  }

  return (
    <Sheet
      title={goal ? "Sparziel bearbeiten" : "Sparziel erstellen"}
      onClose={onClose}
      footer={
        <>
          {goal && (
            <Button
              variant="danger"
              size="lg"
              aria-label="Löschen"
              onClick={() => confirm(`„${goal.name}“ mit allen Sparbewegungen löschen?`) && deleteGoal(goal.id).then(onClose)}
            >
              <Trash2 size={18} />
            </Button>
          )}
          <Button variant="primary" size="lg" className="flex-1" onClick={save}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Neues Fahrrad" autoFocus={!goal} maxLength={50} />
        </Field>
        <Field label="Art" hint="Bestimmt, wo das Geld in der Vermögensübersicht erscheint">
          <Select value={type} onChange={(e) => setType(e.target.value as GoalType)}>
            {Object.entries(GOAL_TYPE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Zielbetrag">
            <MoneyInput value={target} onChange={setTarget} aria-label="Zielbetrag" />
          </Field>
          <Field label="Monatlicher Sparbetrag" hint="geplant">
            <MoneyInput value={monthly} onChange={setMonthly} aria-label="Monatlicher Sparbetrag" />
          </Field>
          <Field label={goal ? "Startbetrag" : "Bereits angespart"} hint={goal ? `Aktuell inkl. Bewegungen: ${eur(current ?? 0)}` : "Geld, das schon in dieser Rücklage liegt"}>
            <MoneyInput value={start} onChange={setStart} aria-label="Startbetrag" />
          </Field>
          <Field label="Zieldatum (optional)">
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>
    </Sheet>
  );
}
