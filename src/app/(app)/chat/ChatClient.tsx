"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Brain, Mic, MicOff, Paperclip, Plus, Send, Square, Trash2, Volume2, VolumeX, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { JarvisCore, CORE_LABEL, type CoreState } from "@/components/JarvisCore";
import { Markdown } from "@/components/Markdown";
import { useVoice } from "./useVoice";

type Ws = { id: string; name: string; color: string };
type Msg = { id?: string; role: "user" | "assistant"; content: string; model?: string | null; provider?: string | null; error?: boolean;
  context?: { id: string; title: string; layer: string; status: string }[]; actions?: { action: string; status: string; detail?: string }[];
  proposals?: { id: string; title: string; status: string }[] };
type Conv = { id: string; title: string; updated_at: string; message_count: number };
type ProviderInfo = { id: string; label: string; configured: boolean; defaultModel: string };

const STARTERS = [
  "Was sollte ich heute priorisieren?",
  "Analysiere den aktuellen Stand von NGCX.",
  "Ich habe 90 Minuten. Woran sollte ich arbeiten?",
  "Erstelle eine strategische Roadmap für die nächsten 30 Tage.",
];

export function ChatClient({ workspaces }: { workspaces: Ws[] }) {
  const [workspaceId, setWorkspaceId] = useState("personal");
  const [convs, setConvs] = useState<Conv[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<CoreState>("idle");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [speakReplies, setSpeakReplies] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(t: string) => void>(() => {});

  const voice = useVoice(useCallback((t: string) => sendRef.current(t), []));

  const loadConvs = useCallback(async (ws: string) => {
    const r = await apiFetch<{ conversations: Conv[] }>(`/api/conversations?workspace=${encodeURIComponent(ws)}`);
    setConvs(r.conversations);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ws = params.get("ws");
    if (ws && workspaces.some((w) => w.id === ws)) setWorkspaceId(ws);
    try { setSpeakReplies(localStorage.getItem("jarvis.speak") === "1"); } catch {}
    apiFetch<{ providers: ProviderInfo[]; settings: { aiProvider: string; anthropicModel: string; openaiModel: string } }>("/api/settings").then((r) => {
      setProviders(r.providers);
      const p = r.providers.find((x) => x.id === r.settings.aiProvider && x.configured) ?? r.providers.find((x) => x.configured);
      setActiveModel(p ? (p.id === "anthropic" ? r.settings.anthropicModel : r.settings.openaiModel) : null);
    }).catch(() => {});
  }, [workspaces]);

  useEffect(() => { loadConvs(workspaceId).catch(() => {}); }, [workspaceId, loadConvs]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  async function openConv(id: string) {
    const r = await apiFetch<{ messages: (Msg & { metadata?: { memoryIds?: string[] } })[] }>(`/api/conversations/${id}`);
    setConvId(id);
    setMessages(r.messages.filter((m) => m.role !== ("system" as string)));
    setState("idle");
  }

  function newChat() { setConvId(null); setMessages([]); setState("idle"); }

  async function deleteConv(id: string) {
    if (!confirm("Diese Unterhaltung endgültig löschen?")) return;
    await apiFetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (id === convId) newChat();
    loadConvs(workspaceId);
  }

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || state === "thinking" || state === "executing") return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setState("thinking");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const patchLast = (fn: (m: Msg) => Msg) => setMessages((ms) => [...ms.slice(0, -1), fn(ms[ms.length - 1])]);
    let full = "";
    let failed = false;
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ conversationId: convId, workspaceId, message }),
      });
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `Fehler ${res.status}` }));
        throw new Error(err.error);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          switch (ev.type) {
            case "conversation": setConvId(ev.id); break;
            case "context": patchLast((m) => ({ ...m, context: ev.memories })); break;
            case "delta": full += ev.text; setState("executing"); patchLast((m) => ({ ...m, content: m.content + ev.text })); break;
            case "action": patchLast((m) => ({ ...m, actions: [...(m.actions ?? []), ev] })); break;
            case "done": patchLast((m) => ({ ...m, id: ev.messageId, model: ev.model, provider: ev.provider })); setState("completed"); break;
            case "memory_proposals": patchLast((m) => ({ ...m, proposals: ev.memories })); break;
            case "error": failed = true; patchLast((m) => ({ ...m, error: true, content: (m.content ? m.content + "\n\n" : "") + ev.message })); setState("error"); break;
          }
        }
      }
      if (!failed && speakReplies && full) voice.speak(full);
    } catch (e) {
      if ((e as Error).name === "AbortError") { patchLast((m) => ({ ...m, content: m.content + "\n\n_(abgebrochen)_" })); setState("idle"); }
      else { patchLast((m) => ({ ...m, error: true, content: (e as Error).message })); setState("error"); }
    } finally {
      abortRef.current = null;
      loadConvs(workspaceId).catch(() => {});
    }
  }, [convId, workspaceId, state, speakReplies, voice, loadConvs]);
  sendRef.current = send;

  const busy = state === "thinking" || state === "executing";
  const coreState: CoreState = voice.listening ? "listening" : state;
  const ws = workspaces.find((w) => w.id === workspaceId);
  const aiReady = providers.some((p) => p.configured);
  const lastContext = [...messages].reverse().find((m) => m.context)?.context;

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-57px)] sm:-mx-6 lg:-mx-10 lg:-my-9 lg:h-dvh">
      {/* History */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-600/40 bg-ink-900/40 md:flex">
        <div className="p-3"><button onClick={newChat} className="btn btn-ghost w-full justify-center"><Plus size={15} /> Neue Unterhaltung</button></div>
        <div className="label px-4 pb-2">Verlauf · {ws?.name}</div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {convs.length === 0 && <div className="px-2 text-sm text-muted">Noch keine Unterhaltungen.</div>}
          {convs.map((c) => (
            <div key={c.id} className={`group flex items-center rounded-lg ${c.id === convId ? "bg-blue/15" : "hover:bg-ink-700/50"}`}>
              <button onClick={() => openConv(c.id)} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-[13px]">
                <MessageSquare size={13} className="shrink-0 text-muted" /><span className="truncate">{c.title}</span>
              </button>
              <button aria-label="Löschen" onClick={() => deleteConv(c.id)} className="mr-1 hidden rounded p-1.5 text-muted hover:text-err group-hover:block"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-ink-600/40 px-4 py-3 sm:px-6">
          <JarvisCore size={38} state={coreState} />
          <div className="mr-auto min-w-0">
            <div className="text-sm font-medium">JARVIS AI</div>
            <div className="truncate text-xs text-muted">{CORE_LABEL[coreState]}{activeModel ? ` · ${activeModel}` : " · kein Modell verbunden"}</div>
          </div>
          <select className="input !w-auto max-w-[9.5rem] !py-1.5 text-sm" value={workspaceId} aria-label="Workspace"
            onChange={(e) => { setWorkspaceId(e.target.value); newChat(); }}>
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button onClick={newChat} className="btn btn-ghost !px-2.5 md:hidden" aria-label="Neue Unterhaltung"><Plus size={16} /></button>
          {voice.supported.tts && (
            <button className="btn btn-ghost !px-2.5" aria-label="Antworten vorlesen" title="Antworten vorlesen (Browser-Stimme)"
              onClick={() => { const v = !speakReplies; setSpeakReplies(v); try { localStorage.setItem("jarvis.speak", v ? "1" : "0"); } catch {} if (v) voice.unlock(); else voice.stopSpeaking(); }}>
              {speakReplies ? <Volume2 size={16} className="text-cyan" /> : <VolumeX size={16} />}
            </button>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center pt-6 text-center">
              <JarvisCore size={150} state={coreState} />
              <h2 className="mt-4 text-xl font-semibold">Woran arbeiten wir, Kewin?</h2>
              <p className="mt-1 text-sm text-muted">Workspace: <span style={{ color: ws?.color }}>{ws?.name}</span> · Gedächtnis dieses Workspaces + deine Identität werden genutzt.</p>
              {!aiReady && <p className="mt-3 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">Kein KI-Anbieter verbunden – nur Befehle verfügbar (<code>/hilfe</code>).</p>}
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="card card-hover p-3 text-left text-sm text-muted hover:text-fg">{s}</button>)}
                <button onClick={() => send("/hilfe")} className="card card-hover p-3 text-left text-sm text-muted hover:text-fg sm:col-span-2">/hilfe – Befehle für Gedächtnis und Aufgaben</button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                  {m.role === "user" ? (
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-blue/20 px-4 py-2.5 text-[15px]">{m.content}</div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="mt-1 shrink-0"><JarvisCore size={26} state={i === messages.length - 1 ? coreState : m.error ? "error" : "idle"} /></div>
                      <div className="min-w-0 flex-1">
                        {m.content ? (
                          <div className={m.error ? "text-err" : ""}><Markdown text={m.content} /></div>
                        ) : (
                          <div className="flex gap-1 py-2">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" style={{ animationDelay: `${d * 0.2}s` }} />)}</div>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {m.actions?.map((a, k) => (
                            <span key={k} className="chip" style={{ color: a.status === "succeeded" ? "#22C55E" : "#EF4444" }}>
                              {a.status === "succeeded" ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {a.action}{a.detail ? ` (${a.detail})` : ""}
                            </span>
                          ))}
                          {m.context && m.context.length > 0 && (
                            <details className="text-xs text-muted">
                              <summary className="chip cursor-pointer"><Brain size={11} /> {m.context.length} Erinnerungen genutzt</summary>
                              <ul className="mt-1.5 space-y-0.5 pl-1">{m.context.map((c) => <li key={c.id}>· {c.title} <span className="opacity-60">({c.layer}{c.status !== "active" ? `, ${c.status}` : ""})</span></li>)}</ul>
                            </details>
                          )}
                          {m.proposals && m.proposals.length > 0 && (
                            <Link href="/memory?status=proposed" className="chip !text-cyan"><Brain size={11} /> {m.proposals.length} neue Erinnerung(en) vorgeschlagen – prüfen</Link>
                          )}
                          {m.model && <span className="chip">{m.model}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-ink-600/40 px-4 py-3 sm:px-6" style={{ paddingBottom: "max(.75rem, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto max-w-3xl">
            {(voice.interim || voice.error) && <div className={`mb-2 text-sm ${voice.error ? "text-err" : "text-cyan"}`}>{voice.error ?? `„${voice.interim}“`}</div>}
            <div className="flex items-end gap-2 rounded-2xl border border-ink-600/60 bg-ink-900 p-2 focus-within:border-electric">
              <button className="rounded-lg p-2 text-muted/50" disabled title="Datei-Analyse folgt in Phase 3" aria-label="Anhang (Phase 3)"><Paperclip size={18} /></button>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder={voice.listening ? "Ich höre zu…" : "Nachricht an JARVIS…"}
                className="max-h-48 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] outline-none placeholder:text-muted/70"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }} aria-label="Nachricht" />
              {voice.supported.stt && (
                <button onClick={() => (voice.listening ? voice.stop() : voice.start())} disabled={busy}
                  className={`rounded-lg p-2 ${voice.listening ? "bg-cyan/20 text-cyan" : "text-muted hover:text-fg"}`}
                  aria-label={voice.listening ? "Aufnahme beenden" : "Sprechen (Push-to-Talk)"} title="Push-to-Talk (Deutsch)">
                  {voice.listening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
              {busy ? (
                <button onClick={() => abortRef.current?.abort()} className="btn btn-ghost !px-3" aria-label="Stopp"><Square size={15} /></button>
              ) : (
                <button onClick={() => send(input)} disabled={!input.trim()} className="btn btn-primary !px-3" aria-label="Senden"><Send size={15} /></button>
              )}
            </div>
            <div className="mt-1.5 truncate text-[11px] text-muted">{lastContext !== undefined ? `Kontext: ${lastContext.length} Erinnerungen · Workspace ${ws?.name} · andere Workspaces isoliert` : "Enter senden · Shift+Enter neue Zeile · /hilfe für Befehle"}</div>
          </div>
        </footer>
      </section>
    </div>
  );
}
