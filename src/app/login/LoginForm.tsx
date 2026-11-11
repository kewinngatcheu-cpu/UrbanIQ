"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/client/api";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await apiFetch("/api/auth/login", { body: { password } });
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <input className="input" type="password" autoComplete="current-password" placeholder="Passwort" value={password}
        onChange={(e) => setPassword(e.target.value)} autoFocus aria-label="Passwort" />
      {error && <div className="text-sm text-err">{error}</div>}
      <button className="btn btn-primary w-full justify-center" disabled={busy || !password}>{busy ? "Prüfe…" : "Anmelden"}</button>
    </form>
  );
}
