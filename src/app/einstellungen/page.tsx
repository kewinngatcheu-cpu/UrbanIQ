"use client";
import { useState } from "react";
import { ChevronRight, Download, FileJson, Monitor, Moon, Plus, Sun, Trash2, Upload } from "lucide-react";
import { useData, useNow, useThemePref } from "@/components/providers";
import { Badge, Button, Card, Field, Input, MoneyInput, Note, PageTitle, Segmented, Select, Sheet, cx } from "@/components/ui";
import { isActive, planForMonth } from "@/lib/calc/finance";
import { monthLabel, toMonth } from "@/lib/calc/months";
import { deletePlanItem, exportBackup, importBackup, resetAll, savePlanItem, updateSettings } from "@/lib/db";
import { download, expensesCsv, movementsCsv } from "@/lib/csv";
import { eur, parseEuro, uid } from "@/lib/format";
import type { PlanItem, PlanKind } from "@/lib/types";

const KIND_TITLE: Record<PlanKind, string> = { income: "Einnahmen", fixed: "Fixkosten", savings: "Sparpläne" };

export default function EinstellungenPage() {
  const data = useData();
  const now = useNow();
  const month = toMonth(now);
  const plan = planForMonth(data, month);
  const [edit, setEdit] = useState<PlanItem | null>(null);
  const [theme, setTheme] = useThemePref();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const section = (kind: PlanKind) => {
    const items = data.plan.filter((p) => p.kind === kind);
    const total = items.filter((p) => isActive(p, month)).reduce((s, p) => s + p.amount, 0);
    return (
      <Card
        title={KIND_TITLE[kind]}
        subtitle={`${eur(total)} pro Monat (${monthLabel(month)})`}
        action={
          <Button size="sm" onClick={() => setEdit({ id: uid("plan"), name: "", amount: 0, kind, dayOfMonth: 1, autoBook: kind === "savings" })}>
            <Plus size={14} /> Hinzufügen
          </Button>
        }
      >
        <ul className="divide-y divide-border/70">
          {items.map((p) => {
            const ended = p.endMonth && p.endMonth < month;
            const future = p.startMonth && p.startMonth > month;
            return (
              <li key={p.id}>
                <button onClick={() => setEdit(p)} className={cx("flex w-full items-center justify-between gap-3 py-3 text-left", (ended || future) && "opacity-55")}>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className="flex flex-wrap gap-1.5 text-xs text-muted">
                      {p.endMonth && <Badge tone={ended ? "neutral" : "warn"}>{ended ? "beendet" : `bis ${monthLabel(p.endMonth)}`}</Badge>}
                      {future && <Badge tone="accent">ab {monthLabel(p.startMonth!)}</Badge>}
                      {p.kind === "savings" && <span>→ {data.goals.find((g) => g.id === p.goalId)?.name ?? "kein Ziel"}{p.autoBook ? " · automatisch" : ""}</span>}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="tabular text-sm font-semibold">{eur(p.amount)}</span>
                    <ChevronRight size={16} className="text-muted" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    );
  };

  async function backup() {
    download(`kewin-finance-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportBackup(), "application/json");
    setMsg({ ok: true, text: "Backup heruntergeladen. Speichere es z. B. in iCloud Drive." });
  }
  async function restore(file: File) {
    if (!confirm("Backup einspielen? Alle aktuellen Daten werden ersetzt.")) return;
    const r = await importBackup(await file.text());
    setMsg(r.ok ? { ok: true, text: "Backup wiederhergestellt." } : { ok: false, text: r.error });
  }

  return (
    <>
      <PageTitle title="Einstellungen" subtitle="Alle Beträge sind jederzeit änderbar" />
      {msg && <p className={cx("mb-4 rounded-2xl p-3 text-sm", msg.ok ? "bg-good/10 text-good" : "bg-bad/10 text-bad")}>{msg.text}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Monatsplan" subtitle={monthLabel(month)}>
          <ul className="tabular space-y-1.5 text-sm">
            <li className="flex justify-between"><span>Einnahmen</span><span>{eur(plan.income)}</span></li>
            <li className="flex justify-between text-text-2"><span>− Fixkosten</span><span>{eur(plan.fixed)}</span></li>
            <li className="flex justify-between text-text-2"><span>− Sparpläne</span><span>{eur(plan.savingsPlans)}</span></li>
            <li className="flex justify-between text-text-2"><span>− Persönliches Budget</span><span>{eur(plan.personalBudget)}</span></li>
            <li className="flex justify-between text-text-2"><span>− Reisebudget</span><span>{eur(plan.travelBudget)}</span></li>
            <li className="flex justify-between border-t border-border pt-1.5 font-semibold"><span>= Frei für Sparziele</span><span className={plan.free < 0 ? "text-bad" : "text-good"}>{eur(plan.free)}</span></li>
          </ul>
          <Note>Endet ein Posten (z. B. Kredit bis März 2027), wird er ab dem Folgemonat automatisch nicht mehr eingeplant.</Note>
        </Card>

        <Card title="Budgets">
          <div className="grid grid-cols-2 gap-3">
            <BudgetInput label="Persönliche Ausgaben / Monat" value={data.settings.personalBudget} onSave={(v) => updateSettings({ personalBudget: v })} />
            <BudgetInput label="Reisebudget / Monat" value={data.settings.travelBudget} onSave={(v) => updateSettings({ travelBudget: v })} />
          </div>
          <Note>Reisen-Ausgaben zählen zum Reisebudget, alle anderen Kategorien zum persönlichen Budget.</Note>
        </Card>

        {section("income")}
        {section("fixed")}
        {section("savings")}

        <Card title="Darstellung">
          <Segmented
            value={theme}
            onChange={setTheme}
            options={[
              { value: "system", label: "System" },
              { value: "dark", label: "Dunkel" },
              { value: "light", label: "Hell" },
            ]}
          />
          <div className="mt-2 flex justify-around text-muted">
            <Monitor size={16} />
            <Moon size={16} />
            <Sun size={16} />
          </div>
        </Card>

        <Card title="Daten & Backup" className="lg:col-span-2" subtitle="Alles liegt lokal auf diesem Gerät – nichts wird hochgeladen">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="primary" onClick={backup}>
              <FileJson size={16} /> Backup erstellen
            </Button>
            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 px-4 text-sm font-semibold">
              <Upload size={16} /> Backup wiederherstellen
              <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
            </label>
            <Button onClick={() => download("ausgaben.csv", expensesCsv(data), "text/csv;charset=utf-8")}>
              <Download size={16} /> Ausgaben als CSV
            </Button>
            <Button onClick={() => download("sparbewegungen.csv", movementsCsv(data), "text/csv;charset=utf-8")}>
              <Download size={16} /> Sparbewegungen als CSV
            </Button>
          </div>
          <Note>Tipp: Erstelle einmal im Monat ein Backup. Damit kannst du deine Daten auch auf ein neues Gerät übertragen.</Note>
          <Button
            variant="danger"
            className="mt-4"
            onClick={async () => {
              if (!confirm("Wirklich ALLE Daten löschen und mit den Ausgangswerten neu starten?")) return;
              await resetAll();
              setMsg({ ok: true, text: "Zurückgesetzt auf die Ausgangswerte." });
            }}
          >
            <Trash2 size={16} /> Alles zurücksetzen
          </Button>
        </Card>
      </div>
      <p className="mt-6 text-center text-xs text-muted">KEWIN FINANCE · für {data.settings.ownerName}</p>

      {edit && <PlanSheet key={edit.id} item={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function BudgetInput({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value).replace(".", ","));
  return (
    <Field label={label}>
      <MoneyInput
        value={v}
        onChange={setV}
        onBlur={() => {
          const n = parseEuro(v);
          if (n !== null && n >= 0) onSave(n);
        }}
        aria-label={label}
      />
    </Field>
  );
}

function PlanSheet({ item, onClose }: { item: PlanItem; onClose: () => void }) {
  const data = useData();
  const exists = data.plan.some((p) => p.id === item.id);
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount ? String(item.amount).replace(".", ",") : "");
  const [start, setStart] = useState(item.startMonth ?? "");
  const [end, setEnd] = useState(item.endMonth ?? "");
  const [day, setDay] = useState(String(item.dayOfMonth));
  const [goalId, setGoalId] = useState(item.goalId ?? data.goals.find((g) => g.type === "investment")?.id ?? "");
  const [auto, setAuto] = useState(!!item.autoBook);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const a = parseEuro(amount);
    if (!name.trim()) return setError("Bitte einen Namen eingeben.");
    if (a === null || a < 0) return setError("Bitte einen gültigen Betrag eingeben.");
    if (start && end && end < start) return setError("Das Ende liegt vor dem Start.");
    await savePlanItem({
      ...item,
      name: name.trim(),
      amount: a,
      startMonth: start || undefined,
      endMonth: end || undefined,
      dayOfMonth: Math.min(28, Math.max(1, Number(day) || 1)),
      goalId: item.kind === "savings" ? goalId || undefined : undefined,
      autoBook: item.kind === "savings" ? auto : undefined,
    });
    onClose();
  }

  return (
    <Sheet
      title={exists ? `${KIND_TITLE[item.kind]}: bearbeiten` : `${KIND_TITLE[item.kind]}: hinzufügen`}
      onClose={onClose}
      footer={
        <>
          {exists && (
            <Button variant="danger" size="lg" aria-label="Löschen" onClick={() => confirm(`„${item.name}“ löschen?`) && deletePlanItem(item.id).then(onClose)}>
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
        <Field label="Betrag pro Monat">
          <MoneyInput large value={amount} onChange={setAmount} autoFocus aria-label="Betrag pro Monat" />
        </Field>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Handyvertrag" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ab Monat (optional)">
            <Input type="month" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Bis Monat (optional)" hint="inklusive">
            <Input type="month" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        {item.kind === "savings" && (
          <>
            <Field label="Sparziel">
              <Select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">– keines –</option>
                {data.goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 items-end gap-3">
              <Field label="Ausführung am (Tag)">
                <Input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, ""))} />
              </Field>
              <label className="flex h-12 items-center gap-2 text-sm">
                <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
                automatisch gutschreiben
              </label>
            </div>
            <Note>Automatisch: Jeden Monat am Ausführungstag wird der Betrag dem Sparziel gutgeschrieben (als Einzahlung, nicht als Ausgabe).</Note>
          </>
        )}
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>
    </Sheet>
  );
}
