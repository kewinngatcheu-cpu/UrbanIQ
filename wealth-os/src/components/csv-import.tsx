"use client";
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Alert, Badge, Button, Field, Modal, Select, Table } from "./ui";
import { useFinance } from "./providers";
import { guessMapping, mapRows, parseCsv, type CsvMapping, type ParsedCsv } from "@/lib/finance/csv";
import { db } from "@/lib/db";
import { fmtEUR2 } from "@/lib/format";

/** CSV- und Excel-Import (Bank, Trade-Republic-Transaktionsexport, eigene Listen). */
export function CsvImportModal({ onClose }: { onClose: () => void }) {
  const data = useFinance();
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Partial<CsvMapping>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");

  async function onFile(file: File) {
    setError(null);
    setDone(null);
    setFileName(file.name);
    try {
      let text: string;
      if (/\.xlsx$/i.test(file.name)) {
        const ExcelJS = (await import("exceljs")).default;
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const ws = wb.worksheets[0];
        const lines: string[] = [];
        ws.eachRow((row) => {
          const vals = (row.values as unknown[]).slice(1).map((v) => {
            if (v instanceof Date) return v.toISOString().slice(0, 10);
            if (v && typeof v === "object" && "result" in (v as object)) return String((v as { result: unknown }).result ?? "");
            if (v && typeof v === "object" && "text" in (v as object)) return String((v as { text: unknown }).text ?? "");
            return v === null || v === undefined ? "" : String(v);
          });
          lines.push(vals.map((x) => `"${x.replace(/"/g, '""')}"`).join(";"));
        });
        text = lines.join("\n");
      } else {
        const buf = await file.arrayBuffer();
        // Viele deutsche Banken exportieren ISO-8859-1/Windows-1252
        text = new TextDecoder("utf-8").decode(buf);
        if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buf);
      }
      const p = parseCsv(text);
      if (!p.headers.length || !p.rows.length) throw new Error("Keine Tabellenzeilen erkannt.");
      setParsed(p);
      setMapping(guessMapping(p.headers));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setParsed(null);
    }
  }

  const preview = useMemo(() => {
    if (!parsed || !mapping.date || !mapping.description || !(mapping.amount || mapping.debit || mapping.credit)) return null;
    return mapRows(parsed.rows, { amount: "", ...mapping } as CsvMapping, data.transactions);
  }, [parsed, mapping, data.transactions]);

  const importable = preview?.filter((r) => r.ok && r.tx && !(skipDuplicates && r.duplicate)) ?? [];

  async function doImport() {
    await db().transactions.bulkPut(importable.map((r) => r.tx!));
    setDone(importable.length);
  }

  const col = (key: keyof CsvMapping, label: string, optional = false) => (
    <Field label={label}>
      <Select value={mapping[key] ?? ""} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value || undefined })}>
        <option value="">{optional ? "– keine –" : "– wählen –"}</option>
        {parsed?.headers.map((h) => (
          <option key={h}>{h}</option>
        ))}
      </Select>
    </Field>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="CSV / Excel importieren"
      footer={
        done !== null ? (
          <Button variant="primary" onClick={onClose}>
            Fertig
          </Button>
        ) : (
          <Button variant="primary" disabled={!importable.length} onClick={doImport}>
            {importable.length} Buchungen importieren
          </Button>
        )
      }
    >
      {done !== null ? (
        <Alert tone="good" title={`${done} Buchungen importiert`}>
          Kategorien wurden automatisch vorgeschlagen – du kannst sie in der Liste jederzeit ändern.
        </Alert>
      ) : (
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm hover:border-accent">
            <Upload size={20} className="text-muted" />
            <span>{fileName || "Datei wählen (.csv oder .xlsx)"}</span>
            <span className="text-xs text-muted">Kontoauszug-Export deiner Bank, Trade-Republic-Transaktionsexport (Profil → Kontoauszüge → Transaktionsexport) oder eigene Liste. Die Datei wird nur lokal verarbeitet.</span>
            <input type="file" accept=".csv,.txt,.xlsx" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          {error && <Alert tone="critical" title="Import fehlgeschlagen">{error}</Alert>}
          {parsed && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {col("date", "Datum")}
                {col("description", "Beschreibung")}
                {col("amount", "Betrag (+/−)", true)}
                {col("debit", "Soll/Ausgang (optional)", true)}
                {col("credit", "Haben/Eingang (optional)", true)}
                {col("category", "Kategorie (optional)", true)}
              </div>
              <label className="flex items-center gap-2 text-xs text-text-2">
                <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} /> Duplikate überspringen
              </label>
              {preview && (
                <>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge tone="good">{preview.filter((r) => r.ok && !r.duplicate).length} neu</Badge>
                    <Badge tone="warn">{preview.filter((r) => r.duplicate).length} Duplikate</Badge>
                    <Badge tone="critical">{preview.filter((r) => !r.ok).length} fehlerhaft</Badge>
                  </div>
                  <Table head={["Datum", "Beschreibung", "Kategorie", "Betrag", ""]}>
                    {preview.slice(0, 30).map((r, i) => (
                      <tr key={i} className={r.ok ? "" : "opacity-60"}>
                        <td className="whitespace-nowrap">{r.tx?.date ?? "–"}</td>
                        <td className="max-w-48 truncate">{r.tx?.description ?? r.error}</td>
                        <td>{r.tx?.category}</td>
                        <td className={r.tx?.type === "income" ? "text-good" : ""}>{r.tx ? `${r.tx.type === "income" ? "+" : "−"}${fmtEUR2(r.tx.amount)}` : ""}</td>
                        <td>{r.duplicate ? <Badge tone="warn">Duplikat</Badge> : !r.ok ? <Badge tone="critical">Fehler</Badge> : null}</td>
                      </tr>
                    ))}
                  </Table>
                  {preview.length > 30 && <p className="text-xs text-muted">… und {preview.length - 30} weitere Zeilen</p>}
                </>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
