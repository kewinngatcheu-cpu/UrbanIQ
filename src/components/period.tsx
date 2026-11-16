"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthLabel } from "@/lib/calc/months";
import { Segmented } from "./ui";

export type Period = { mode: "month"; month: string } | { mode: "year"; year: number };

/** Monats-/Jahreswahl mit Pfeilen – für Filter und Übersichten. */
export function PeriodPicker({ value, onChange, allowYear = true }: { value: Period; onChange: (p: Period) => void; allowYear?: boolean }) {
  const label = value.mode === "month" ? monthLabel(value.month) : String(value.year);
  const step = (d: number) => onChange(value.mode === "month" ? { mode: "month", month: addMonths(value.month, d) } : { mode: "year", year: value.year + d });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowYear && (
        <Segmented
          className="w-40"
          value={value.mode}
          onChange={(mode) =>
            onChange(mode === "year" ? { mode, year: Number((value.mode === "month" ? value.month : String(value.year)).slice(0, 4)) } : { mode, month: value.mode === "year" ? `${value.year}-${String(new Date().getMonth() + 1).padStart(2, "0")}` : value.month })
          }
          options={[
            { value: "month", label: "Monat" },
            { value: "year", label: "Jahr" },
          ]}
        />
      )}
      <div className="flex h-11 flex-1 items-center justify-between rounded-2xl bg-surface-2 sm:flex-none">
        <button onClick={() => step(-1)} className="grid h-full w-11 place-items-center text-muted hover:text-text" aria-label="Zurück">
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-32 text-center text-sm font-semibold" aria-live="polite">
          {label}
        </span>
        <button onClick={() => step(1)} className="grid h-full w-11 place-items-center text-muted hover:text-text" aria-label="Weiter">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export const inPeriod = (date: string, p: Period) => (p.mode === "month" ? date.startsWith(p.month) : date.startsWith(String(p.year)));
