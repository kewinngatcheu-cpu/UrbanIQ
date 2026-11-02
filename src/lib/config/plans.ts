/**
 * ONE membership plans — the single source of truth for prices, limits and features.
 * Safe to import from client and server (contains no secrets).
 * Change prices / limits here; every gate in the app reads from this file.
 */
export type PlanId = "free" | "premium" | "exclusive";

export const PLAN_ORDER: PlanId[] = ["free", "premium", "exclusive"];

export type FeatureKey =
  | "documentAnalysis" // AI summary / analysis of uploaded documents
  | "taskExtraction" // automatic detection of tasks & deadlines
  | "actionPlans" // AI-generated action plans & drafts
  | "contextSearch" // AI answers grounded in your memory (RAG)
  | "insights" // personal insights on Intelligence page
  | "recurringTasks"
  | "advancedSummaries"
  | "priorityProcessing";

export interface PlanLimits {
  aiRequestsPerMonth: number;
  storageMb: number;
  maxFileMb: number;
  memories: number;
  activeActions: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthlyEur: number;
  highlight?: boolean;
  limits: PlanLimits;
  features: Record<FeatureKey, boolean>;
  bullets: string[];
  /** AI effort level used for this plan (higher = deeper reasoning). */
  aiEffort: "low" | "medium" | "high";
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Get to know ONE.",
    priceMonthlyEur: 0,
    limits: { aiRequestsPerMonth: 30, storageMb: 100, maxFileMb: 5, memories: 200, activeActions: 5 },
    features: {
      documentAnalysis: false,
      taskExtraction: false,
      actionPlans: true,
      contextSearch: true,
      insights: true,
      recurringTasks: false,
      advancedSummaries: false,
      priorityProcessing: false,
    },
    bullets: [
      "Personal dashboard",
      "Ask ONE — 30 AI requests / month",
      "Notes, ideas & personal memory",
      "100 MB document storage",
      "Tasks, reminders & projects",
      "Basic AI search",
    ],
    aiEffort: "low",
  },
  premium: {
    id: "premium",
    name: "Premium",
    tagline: "Your daily personal assistant.",
    priceMonthlyEur: 12.99,
    highlight: true,
    limits: { aiRequestsPerMonth: 600, storageMb: 5_000, maxFileMb: 20, memories: 10_000, activeActions: 100 },
    features: {
      documentAnalysis: true,
      taskExtraction: true,
      actionPlans: true,
      contextSearch: true,
      insights: true,
      recurringTasks: true,
      advancedSummaries: true,
      priorityProcessing: false,
    },
    bullets: [
      "Everything in Free",
      "600 AI requests / month",
      "5 GB document storage",
      "Intelligent document analysis",
      "Automatic task & deadline detection",
      "Recurring tasks & advanced organisation",
      "Personal action suggestions",
    ],
    aiEffort: "medium",
  },
  exclusive: {
    id: "exclusive",
    name: "Exclusive",
    tagline: "The complete ONE experience.",
    priceMonthlyEur: 27.99,
    limits: { aiRequestsPerMonth: 3_000, storageMb: 50_000, maxFileMb: 25, memories: 100_000, activeActions: 1_000 },
    features: {
      documentAnalysis: true,
      taskExtraction: true,
      actionPlans: true,
      contextSearch: true,
      insights: true,
      recurringTasks: true,
      advancedSummaries: true,
      priorityProcessing: true,
    },
    bullets: [
      "Everything in Premium",
      "3,000 AI requests / month",
      "50 GB storage",
      "Deeper AI reasoning & priority processing",
      "Extended personal context analysis",
      "Early access to new features & integrations",
    ],
    aiEffort: "high",
  },
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  documentAnalysis: "Intelligent document analysis",
  taskExtraction: "Automatic task & deadline detection",
  actionPlans: "AI action plans",
  contextSearch: "Context-aware AI search",
  insights: "Personal insights",
  recurringTasks: "Recurring tasks",
  advancedSummaries: "Advanced summaries",
  priorityProcessing: "Priority processing",
};

export function isPlanId(v: unknown): v is PlanId {
  return v === "free" || v === "premium" || v === "exclusive";
}

/** Lowest plan that includes a feature (used for upgrade prompts). */
export function minPlanFor(feature: FeatureKey): PlanId {
  return PLAN_ORDER.find((p) => PLANS[p].features[feature]) ?? "exclusive";
}

export function formatPrice(eur: number): string {
  if (eur === 0) return "€0";
  return `€${eur.toFixed(2)}`;
}
