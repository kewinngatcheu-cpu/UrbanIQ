"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Mic, MicOff, Repeat, Square, Sunrise, Volume2, VolumeX } from "lucide-react";
import { JarvisCore, CORE_LABEL, type CoreState } from "@/components/JarvisCore";
import { Listener, Speaker, loadVoiceConfig, browserSttSupported, micSupported, type VoiceConfig } from "@/lib/client/voiceEngine";
import { SentenceStream } from "@/lib/voice/speechText";

type Ws = { id: string; name: string; color: string };
type Line = { role: "user" | "jarvis"; text: string; error?: boolean; actions?: string[] };

const HINTS = ["„Guten Morgen, JARVIS.“", "„Was soll ich heute priorisieren?“", "„Merke dir, dass …“", "„Neue Aufgabe: …“", "„Wie viel kann ich diesen Monat ausgeben?“", "„Starte Fokus für 50 Minuten.“"];

export function VoiceClient({ ownerName, workspaces }: { ownerName: string; workspaces: Ws[] }) {
  const [cfg, setCfg] = useState<VoiceConfig | null>(null);
  const cfgRef = useRef<VoiceConfig | null>(null);
  const [phase, setPhase] = useState<CoreState>("idle");
  const [level, setLevel] = useState(0);
  const [interim, setInterim] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [workspaceId, setWorkspaceId] = useState("personal");
  const [convId, setConvId] = useState<string | null>(null);
  const [handsFree, setHandsFree] = useState(false);
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const speaker = useRef<Speaker | null>(null);
  const listener = useRef<Listener | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handsFreeRef = useRef(false);
  const mutedRef = useRef(false);
  const turnRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    speaker.current = new Speaker(() => cfgRef.current);
    listener.current = new Listener(() => cfgRef.current);
    speaker.current.onError = (m) => setNotice(m);
    listener.current.onLevel = (l) => setLevel(l);
    listener.current.onInterim = (t) => setInterim(t);
    loadVoiceConfig().then((c) => { cfgRef.current = c; setCfg(c); }).catch((e) => setNotice(e.message));
    try {
      setHandsFree((handsFreeRef.current = localStorage.getItem("jarvis.handsfree") === "1"));
      setMuted((mutedRef.current = localStorage.getItem("jarvis.voice.muted") === "1"));
    } catch { /* storage unavailable */ }
    return () => { speaker.current?.stop(); listener.current?.cancel(); abortRef.current?.abort(); };
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [lines, interim]);

  const ask = useCallback(async (text: string) => {
    const turn = ++turnRef.current;
    setLines((l) => [...l, { role: "user", text }, { role: "jarvis", text: "" }]);
    setPhase("thinking");
    setNotice(null);
    const patch = (fn: (l: Line) => Line) => setLines((ls) => [...ls.slice(0, -1), fn(ls[ls.length - 1])]);
    const splitter = new SentenceStream(50);
    const say = (chunks: string[]) => { if (!mutedRef.current) chunks.forEach((c) => speaker.current?.enqueue(c)); };
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let failed = false;
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ conversationId: convId, workspaceId, message: text, mode: "voice" }) });
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({ error: `Fehler ${res.status}` }))).error);
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
          if (ev.type === "conversation") setConvId(ev.id);
          else if (ev.type === "delta") { patch((l) => ({ ...l, text: l.text + ev.text })); say(splitter.push(ev.text)); }
          else if (ev.type === "action") patch((l) => ({ ...l, actions: [...(l.actions ?? []), `${ev.status === "succeeded" ? "✓" : "✗"} ${ev.action}`] }));
          else if (ev.type === "error") { failed = true; patch((l) => ({ ...l, error: true, text: (l.text ? l.text + " " : "") + ev.message })); say([ev.message]); }
        }
      }
      say(splitter.flush());
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      failed = true;
      patch((l) => ({ ...l, error: true, text: (e as Error).message }));
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
    if (turn !== turnRef.current) return; // interrupted by a newer turn
    if (!mutedRef.current && speaker.current?.speaking) setPhase("speaking");
    await speaker.current?.whenIdle();
    if (turn !== turnRef.current) return;
    setPhase(failed ? "error" : "idle");
    if (handsFreeRef.current && !failed) void listen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId, workspaceId]);

  const listen = useCallback(async () => {
    if (!listener.current || listener.current.active) return;
    turnRef.current++;
    abortRef.current?.abort();
    speaker.current?.stop();
    setInterim("");
    setNotice(null);
    setPhase("listening");
    const r = await listener.current.listen();
    setInterim("");
    if ("text" in r) return void ask(r.text);
    if ("error" in r) { setNotice(r.error); setPhase("error"); return; }
    setPhase("idle"); // nothing heard → stop the hands-free loop instead of listening forever
  }, [ask]);

  /** Single primary control: tap to talk, tap again to finish; while JARVIS thinks/speaks, tap interrupts and listens. */
  function primary() {
    speaker.current?.unlock();
    if (listener.current?.active) return listener.current.stop();
    void listen();
  }
  function stopAll() {
    turnRef.current++;
    abortRef.current?.abort();
    speaker.current?.stop();
    listener.current?.cancel();
    setPhase("idle");
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); primary(); }
      if (e.code === "Escape") stopAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggleHandsFree = () => { const v = !handsFree; setHandsFree(v); handsFreeRef.current = v; try { localStorage.setItem("jarvis.handsfree", v ? "1" : "0"); } catch {} };
  const toggleMute = () => { const v = !muted; setMuted(v); mutedRef.current = v; if (v) speaker.current?.stop(); try { localStorage.setItem("jarvis.voice.muted", v ? "1" : "0"); } catch {} };
  const [canListen, setCanListen] = useState(true);
  useEffect(() => { setCanListen(micSupported() || browserSttSupported()); }, []);
  const ws = workspaces.find((w) => w.id === workspaceId);

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100dvh-57px)] flex-col sm:-mx-6 lg:-mx-10 lg:-my-9 lg:min-h-dvh">
      <header className="flex flex-wrap items-center gap-2 px-4 pt-4 sm:px-6">
        <div className="mr-auto">
          <div className="label">Voice</div>
          <div className="text-xs text-muted">
            Stimme: {cfg?.tts.label ?? "…"} · Erkennung: {cfg?.stt.label ?? "…"}
            {cfg?.tts.provider === "browser" && <> · <Link href="/settings" className="text-cyan">bessere Stimme einrichten</Link></>}
          </div>
        </div>
        <select className="input !w-auto !py-1.5 text-sm" value={workspaceId} onChange={(e) => { setWorkspaceId(e.target.value); setConvId(null); setLines([]); }} aria-label="Workspace">
          {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button onClick={toggleHandsFree} className={`btn !px-2.5 ${handsFree ? "btn-primary" : "btn-ghost"}`} aria-pressed={handsFree} title="Freihändig: nach jeder Antwort automatisch weiter zuhören" aria-label="Freihändiger Modus"><Repeat size={16} /></button>
        <button onClick={toggleMute} className="btn btn-ghost !px-2.5" aria-pressed={muted} aria-label={muted ? "Ton an" : "Stumm"} title={muted ? "Ton an" : "Nur Text, keine Sprachausgabe"}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
        <button onClick={() => setShowKeyboard((v) => !v)} className="btn btn-ghost !px-2.5" aria-label="Tastatur"><Keyboard size={16} /></button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
        <button onClick={primary} disabled={!canListen && !showKeyboard} aria-label={phase === "listening" ? "Aufnahme beenden" : "Mit JARVIS sprechen"}
          className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-electric">
          <JarvisCore size={260} state={phase} level={phase === "listening" ? level : 0} />
        </button>
        <div className="mt-2 text-sm font-medium tracking-[.2em] text-cyan">{CORE_LABEL[phase].toUpperCase()}</div>
        <div className="mt-1 min-h-[1.5rem] max-w-xl text-center text-[15px] text-muted">
          {interim ? `„${interim}“` : phase === "idle" && lines.length === 0 ? `Tippe auf JARVIS oder drücke die Leertaste, ${ownerName}.` : ""}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button onClick={primary} disabled={!canListen} className={`btn ${phase === "listening" ? "btn-ghost" : "btn-primary"} !px-5 !py-2.5`}>
            {phase === "listening" ? <><MicOff size={16} /> Fertig</> : <><Mic size={16} /> Sprechen</>}
          </button>
          {(phase === "thinking" || phase === "speaking" || phase === "listening") && <button onClick={stopAll} className="btn btn-ghost !py-2.5"><Square size={14} /> Stopp</button>}
          {phase === "idle" && lines.length === 0 && <button onClick={() => { speaker.current?.unlock(); void ask("Guten Morgen, JARVIS."); }} className="btn btn-ghost !py-2.5"><Sunrise size={16} /> Briefing anhören</button>}
        </div>
        {!canListen && <p className="mt-3 text-sm text-warn">Dieser Browser bietet keinen Mikrofonzugriff. Nutze die Tastatur – JARVIS antwortet trotzdem mit Stimme.</p>}
        {notice && <p className="mt-3 max-w-xl text-center text-sm text-warn">{notice}</p>}
        {showKeyboard && (
          <form className="mt-4 flex w-full max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { speaker.current?.unlock(); void ask(typed.trim()); setTyped(""); } }}>
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Tippen statt sprechen – Antwort kommt gesprochen" aria-label="Nachricht an JARVIS (Sprachmodus)" autoFocus />
            <button className="btn btn-primary">Senden</button>
          </form>
        )}
        {lines.length === 0 && (
          <div className="mt-8 flex max-w-2xl flex-wrap justify-center gap-2">{HINTS.map((h) => <span key={h} className="chip">{h}</span>)}</div>
        )}
      </div>

      {lines.length > 0 && (
        <div ref={scrollRef} className="mx-auto mb-4 max-h-[34vh] w-full max-w-2xl space-y-3 overflow-y-auto px-4">
          {lines.map((l, i) => (
            <div key={i} className={l.role === "user" ? "text-right" : ""}>
              <div className={`inline-block max-w-[90%] rounded-2xl px-4 py-2 text-left text-[15px] ${l.role === "user" ? "bg-blue/20" : l.error ? "text-err" : "bg-ink-800/80"}`}>
                {l.text || <span className="text-muted">…</span>}
                {l.actions && <div className="mt-1 text-[11px] text-muted">{l.actions.join(" · ")}</div>}
              </div>
            </div>
          ))}
          {convId && <div className="text-center text-[11px] text-muted">Gespeichert als Unterhaltung im Workspace {ws?.name} · <Link href={`/chat?ws=${workspaceId}`} className="text-cyan">im Chat öffnen</Link></div>}
        </div>
      )}
      <p className="pb-3 text-center text-[11px] text-muted" style={{ paddingBottom: "max(.75rem, env(safe-area-inset-bottom))" }}>
        Leertaste: sprechen / unterbrechen · Esc: stopp · Das Mikrofon ist nur aktiv, solange JARVIS zuhört.
      </p>
    </div>
  );
}
