import { requireOwner } from "@/lib/auth/guard";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Brain, CheckCircle2, Clock, Radar, Sparkles } from "lucide-react";
import { getDb } from "@/lib/db";
import { listTasks, priorityScore, taskStats, completionsByDay } from "@/lib/tasks";
import { listWorkspaces } from "@/lib/workspaces";
import { providerStatus } from "@/lib/ai/registry";
import { listAudit } from "@/lib/audit";
import { buildBriefing } from "@/lib/myday";
import { fmtEUR } from "@/lib/time";
import { JarvisCore } from "@/components/JarvisCore";
import { LiveClock } from "@/components/LiveClock";

export const dynamic = "force-dynamic";

const PRIO_LABEL: Record<string, string> = { critical: "Kritisch", high: "Hoch", medium: "Mittel", low: "Niedrig" };
const PRIO_COLOR: Record<string, string> = { critical: "#EF4444", high: "#F59E0B", medium: "#258BFF", low: "#8D9AAF" };

export default async function CommandCenter() {
  const owner = await requireOwner();
  const db = await getDb();
  const [tasks, stats, days, workspaces, audit, brief] = await Promise.all([
    listTasks({ status: "open" }), taskStats(), completionsByDay(14), listWorkspaces(), listAudit(6), buildBriefing(),
  ]);
  const memCounts = await db.query<{ workspace_id: string; active: number; proposed: number }>(
    `SELECT workspace_id, count(*) FILTER (WHERE status IN ('active','uncertain'))::int AS active, count(*) FILTER (WHERE status = 'proposed')::int AS proposed
     FROM memories GROUP BY workspace_id`);
  const memBy = new Map(memCounts.map((m) => [m.workspace_id, m]));
  const proposals = memCounts.reduce((s, m) => s + m.proposed, 0);
  const reviewDue = (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM memories WHERE status = 'active' AND review_at < now()`))[0].n;
  const providers = providerStatus();
  const aiReady = providers.some((p) => p.configured);

  const now = new Date();
  const top3 = [...tasks].sort((a, b) => priorityScore(b, now) - priorityScore(a, now)).slice(0, 3);
  const stalled = tasks.filter((t) => t.postponed_count >= 3);
  const hour = Number(now.toLocaleString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", hour12: false }));
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const dateStr = now.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const maxDay = Math.max(1, ...days.map((d) => d.n));
  const business = workspaces.filter((w) => w.kind === "business");

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 opacity-25 sm:right-6 sm:top-1/2 sm:-translate-y-1/2 sm:opacity-100">
          <JarvisCore size={190} state="idle" />
        </div>
        <div className="relative max-w-xl">
          <div className="label">{dateStr} · <LiveClock /> Berlin</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {greeting}, <span className="gradient-text">{owner.display_name}</span>.
          </h1>
          <p className="mt-3 text-[15px] text-muted">
            {stats.open === 0
              ? "Keine offenen Aufgaben erfasst. Lege deine Prioritäten an, damit ich sie für dich ordnen kann."
              : `${stats.open} offene Aufgabe${stats.open === 1 ? "" : "n"}${stats.overdue ? `, davon ${stats.overdue} überfällig` : ""}${stats.due_today ? `, ${stats.due_today} heute fällig` : ""}.`}
            {stalled.length > 0 && ` ${stalled.length} Aufgabe(n) wurden mehrfach verschoben – das braucht eine Entscheidung.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/chat" className="btn btn-primary"><Sparkles size={16} /> Mit JARVIS sprechen</Link>
            <Link href="/my-day" className="btn btn-ghost">Daily Briefing</Link>
          </div>
        </div>
      </section>

      {/* Personal OS strip – every value links to its module */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/discipline" className="card card-hover p-4">
          <div className="label">Gewohnheiten heute</div>
          <div className="mt-1 text-xl font-semibold">{brief.personal.habitsTotal ? `${brief.personal.habitsDone}/${brief.personal.habitsTotal}` : "–"}</div>
          <div className="text-xs text-muted">{brief.personal.habitsTotal ? "erledigt" : "noch keine angelegt"}</div>
        </Link>
        <Link href="/discipline" className="card card-hover p-4">
          <div className="label">Fokus</div>
          <div className="mt-1 text-xl font-semibold">{brief.personal.focusMinToday} Min.</div>
          <div className="text-xs text-muted">{brief.personal.focusMinWeek} Min. diese Woche</div>
        </Link>
        <Link href="/finance" className="card card-hover p-4">
          <div className="label">Noch verfügbar</div>
          <div className={`mt-1 text-xl font-semibold ${brief.finance && brief.finance.available < 0 ? "text-err" : ""}`}>{brief.finance ? fmtEUR(brief.finance.available) : "–"}</div>
          <div className="text-xs text-muted">{brief.finance ? `${fmtEUR(brief.finance.perDay)}/Tag${brief.finance.warnings.length ? ` · ${brief.finance.warnings.length} Warnung(en)` : ""}` : "keine Buchungen"}</div>
        </Link>
        <Link href="/university" className="card card-hover p-4">
          <div className="label">Nächste Prüfung</div>
          {brief.university.exams[0] ? (
            <><div className="mt-1 truncate text-xl font-semibold">{brief.university.exams[0].name}</div>
              <div className={`text-xs ${brief.university.exams[0].daysLeft <= 14 ? "text-warn" : "text-muted"}`}>in {brief.university.exams[0].daysLeft} Tagen</div></>
          ) : <><div className="mt-1 text-xl font-semibold">–</div><div className="text-xs text-muted">keine in 60 Tagen</div></>}
        </Link>
      </section>

      {brief.risks.length > 0 && (
        <section className="card border-warn/25 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium"><AlertTriangle size={16} className="text-warn" /> Risiken</div>
          <ul className="space-y-1 text-sm text-muted">{brief.risks.slice(0, 4).map((r, i) => <li key={i}>· {r}</li>)}</ul>
        </section>
      )}

      {!aiReady && (
        <div className="card flex items-start gap-3 border-warn/30 p-4 text-sm">
          <AlertTriangle className="mt-0.5 shrink-0 text-warn" size={18} />
          <div>
            <div className="font-medium">KI-Kern nicht verbunden</div>
            <div className="text-muted">Kein API-Key gesetzt. Gedächtnis, Aufgaben und Befehle (<code>/merke</code>, <code>/aufgabe</code>) funktionieren; für Analysen <code>ANTHROPIC_API_KEY</code> in <code>.env.local</code> setzen. <Link className="text-cyan underline" href="/settings">Details</Link></div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Priorities */}
        <section className="card min-w-0 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div><div className="label">Heute</div><h2 className="text-lg font-medium">Drei wichtigste Prioritäten</h2></div>
            <span className="chip hidden sm:inline-flex" title="Score = Priorität + Fälligkeit + Business-Bezug + Verschiebungen">regelbasiert</span>
          </div>
          {top3.length === 0 ? (
            <p className="text-sm text-muted">Noch keine Aufgaben. Tipp: Im Chat <code>/aufgabe NGCX Interviewleitfaden fertigstellen !hoch</code>.</p>
          ) : (
            <ol className="space-y-2.5">
              {top3.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl bg-ink-900/70 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue/15 text-sm font-semibold text-cyan">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px]">{t.title}</div>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted">
                      <span style={{ color: PRIO_COLOR[t.priority] }}>● {PRIO_LABEL[t.priority]}</span>
                      <span>{workspaces.find((w) => w.id === t.workspace_id)?.name ?? t.workspace_id}</span>
                      {t.due_at && <span className={new Date(t.due_at) < now ? "text-err" : ""}><Clock size={11} className="mr-0.5 inline" />{new Date(t.due_at).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}</span>}
                      {t.postponed_count > 0 && <span className="text-warn">{t.postponed_count}× verschoben</span>}
                    </div>
                  </div>
                  <span className="text-xs tabular-nums text-muted">{priorityScore(t, now)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Performance */}
        <section className="card min-w-0 p-5">
          <div className="label">Performance</div>
          <h2 className="text-lg font-medium">Erledigt · 14 Tage</h2>
          <div className="mt-4 flex h-24 items-end gap-1" role="img" aria-label="Erledigte Aufgaben pro Tag">
            {days.map((d) => (
              <div key={d.day} className="flex-1 rounded-t bg-gradient-to-t from-blue/40 to-cyan/80" title={`${d.day}: ${d.n}`}
                style={{ height: `${Math.max(4, (d.n / maxDay) * 100)}%`, opacity: d.n ? 1 : 0.25 }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Woche" value={stats.done_week} />
            <Stat label="Offen" value={stats.open} />
            <Stat label="Überfällig" value={stats.overdue} warn={stats.overdue > 0} />
          </div>
        </section>
      </div>

      {/* Business */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Business Portfolio</h2>
          <Link href="/business" className="text-sm text-muted hover:text-cyan">Alle Ventures →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {business.map((w) => {
            const open = tasks.filter((t) => t.workspace_id === w.id).length;
            const phase = (w.profile as { phase?: string }).phase;
            return (
              <Link key={w.id} href={`/business/${w.id}`} className="card card-hover block p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: w.color }} /><span className="font-medium">{w.name}</span></div>
                  <ArrowUpRight size={16} className="text-muted" />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{w.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="chip">{phase ?? "Phase offen"}</span>
                  <span className="chip">{open} offene Aufgaben</span>
                  <span className="chip">{memBy.get(w.id)?.active ?? 0} Wissenseinträge</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5">
          <div className="flex items-center gap-2"><Brain size={16} className="text-cyan" /><h2 className="font-medium">Gedächtnis</h2></div>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Aktive Einträge" value={memCounts.reduce((s, m) => s + m.active, 0)} />
            <Row label="Vorschläge zur Prüfung" value={proposals} highlight={proposals > 0} />
            <Row label="Überprüfung fällig" value={reviewDue} highlight={reviewDue > 0} />
          </div>
          <Link href="/memory" className="mt-4 inline-block text-sm text-cyan">Memory Center →</Link>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2"><Radar size={16} className="text-cyan" /><h2 className="font-medium">Intelligence</h2></div>
          <p className="mt-3 text-sm text-muted">
            Der Research Radar (Phase 3) liefert News nur mit Quelle und Datum. Bis dahin zeigt JARVIS hier bewusst nichts an – keine erfundenen Meldungen.
          </p>
          {stalled.length > 0 && (
            <div className="mt-3 rounded-lg border border-warn/30 bg-warn/5 p-3 text-sm">
              <div className="font-medium text-warn">Hinweis</div>
              {stalled.slice(0, 2).map((t) => <div key={t.id} className="text-muted">„{t.title}“ – {t.postponed_count}× verschoben. Kleineren nächsten Schritt definieren?</div>)}
            </div>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-cyan" /><h2 className="font-medium">Letzte Aktivität</h2></div>
          <ul className="mt-3 space-y-2 text-sm">
            {audit.length === 0 && <li className="text-muted">Noch keine Aktivität.</li>}
            {(audit as { id: number; actor: string; action: string; status: string; at: string }[]).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span className="truncate"><span className="text-muted">{a.actor}</span> · {a.action}</span>
                <span className={`shrink-0 text-xs ${a.status === "failed" ? "text-err" : "text-muted"}`}>
                  {new Date(a.at).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/agents" className="mt-4 inline-block text-sm text-cyan">Aktivitätsprotokoll →</Link>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-ink-900/70 py-2">
      <div className={`text-xl font-semibold tabular-nums ${warn ? "text-err" : ""}`}>{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
function Row({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return <div className="flex justify-between"><span className="text-muted">{label}</span><span className={`tabular-nums ${highlight ? "text-warn" : ""}`}>{value}</span></div>;
}
