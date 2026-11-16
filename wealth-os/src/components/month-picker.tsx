"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthLabel } from "@/lib/finance/months";
import type { Month } from "@/lib/types";

export function MonthPicker({ value, onChange }: { value: Month; onChange: (m: Month) => void }) {
  return (
    <div className="inline-flex h-10 items-center rounded-xl border border-border bg-surface-2">
      <button className="h-full px-2.5 text-muted hover:text-text" onClick={() => onChange(addMonths(value, -1))} aria-label="Vorheriger Monat">
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-32 text-center text-sm font-medium">{monthLabel(value, true)}</span>
      <button className="h-full px-2.5 text-muted hover:text-text" onClick={() => onChange(addMonths(value, 1))} aria-label="Nächster Monat">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
