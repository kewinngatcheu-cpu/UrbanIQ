"use client";
import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Moon, RotateCcw, Sun, Upload } from "lucide-react";
import { useFinance, useNow, useTheme } from "@/components/providers";
import { Alert, Assumption, Button, Card, Field, Input, NumberInput, PageHeader, Toggle } from "@/components/ui";
import { exportBackup, importBackup, resetToBaseline, resetToDemo, updateSettings } from "@/lib/db";
import { downloadText, exportXlsx } from "@/lib/export";
import { transactionsToCsv } from "@/lib/finance/csv";
import { addMonths, monthLabel, toMonth } from "@/lib/finance/months";
import { CATEGORIES, type ExpenseCategory } from "@/lib/types";
import { fmtEUR } from "@/lib/format";

export default function SettingsPage() {
  const data = useFinance();
  const now = useNow();
  const s = data.settings;
  const [theme, setTheme] = useTheme();
  const [msg, setMsg] = useState<{ tone: "good" | "critical"; text: string } | null>(null);

  async function backup() {
    downloadText(`wealth-os-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportBackup(), "application/json");
    await updateSettings({ lastBackupAt: new Date().toISOString() });
    setMsg({ tone: "good", text: "Backup heruntergeladen. Bewahre die Datei sicher auf – sie enthält alle Finanzdaten im Klartext." });
  }
  async function restore(file: File) {
    if (!confirm("Backup einspielen? Alle aktuellen Daten werden ersetzt.")) return;
    const res = await importBackup(await file.text());
    setMsg(res.ok ? { tone: "good", text: "Backup erfolgreich wiederhergestellt." } : { tone: "critical", text: res.error });
  }

  return (
    <>
      <PageHeader title="Einstellungen" description="Planungsannahmen, zukünftige Einkommensänderungen, Darstellung sowie Export, Import und Backup." />
      {msg && <div className="mb-4"><Alert tone={msg.tone} title={msg.text} /></div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Budget-Regeln">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Persönliche Ausgaben max." hint="Briefing: maximal 200 €">
              <NumberInput value={s.personalBudgetCap} suffix="€" onChange={(personalBudgetCap) => updateSettings({ personalBudgetCap })} />
            </Field>
            <Field label="Warnung ab Budgetverbrauch">
              <NumberInput value={s.warnThresholdPct} suffix="%" onChange={(warnThresholdPct) => updateSettings({ warnThresholdPct })} />
            </Field>
          </div>
          <fieldset className="mt-3">
            <legend className="mb-1.5 text-xs font-medium text-text-2">Kategorien, die zum persönlichen Budget zählen</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => !["Investments", "Sparen", "Kredite"].includes(c)).map((c) => (
                <label key={c} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={s.personalCategories.includes(c)}
                    onChange={(e) => updateSettings({ personalCategories: e.target.checked ? [...s.personalCategories, c] : s.personalCategories.filter((x: ExpenseCategory) => x !== c) })}
                  />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card title="Zukünftige Einnahmen & Prognose-Annahmen">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gehaltssteigerung p. a.">
              <NumberInput value={s.salaryGrowthPct} step={0.5} suffix="%" onChange={(salaryGrowthPct) => updateSettings({ salaryGrowthPct })} />
            </Field>
            <Field label="Tagesgeld-Zins (Annahme)">
              <NumberInput value={s.safeInterestPct} step={0.1} suffix="%" onChange={(safeInterestPct) => updateSettings({ safeInterestPct })} />
            </Field>
          </div>
          <div className="mt-3">
            <Toggle
              checked={!!s.careerStart}
              onChange={(v) => updateSettings({ careerStart: v ? { month: addMonths(toMonth(now), 24), netIncome: 2400 } : undefined })}
              label="Berufseinstieg / Einkommensänderung planen"
              description="Wird in Prognose, Immobilien-Tracker und Belastungsquote verwendet"
            />
            {s.careerStart && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Field label="Ab Monat">
                  <Input type="month" value={s.careerStart.month} onChange={(e) => e.target.value && updateSettings({ careerStart: { ...s.careerStart!, month: e.target.value } })} />
                </Field>
                <Field label="Netto-Einkommen danach">
                  <NumberInput value={s.careerStart.netIncome} suffix="€" onChange={(netIncome) => updateSettings({ careerStart: { ...s.careerStart!, netIncome } })} />
                </Field>
              </div>
            )}
          </div>
          <Assumption>Einzelne zukünftige Einnahmen/Ausgaben (z. B. Mieteinzug, neues Abo, Kreditende) legst du unter „Fixkosten & Abos“ mit Start- und Endmonat an.{s.careerStart ? ` Aktuell: ${fmtEUR(s.careerStart.netIncome)} ab ${monthLabel(s.careerStart.month, true)}.` : ""}</Assumption>
        </Card>

        <Card title="Darstellung">
          <div className="flex gap-2">
            <Button variant={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")}><Moon size={15} /> Dark</Button>
            <Button variant={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")}><Sun size={15} /> Light</Button>
          </div>
        </Card>

        <Card title="Export & Backup" subtitle={s.lastBackupAt ? `Letztes Backup: ${new Date(s.lastBackupAt).toLocaleString("de-DE")}` : "Noch kein Backup erstellt"}>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={backup}><FileJson size={15} /> Komplett-Backup (JSON)</Button>
            <Button onClick={() => exportXlsx(data)}><FileSpreadsheet size={15} /> Excel</Button>
            <Button onClick={() => downloadText("transaktionen.csv", transactionsToCsv(data.transactions), "text/csv;charset=utf-8")}><Download size={15} /> CSV</Button>
            <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium hover:bg-border">
              <Upload size={15} /> Backup einspielen
              <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
            </label>
          </div>
          <Assumption>Daten liegen ausschließlich lokal im Browser (IndexedDB) dieses Geräts. Für iPhone ↔ Desktop: Backup exportieren und auf dem anderen Gerät einspielen. PDF-Berichte findest du unter Intelligence und Monats-Check.</Assumption>
        </Card>

        <Card title="Daten" className="lg:col-span-2">
          <div id="daten" className="scroll-mt-6" />
          {s.demoMode && (
            <div className="mb-3">
              <Alert tone="warn" title="Du nutzt DEMO-DATEN">
                „Mit echten Daten starten“ übernimmt deine Planwerte aus dem Briefing (1.400 € Netto, alle Fixkosten, Kredit bis März 2027, 200 € persönlich, 200 € Reisen, 150 € Trade Republic) und setzt alle Kontostände, Transaktionen und Positionen auf leer.
              </Alert>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={async () => {
                if (!confirm("Alle Daten durch deine Planwerte ersetzen (Kontostände leer)? Erstelle vorher ggf. ein Backup.")) return;
                await resetToBaseline();
                setMsg({ tone: "good", text: "Gestartet mit deinen echten Planwerten. Trage jetzt unter „Vermögen“ deine Kontostände ein." });
              }}
            >
              Mit echten Daten starten
            </Button>
            <Button
              onClick={async () => {
                if (!confirm("Alle Daten durch fiktive DEMO-DATEN ersetzen?")) return;
                await resetToDemo();
                setMsg({ tone: "good", text: "Demo-Daten geladen." });
              }}
            >
              <RotateCcw size={15} /> Demo-Daten laden
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
