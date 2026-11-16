"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ensureInitialized, loadAll, runMaintenance } from "@/lib/db";
import type { Expense, FinanceData, Goal, Movement } from "@/lib/types";
import { ExpenseSheet } from "./sheets/expense-sheet";
import { SaveSheet } from "./sheets/save-sheet";
import { GoalSheet } from "./sheets/goal-sheet";

const DataCtx = createContext<FinanceData | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    ensureInitialized()
      .then(() => runMaintenance())
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  const data = useLiveQuery(() => (ready ? loadAll() : Promise.resolve(null)), [ready]);
  if (error) return <p className="p-6 text-sm text-bad">Speicher konnte nicht geöffnet werden ({error}). Im privaten Safari-Modus ist lokale Speicherung eingeschränkt.</p>;
  if (!data)
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-9 w-40 animate-pulse rounded-xl bg-surface-2" />
        <div className="h-36 animate-pulse rounded-3xl bg-surface" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-surface" />)}
        </div>
      </div>
    );
  return (
    <DataCtx.Provider value={data}>
      <ActionsProvider>{children}</ActionsProvider>
    </DataCtx.Provider>
  );
}

export function useData(): FinanceData {
  const d = useContext(DataCtx);
  if (!d) throw new Error("useData außerhalb des DataProvider");
  return d;
}

export function useNow(): Date {
  const [now] = useState(() => new Date());
  return now;
}

/* ───────── Schnellaktionen (von überall aufrufbar) ───────── */

type Action =
  | { type: "expense"; expense?: Expense }
  | { type: "save"; movement?: Movement; goalId?: string; mode?: Movement["kind"] }
  | { type: "goal"; goal?: Goal };

const ActionsCtx = createContext<(a: Action) => void>(() => {});
export const useActions = () => useContext(ActionsCtx);

function ActionsProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<Action | null>(null);
  const close = () => setAction(null);
  return (
    <ActionsCtx.Provider value={setAction}>
      {children}
      {action?.type === "expense" && <ExpenseSheet key={action.expense?.id ?? "new"} expense={action.expense} onClose={close} />}
      {action?.type === "save" && <SaveSheet key={action.movement?.id ?? "new"} movement={action.movement} goalId={action.goalId} mode={action.mode} onClose={close} />}
      {action?.type === "goal" && <GoalSheet key={action.goal?.id ?? "new"} goal={action.goal} onClose={close} />}
    </ActionsCtx.Provider>
  );
}

/* ───────── Theme ───────── */

export type ThemePref = "dark" | "light" | "system";
export function useThemePref(): [ThemePref, (t: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(() => {
    if (typeof window === "undefined") return "system";
    try {
      return (localStorage.getItem("kf-theme") as ThemePref) || "system";
    } catch {
      return "system";
    }
  });
  return [
    pref,
    (t) => {
      try {
        localStorage.setItem("kf-theme", t);
      } catch {
        /* ignore */
      }
      const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      setPref(t);
    },
  ];
}
