"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { AdminOverview } from "@/lib/server/service";

export function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-10 grid gap-4 rounded-[1.6rem] border border-line bg-white/60 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
        setBusy(false);
        if (r.ok) router.refresh();
        else setErr(r.status === 429 ? "Zu viele Versuche – bitte 15 Minuten warten." : "Passwort falsch.");
      }}
    >
      <label className="grid gap-2 text-sm">
        Admin-Passwort
        <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="rounded-xl border border-line bg-white px-4 py-3 text-base outline-none focus:border-sea" />
      </label>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <Button type="submit" disabled={busy || !pw}>
        Anmelden
      </Button>
    </form>
  );
}

type Link = { id: string; name: string; url: string };

export function AdminPanel({ initial }: { initial: AdminOverview }) {
  const router = useRouter();
  const [ov, setOv] = useState(initial);
  const [links, setLinks] = useState<Link[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const act = async (body: Record<string, string>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setMsg(r.status === 401 ? "Sitzung abgelaufen – bitte neu anmelden." : `Fehler: ${data.error ?? r.status}`);
      if (r.status === 401) router.refresh();
      return;
    }
    if (data.overview) setOv(data.overview);
    if (data.links) setLinks(data.links);
    setMsg("Erledigt.");
  };

  const copy = async (l: Link) => {
    try {
      await navigator.clipboard.writeText(l.url);
      setCopied(l.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  return (
    <div className="mt-10 grid gap-6">
      <section className="rounded-[1.6rem] border border-line bg-white/60 p-6">
        <p className="eyebrow text-sand-deep">Status</p>
        <div className="mt-3 grid gap-2 text-sm">
          <p>
            Umfrage: <strong>{ov.phase === "live" ? "Gestartet (live)" : "Nicht gestartet (Vorbereitung / Demo)"}</strong>
            {ov.startedAt && <span className="text-ink-soft"> · seit {new Date(ov.startedAt).toLocaleString("de-DE")}</span>}
          </p>
          <p>
            Gemeinsame Auswertung: <strong>{ov.sharedReady ? "freigeschaltet" : "noch nicht verfügbar"}</strong>
          </p>
          <p className="text-ink-soft">Speicher: {ov.storage === "supabase" ? "Supabase (PostgreSQL)" : "Lokale Datei (nur Entwicklung)"}</p>
          <p className="text-xs text-ink-soft">
            Aus Datenschutzgründen zeigt der Admin-Bereich bewusst keinen Fortschritt einzelner Personen und keine Antworten.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {ov.phase === "setup" ? (
            <Button disabled={busy} onClick={() => act({ action: "start" }, "Echte Umfrage jetzt starten? Die persönlichen Links werden damit aktiv.")}>
              Umfrage starten
            </Button>
          ) : (
            <Button variant="outline" disabled={busy} onClick={() => act({ action: "pause" }, "Umfrage pausieren? Bereits gespeicherte Antworten bleiben erhalten.")}>
              Umfrage pausieren
            </Button>
          )}
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              const c = window.prompt("Alle Antworten (Entwürfe und abgeschickte) unwiderruflich löschen? Zum Bestätigen RESET eingeben.");
              if (c === "RESET") act({ action: "resetAnswers", confirm: "RESET" });
            }}
          >
            Antworten zurücksetzen
          </Button>
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-line bg-white/60 p-6">
        <p className="eyebrow text-sand-deep">Zugangslinks</p>
        <p className="mt-2 text-xs text-ink-soft">
          Links werden nur als Hash gespeichert und deshalb nur direkt nach dem Erstellen angezeigt. Ein neuer Link macht den alten sofort
          ungültig – bereits gespeicherte Antworten bleiben erhalten.
        </p>
        <ul className="mt-4 grid gap-3">
          {ov.participants.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-mist px-4 py-3 text-sm">
              <span>
                <strong>{p.name}</strong>{" "}
                <span className="text-ink-soft">{p.hasLink ? `· Link erstellt ${p.linkCreatedAt ? new Date(p.linkCreatedAt).toLocaleString("de-DE") : ""}` : "· noch kein Link"}</span>
              </span>
              <button
                type="button"
                disabled={busy}
                className="text-xs font-semibold uppercase tracking-[0.16em] text-sea-deep underline-offset-4 hover:underline"
                onClick={() => act({ action: "regenerate", participant: p.id }, p.hasLink ? `Neuen Link für ${p.name} erstellen? Der bisherige Link funktioniert danach nicht mehr.` : undefined)}
              >
                {p.hasLink ? "Neu erstellen" : "Erstellen"}
              </button>
            </li>
          ))}
        </ul>
        {links.length > 0 && (
          <div className="mt-5 grid gap-3 rounded-2xl border border-sea/30 bg-sea-light/40 p-4">
            <p className="text-xs font-semibold">Neue Links – jetzt kopieren und jeweils nur an die richtige Person schicken:</p>
            {links.map((l) => (
              <div key={l.id} className="grid gap-1">
                <span className="text-xs font-semibold">{l.name}</span>
                <div className="flex gap-2">
                  <input readOnly value={l.url} className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" onClick={() => copy(l)} className="rounded-lg bg-sea-deep px-3 text-xs text-ivory">
                    {copied === l.id ? "✓" : "Kopieren"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {msg && <p className="text-sm text-ink-soft">{msg}</p>}

      <button
        type="button"
        className="justify-self-start text-xs uppercase tracking-[0.2em] text-ink-soft underline-offset-4 hover:underline"
        onClick={async () => {
          await fetch("/api/admin/logout", { method: "POST" });
          router.refresh();
        }}
      >
        Abmelden
      </button>
    </div>
  );
}
