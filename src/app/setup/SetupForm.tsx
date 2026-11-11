"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/client/api";

export function SetupForm({ tokenConfigured }: { tokenConfigured: boolean }) {
  const [token, setToken] = useState("");
  const [name, setName] = useState("Kewin");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!tokenConfigured)
    return <p className="text-sm text-warn">JARVIS_SETUP_TOKEN fehlt. Führe im Projektordner <code>npm run setup</code> aus und starte den Server neu.</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setError("Passwörter stimmen nicht überein.");
    setBusy(true); setError(null);
    try {
      await apiFetch("/api/auth/setup", { body: { token, displayName: name, password: pw } });
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <input className="input" placeholder="Setup-Token (aus .env.local)" value={token} onChange={(e) => setToken(e.target.value)} aria-label="Setup-Token" />
      <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
      <input className="input" type="password" autoComplete="new-password" placeholder="Passwort (min. 12 Zeichen, Buchstaben + Ziffern)" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Passwort" />
      <input className="input" type="password" autoComplete="new-password" placeholder="Passwort wiederholen" value={pw2} onChange={(e) => setPw2(e.target.value)} aria-label="Passwort wiederholen" />
      {error && <div className="text-sm text-err">{error}</div>}
      <button className="btn btn-primary w-full justify-center" disabled={busy || !token || !pw}>{busy ? "Richte ein…" : "JARVIS einrichten"}</button>
    </form>
  );
}
