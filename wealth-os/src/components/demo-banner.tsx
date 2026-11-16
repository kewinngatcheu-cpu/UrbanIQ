"use client";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { useFinance } from "./providers";

export function DemoBanner() {
  const { settings } = useFinance();
  if (!settings.demoMode) return null;
  return (
    <div className="no-print mb-5 flex flex-col gap-2 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <FlaskConical size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
        <div>
          <span className="font-semibold text-warn">DEMO-DATEN</span>
          <span className="text-text-2"> – Kontostände, Historie, Transaktionen und Depotpositionen sind fiktiv. Deine Planwerte (Einkommen, Fixkosten, Budgets) stammen aus deinem Briefing.</span>
        </div>
      </div>
      <Link href="/settings#daten" className="shrink-0 text-xs font-medium text-accent hover:underline">
        Mit echten Daten starten →
      </Link>
    </div>
  );
}
