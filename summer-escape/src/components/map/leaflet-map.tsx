"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

export interface MapPoint {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  match?: number;
  rank?: "top" | "wildcard";
  subtitle: string;
}

function icon(p: MapPoint, active: boolean) {
  const size = p.rank === "top" ? 30 : p.rank === "wildcard" ? 26 : active ? 22 : 16;
  const bg = p.rank === "top" ? "#123e5c" : p.rank === "wildcard" ? "#b89c6e" : p.match !== undefined ? scale(p.match) : "#1d5a82";
  const label = p.rank === "top" || p.rank === "wildcard" ? `<span style="font:600 10px/1 Manrope,sans-serif;color:#fbf8f2">${p.match ?? ""}</span>` : "";
  return L.divIcon({
    className: "",
    html: `<div class="se-marker" style="width:${size}px;height:${size}px;background:${bg};display:flex;align-items:center;justify-content:center;${active ? "outline:3px solid #eadfc8;" : ""}">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Match → colour (sand → sea). */
function scale(m: number) {
  if (m >= 85) return "#123e5c";
  if (m >= 75) return "#1d5a82";
  if (m >= 60) return "#7f8560";
  return "#c9b48e";
}

function FlyTo({ target }: { target: MapPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 6), { duration: 0.8 });
  }, [target, map]);
  return null;
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const key = points.map((p) => p.id).join(",");
  useEffect(() => {
    if (!points.length) return;
    const b = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b, { padding: [30, 30], maxZoom: 6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function LeafletMap({
  points,
  activeId,
  onSelect,
}: {
  points: MapPoint[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const active = useMemo(() => points.find((p) => p.id === activeId) ?? null, [points, activeId]);
  const ordered = useMemo(() => [...points].sort((a, b) => (a.rank ? 1 : 0) - (b.rank ? 1 : 0)), [points]);
  return (
    <MapContainer center={[38, 18]} zoom={4} minZoom={2} scrollWheelZoom={false} className="h-full w-full" worldCopyJump>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FitBounds points={points} />
      <FlyTo target={active} />
      {ordered.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon(p, p.id === activeId)} eventHandlers={{ click: () => onSelect(p.id) }}>
          <Popup>
            <strong style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{p.name}</strong>
            <br />
            <span style={{ fontSize: 12 }}>{p.country}</span>
            {p.match !== undefined && (
              <>
                <br />
                <span style={{ fontSize: 12 }}>Match: {p.match} %</span>
              </>
            )}
            <br />
            <span style={{ fontSize: 11, color: "#5b5650" }}>{p.subtitle}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
