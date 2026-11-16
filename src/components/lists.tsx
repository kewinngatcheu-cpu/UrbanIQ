"use client";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Repeat, TrendingUp } from "lucide-react";
import { useActions, useData } from "./providers";
import { CATEGORY_ICON } from "./sheets/expense-sheet";
import { Badge, Empty, cx } from "./ui";
import { eur } from "@/lib/format";
import { CATEGORIES, type Category, type Expense, type Movement } from "@/lib/types";
import { PALETTE } from "./charts";

export const categoryColor = (c: string) => PALETTE[CATEGORIES.indexOf(c as Category)] ?? "var(--s9)";

const dateLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });

export function ExpenseList({ items, empty = "Noch keine Ausgaben." }: { items: Expense[]; empty?: string }) {
  const open = useActions();
  if (!items.length) return <Empty title={empty} text="Tippe auf „Ausgabe hinzufügen“ – dauert keine 30 Sekunden." />;
  return (
    <ul className="divide-y divide-border/70">
      {items.map((e) => {
        const Icon = CATEGORY_ICON[e.category];
        return (
          <li key={e.id}>
            <button onClick={() => open({ type: "expense", expense: e })} className="flex w-full items-center gap-3 py-2.5 text-left">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${categoryColor(e.category)} 18%, transparent)`, color: categoryColor(e.category) }}>
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{e.note || e.category}</span>
                <span className="block text-xs text-muted">
                  {e.note ? `${e.category} · ` : ""}
                  {dateLabel(e.date)}
                </span>
              </span>
              <span className="tabular text-sm font-semibold">−{eur(e.amount)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const MV_ICON = { deposit: ArrowUpRight, withdrawal: ArrowDownLeft, transfer: ArrowLeftRight, valuation: TrendingUp };
const MV_LABEL = { deposit: "Einzahlung", withdrawal: "Entnahme", transfer: "Umschichtung", valuation: "Wertänderung" };

export function MovementList({ items, empty = "Noch keine Sparbewegungen." }: { items: Movement[]; empty?: string }) {
  const data = useData();
  const open = useActions();
  const name = (id?: string) => data.goals.find((g) => g.id === id)?.name ?? "gelöschtes Ziel";
  if (!items.length) return <Empty title={empty} text="Mit „Geld sparen“ schreibst du Beträge direkt deinen Sparzielen gut." />;
  return (
    <ul className="divide-y divide-border/70">
      {items.map((m) => {
        const Icon = MV_ICON[m.kind];
        const positive = m.kind === "deposit" || (m.kind === "valuation" && m.amount > 0);
        return (
          <li key={m.id}>
            <button onClick={() => open({ type: "save", movement: m })} className="flex w-full items-center gap-3 py-2.5 text-left">
              <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", m.kind === "deposit" ? "bg-good/15 text-good" : m.kind === "withdrawal" ? "bg-warn/15 text-warn" : "bg-accent/15 text-accent")}>
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{m.kind === "transfer" ? `${name(m.fromGoalId)} → ${name(m.goalId)}` : name(m.goalId)}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  {MV_LABEL[m.kind]} · {dateLabel(m.date)}
                  {m.planItemId && (
                    <Badge>
                      <Repeat size={10} className="mr-1" />
                      Sparplan
                    </Badge>
                  )}
                </span>
              </span>
              <span className={cx("tabular text-sm font-semibold", positive ? "text-good" : m.kind === "transfer" ? "text-text-2" : "text-warn")}>
                {m.kind === "transfer" ? "" : positive ? "+" : "−"}
                {eur(Math.abs(m.amount))}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
