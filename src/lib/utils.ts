import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Source } from "@/lib/db/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sourceHref(s: Pick<Source, "type" | "id">): string {
  switch (s.type) {
    case "memory": return `/app/memory/${s.id}`;
    case "action": return `/app/action/${s.id}`;
    case "task": return `/app/life?view=all#task-${s.id}`;
    case "document": return `/app/memory`;
  }
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", opts);
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function relativeTime(iso: string, now = Date.now()) {
  const diff = (Date.parse(iso) - now) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(iso);
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function parseTags(input: string): string[] {
  return [...new Set(input.split(/[,#\n]/).map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0 && t.length <= 32))].slice(0, 12);
}
