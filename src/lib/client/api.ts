"use client";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: unknown) { super(message); }
}

export async function apiFetch<T = unknown>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? `Fehler ${res.status}`, data);
  return data as T;
}

export const fmtDate = (d: string | null | undefined, withTime = false) =>
  d ? new Date(d).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}) }) : "–";

export const PRIORITY_LABEL: Record<string, string> = { critical: "Kritisch", high: "Hoch", medium: "Mittel", low: "Niedrig" };
export const PRIORITY_COLOR: Record<string, string> = { critical: "#EF4444", high: "#F59E0B", medium: "#258BFF", low: "#8D9AAF" };
export const LAYER_LABEL: Record<string, string> = {
  identity: "Identität", personal: "Persönliches Leben", business: "Business", project: "Projekt",
  conversational: "Gespräch", strategic: "Strategie", operational: "Operativ",
};
export const STATUS_LABEL: Record<string, string> = { active: "Aktiv", proposed: "Vorschlag", uncertain: "Unsicher", outdated: "Veraltet", archived: "Archiviert" };
