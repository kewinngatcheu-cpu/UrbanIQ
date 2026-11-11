"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/client/api";

export function ConnectorToggle({ id, enabled, disabled }: { id: string; enabled: boolean; disabled?: boolean }) {
  const [on, setOn] = useState(enabled);
  const [err, setErr] = useState<string | null>(null);
  async function toggle() {
    try { await apiFetch(`/api/integrations/${id}`, { method: "PATCH", body: { enabled: !on } }); setOn(!on); window.location.reload(); }
    catch (e) { setErr((e as Error).message); }
  }
  return (
    <div>
      <button className={`btn ${on ? "btn-ghost" : "btn-primary"} !py-1.5`} disabled={disabled} onClick={toggle}>{on ? "Deaktivieren" : "Aktivieren"}</button>
      {err && <div className="mt-1 text-xs text-err">{err}</div>}
    </div>
  );
}
