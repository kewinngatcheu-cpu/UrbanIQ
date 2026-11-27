"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui";

interface Section {
  status: "live" | "unavailable" | "error";
  source: string;
  fetchedAt?: string;
  message?: string;
  data?: Record<string, unknown>;
}
interface Live {
  climate: Section;
  advisory: Section;
  flights: Section;
  hotels: Section;
  transfers: Section;
}

function when(iso?: string) {
  return iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "";
}

function Row({ title, s, children }: { title: string; s: Section; children?: React.ReactNode }) {
  return (
    <div className="border-t border-line py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <StatusBadge status={s.status === "live" ? "live" : "unavailable"} />
      </div>
      {s.status === "live" ? children : <p className="mt-1 text-xs leading-relaxed text-ink-soft">{s.message}</p>}
      <p className="mt-1 text-[0.65rem] text-ink-soft/80">
        Quelle: {s.source}
        {s.fetchedAt && ` · abgefragt am ${when(s.fetchedAt)}`}
      </p>
    </div>
  );
}

/**
 * Optional live research. Strictly separated from the (estimated) destination
 * rating and budget: only real API responses are shown, with time stamp.
 * Demo mode (no token) explains the feature without calling any API.
 */
export function LivePanel({ destinationId, token }: { destinationId: string; token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<Live | null>(null);

  const load = async () => {
    if (!token) return;
    setState("loading");
    try {
      const r = await fetch(`/api/live/${destinationId}`, { headers: { "x-access-token": token }, cache: "no-store" });
      if (!r.ok) throw new Error();
      setData(await r.json());
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="rounded-[1.5rem] border border-dashed border-sand bg-mist/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-sand-deep">Live travel research</p>
          <p className="mt-1 text-xs text-ink-soft">Getrennt von Bewertung & Schätzung: nur echte, zeitgestempelte Daten.</p>
        </div>
        {state === "idle" && (
          <button
            type="button"
            onClick={load}
            disabled={!token}
            className="rounded-full border border-sea-deep px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sea-deep transition hover:bg-sea-deep hover:text-ivory disabled:opacity-40"
          >
            {token ? "Live abfragen" : "In der Demo deaktiviert"}
          </button>
        )}
        {state === "loading" && <span className="text-xs text-ink-soft">Recherchiert …</span>}
      </div>
      {state === "error" && <p className="mt-3 text-xs text-red-700">Live-Recherche gerade nicht erreichbar.</p>}
      {state === "done" && data && (
        <div className="mt-4">
          <Row title="Klimadaten August (historisch, 5 Jahre)" s={data.climate}>
            {data.climate.data && (
              <p className="mt-1 text-sm">
                Ø Max {String(data.climate.data.avgMax)} °C · Ø Min {String(data.climate.data.avgMin)} °C · ≈ {String(data.climate.data.rainDays)} Regentage (
                {String(data.climate.data.years)})
              </p>
            )}
          </Row>
          <Row title="Reisehinweise (Auswärtiges Amt)" s={data.advisory}>
            {data.advisory.data && (
              <p className="mt-1 text-sm">
                {data.advisory.data.warning
                  ? "⚠️ Reisewarnung"
                  : data.advisory.data.partialWarning
                    ? "⚠️ Teilreisewarnung"
                    : data.advisory.data.situationWarning
                      ? "Sicherheitshinweise beachten"
                      : "Keine Reisewarnung"}{" "}
                ·{" "}
                <a className="underline" href={String(data.advisory.data.url)} target="_blank" rel="noreferrer noopener">
                  Details
                </a>
              </p>
            )}
          </Row>
          <Row title="Flugpreise & Flugzeiten ab BER" s={data.flights} />
          <Row title="Hotels mit Pool & Preise" s={data.hotels} />
          <Row title="Transferzeiten" s={data.transfers} />
        </div>
      )}
    </div>
  );
}
