"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileDown, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useFinance, useNow } from "@/components/providers";
import { Alert, Badge, Button, Card, Input, PageHeader, Tabs } from "@/components/ui";
import { LocalMonthReport, Markdown } from "@/components/report";
import { QUESTIONS, answerQuestion, buildFactSheet, buildMonthReport, generateInsights, nextMonthTasks, type QAAnswer } from "@/lib/finance/analyst";
import { monthLabel, toMonth } from "@/lib/finance/months";
import { exportMonthPdf } from "@/lib/export";
import { remove, upsert } from "@/lib/db";
import { uid } from "@/lib/format";

type Status = { ai: { configured: boolean; provider: string; model: string } };

export default function IntelligencePage() {
  const data = useFinance();
  const now = useNow();
  const month = toMonth(now);
  const insights = useMemo(() => generateInsights(data, now), [data, now]);
  const [answers, setAnswers] = useState<QAAnswer[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState<"report" | "question" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [tab, setTab] = useState<"local" | "ai">("local");

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
  }, []);

  const aiReady = data.settings.consent.ai && status?.ai.configured;
  const reports = data.aiReports.filter((r) => r.month === month);

  async function callAi(mode: "report" | "question") {
    setLoading(mode);
    setError(null);
    try {
      const r = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, mode, question: mode === "question" ? question : undefined, facts: buildFactSheet(data, now) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (mode === "report") await upsert("aiReports", { id: uid("ai"), month, createdAt: new Date().toISOString(), provider: j.provider, model: j.model, content: j.content });
      else setAiAnswer(j.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  const sevTone = { critical: "critical", warning: "warn", info: "info", positive: "good" } as const;

  return (
    <>
      <PageHeader
        title="Financial Intelligence"
        description="Dein persönlicher Finanzanalyst. Die Analyse basiert ausschließlich auf gespeicherten Daten – fehlende Daten werden als fehlend gekennzeichnet, nichts wird erfunden."
        actions={
          <Button onClick={() => exportMonthPdf(data, buildMonthReport(data, month), nextMonthTasks(data, now), reports[0]?.content)}>
            <FileDown size={15} /> Bericht als PDF
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Analyse & Hinweise" subtitle={`${insights.length} Erkenntnisse · Stand ${now.toLocaleDateString("de-DE")}`}>
          <div className="grid gap-2 md:grid-cols-2">
            {insights.map((i) => (
              <Alert key={i.id} tone={sevTone[i.severity]} title={i.title}>
                {i.detail}
                {i.action ? `\n→ ${i.action}` : ""}
              </Alert>
            ))}
          </div>
        </Card>

        <Card title="Frag deinen Analysten" subtitle="Antworten werden lokal aus deinen Daten berechnet">
          <div className="flex flex-col gap-1.5">
            {QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => setAnswers((a) => [answerQuestion(q, data, now), ...a.filter((x) => x.question !== q)])}
                className="rounded-xl border border-border px-3 py-2 text-left text-xs hover:border-accent hover:text-accent"
              >
                {q}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {answers.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {answers.map((a) => (
            <Card key={a.question} title={a.question} subtitle={`Grundlage: ${a.basis}`}>
              <p className="whitespace-pre-line text-sm">{a.answer}</p>
              {a.missing && (
                <p className="mt-2 text-xs text-warn">
                  <b>Fehlende Daten:</b> {a.missing}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-4" title={`Monatsbericht ${monthLabel(month, true)}`} action={<Tabs value={tab} onChange={setTab} options={[{ value: "local", label: "Regelbasiert" }, { value: "ai", label: "KI-Analyse" }]} />}>
        {tab === "local" ? (
          <LocalMonthReport month={month} />
        ) : (
          <div className="space-y-4">
            {!data.settings.consent.ai ? (
              <Alert tone="info" title="KI-Analyse ist deaktiviert">
                Für einen KI-Bericht wird ein aggregiertes Faktenblatt (keine Einzeltransaktionen, keine Kontonummern) an den konfigurierten KI-Provider gesendet. Aktiviere das unter <Link className="text-accent" href="/integrations">Integrationen</Link>.
              </Alert>
            ) : !status?.ai.configured ? (
              <Alert tone="warn" title="Kein KI-Provider konfiguriert">
                Setze in <code>.env.local</code>: AI_PROVIDER=anthropic und ANTHROPIC_API_KEY=… und starte den Server neu. Der Schlüssel bleibt auf dem Server.
              </Alert>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" disabled={!aiReady || !!loading} onClick={() => callAi("report")}>
                {loading === "report" ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} KI-Monatsbericht erstellen
              </Button>
              {status?.ai.configured && <Badge>{status.ai.provider} · {status.ai.model}</Badge>}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Eigene Frage an die KI, z. B. „Soll ich den Sparplan erhöhen?“" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} />
              <Button disabled={!aiReady || !question.trim() || !!loading} onClick={() => callAi("question")}>
                {loading === "question" ? <Loader2 size={15} className="animate-spin" /> : "Fragen"}
              </Button>
            </div>
            {error && <Alert tone="critical" title="Fehler">{error}</Alert>}
            {aiAnswer && (
              <div className="rounded-xl border border-border p-4">
                <Markdown text={aiAnswer} />
              </div>
            )}
            {reports.map((r) => (
              <div key={r.id} className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted">
                  <span>
                    {new Date(r.createdAt).toLocaleString("de-DE")} · {r.provider} {r.model}
                  </span>
                  <button onClick={() => remove("aiReports", r.id)} aria-label="Bericht löschen" className="hover:text-critical">
                    <Trash2 size={14} />
                  </button>
                </div>
                <Markdown text={r.content} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
