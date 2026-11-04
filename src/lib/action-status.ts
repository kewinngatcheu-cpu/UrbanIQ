import type { ActionStatus } from "@/lib/db/types";

/** The five action statuses, shared by ONE Personal and ONE Business. */
export const ACTION_STATUSES: { id: ActionStatus; label: string; dot: string; tone: "blue" | "lavender" | "peach" | "gray" | "mint" }[] = [
  { id: "new", label: "New", dot: "bg-primary", tone: "blue" },
  { id: "in_progress", label: "In progress", dot: "bg-lavender-ink", tone: "lavender" },
  { id: "waiting", label: "Waiting for you", dot: "bg-peach-ink", tone: "peach" },
  { id: "waiting_external", label: "Waiting for a reply", dot: "bg-muted", tone: "gray" },
  { id: "done", label: "Done", dot: "bg-mint-ink", tone: "mint" },
];
export const STATUS_IDS = ACTION_STATUSES.map((s) => s.id);
export const statusInfo = (s: ActionStatus) => ACTION_STATUSES.find((x) => x.id === s) ?? ACTION_STATUSES[0];
