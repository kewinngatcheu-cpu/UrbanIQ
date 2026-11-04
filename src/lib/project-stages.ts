/** Project stages in ONE Business (shared by server and client components). */
export const STAGES = [["planned", "Planned"], ["active", "Active"], ["on_hold", "On hold"], ["done", "Done"]] as const;
export const stageLabel = (s: string | null | undefined) => (STAGES.find(([v]) => v === (s ?? "active")) ?? STAGES[1])[1];
