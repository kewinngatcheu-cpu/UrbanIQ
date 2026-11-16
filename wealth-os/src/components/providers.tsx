"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ensureSeeded, loadAll } from "@/lib/db";
import type { FinanceData } from "@/lib/types";

const Ctx = createContext<FinanceData | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  const data = useLiveQuery(() => (ready ? loadAll() : Promise.resolve(null)), [ready]);

  if (error)
    return (
      <div className="p-6 text-sm text-critical">
        Datenbank konnte nicht geöffnet werden: {error}. Im privaten Modus mancher Browser ist IndexedDB deaktiviert.
      </div>
    );
  if (!data) return <LoadingSkeleton />;
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useFinance(): FinanceData {
  const d = useContext(Ctx);
  if (!d) throw new Error("useFinance außerhalb des FinanceProvider");
  return d;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Lädt">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </div>
  );
}

/** "Jetzt" einmal pro Render-Baum – vermeidet Hydration-Unterschiede (nur clientseitig genutzt). */
export function useNow(): Date {
  const [now] = useState(() => new Date());
  return now;
}

export function useTheme(): [string, (t: "dark" | "light") => void] {
  const [theme, setTheme] = useState(() => (typeof document !== "undefined" ? document.documentElement.dataset.theme ?? "dark" : "dark"));
  return [
    theme,
    (t) => {
      document.documentElement.dataset.theme = t;
      try {
        localStorage.setItem("wealth-os-theme", t);
      } catch {
        /* ignore */
      }
      setTheme(t);
    },
  ];
}
