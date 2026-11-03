/**
 * ONE plan catalogue — DEFAULTS for two separate product worlds.
 * The owner can override prices, limits, features and availability (and add new plans)
 * in /admin/plans; those overrides live in the `plan_configs` table and are merged by
 * `lib/plans-store.ts`. Every gate in the app reads the merged catalogue server-side.
 * Safe to import from client and server (no secrets).
 */
export type World = "personal" | "business";
export const WORLDS: World[] = ["personal", "business"];

/** Known default ids. Custom plans created in admin can use other ids. */
export type PersonalPlanId = "free" | "premium" | "exclusive";
export type BusinessPlanId = "starter" | "growth" | "scale";
export type PlanId = string;

export type FeatureKey =
  // personal
  | "documentAnalysis" // AI analysis/summaries of uploaded documents, text recognition
  | "taskExtraction" // automatic task & deadline detection
  | "actionPlans" // AI action plans & drafts
  | "contextSearch" // AI answers grounded in stored data
  | "insights" // insights page
  | "recurringTasks"
  | "advancedSummaries"
  | "weeklyPlanning"
  | "proactiveSuggestions"
  | "priorityProcessing"
  // business
  | "projects"
  | "team" // invite members beyond the owner
  | "workflows" // recurring processes / workflow templates
  | "advancedAnalysis"
  | "automations"
  | "advancedPermissions"
  | "reporting"
  | "integrations"; // prepared — no integrations are live yet

export const PERSONAL_FEATURES: FeatureKey[] = ["documentAnalysis", "taskExtraction", "actionPlans", "contextSearch", "insights", "recurringTasks", "advancedSummaries", "weeklyPlanning", "proactiveSuggestions", "priorityProcessing", "integrations"];
export const BUSINESS_FEATURES: FeatureKey[] = ["documentAnalysis", "taskExtraction", "actionPlans", "contextSearch", "insights", "recurringTasks", "advancedSummaries", "projects", "team", "workflows", "advancedAnalysis", "automations", "advancedPermissions", "reporting", "priorityProcessing", "integrations"];

export interface PlanLimits {
  aiRequestsPerMonth: number;
  storageMb: number;
  maxFileMb: number;
  memories: number;
  activeActions: number;
  /** Business: seats incl. the owner. Personal plans: 1. */
  members: number;
  /** Business: active projects. */
  projects: number;
}
export const LIMIT_KEYS: (keyof PlanLimits)[] = ["aiRequestsPerMonth", "storageMb", "maxFileMb", "memories", "activeActions", "members", "projects"];

export interface Plan {
  id: PlanId;
  world: World;
  name: string;
  tagline: string;
  /** null = price not set yet (business plans until the owner configures them). */
  priceMonthlyEur: number | null;
  active: boolean;
  highlight?: boolean;
  sort: number;
  custom?: boolean;
  limits: PlanLimits;
  features: Partial<Record<FeatureKey, boolean>>;
  bullets: string[];
  aiEffort: "low" | "medium" | "high";
}

const all = (keys: FeatureKey[], on: FeatureKey[]) => Object.fromEntries(keys.map((k) => [k, on.includes(k)])) as Record<FeatureKey, boolean>;

export const DEFAULT_PLANS: Plan[] = [
  {
    id: "free", world: "personal", name: "Free", tagline: "Get to know ONE.", priceMonthlyEur: 0, active: true, sort: 1,
    limits: { aiRequestsPerMonth: 30, storageMb: 100, maxFileMb: 5, memories: 200, activeActions: 5, members: 1, projects: 5 },
    features: all(PERSONAL_FEATURES, ["actionPlans", "contextSearch", "insights"]),
    bullets: ["Personal dashboard", "Basic task management", "Limited saved information", "100 MB document storage", "Simple AI support — 30 requests / month", "Basic search"],
    aiEffort: "low",
  },
  {
    id: "premium", world: "personal", name: "Premium", tagline: "For regular personal use.", priceMonthlyEur: 14.99, active: true, sort: 2, highlight: true,
    limits: { aiRequestsPerMonth: 600, storageMb: 5_000, maxFileMb: 20, memories: 10_000, activeActions: 100, members: 1, projects: 50 },
    features: all(PERSONAL_FEATURES, ["documentAnalysis", "taskExtraction", "actionPlans", "contextSearch", "insights", "recurringTasks", "advancedSummaries", "weeklyPlanning"]),
    bullets: ["Everything in Free", "Advanced personal memory", "Advanced document analysis", "Smart deadline detection", "Automatic task suggestions", "Advanced reminders & weekly planning", "Context-aware AI · 600 requests / month", "5 GB storage"],
    aiEffort: "medium",
  },
  {
    id: "exclusive", world: "personal", name: "Exclusive", tagline: "Intensive use and automation.", priceMonthlyEur: 29.99, active: true, sort: 3,
    limits: { aiRequestsPerMonth: 3_000, storageMb: 50_000, maxFileMb: 25, memories: 100_000, activeActions: 1_000, members: 1, projects: 500 },
    features: all(PERSONAL_FEATURES, ["documentAnalysis", "taskExtraction", "actionPlans", "contextSearch", "insights", "recurringTasks", "advancedSummaries", "weeklyPlanning", "proactiveSuggestions", "priorityProcessing"]),
    bullets: ["Everything in Premium", "Advanced personal intelligence", "Proactive support", "Extended workflows & process guidance", "Priority processing · 3,000 AI requests / month", "50 GB storage", "Integrations (coming soon)"],
    aiEffort: "high",
  },
  {
    id: "starter", world: "business", name: "Business Starter", tagline: "For freelancers and small companies.", priceMonthlyEur: null, active: true, sort: 1,
    limits: { aiRequestsPerMonth: 1_000, storageMb: 20_000, maxFileMb: 25, memories: 20_000, activeActions: 200, members: 3, projects: 10 },
    features: all(BUSINESS_FEATURES, ["documentAnalysis", "taskExtraction", "actionPlans", "contextSearch", "insights", "recurringTasks", "projects", "workflows"]),
    bullets: ["Company dashboard", "Business memory & document management", "AI document analysis", "Task management & deadline detection", "Basic business workflows", "One company workspace", "Up to 3 users"],
    aiEffort: "medium",
  },
  {
    id: "growth", world: "business", name: "Business Growth", tagline: "For growing companies and teams.", priceMonthlyEur: null, active: true, sort: 2, highlight: true,
    limits: { aiRequestsPerMonth: 5_000, storageMb: 100_000, maxFileMb: 25, memories: 100_000, activeActions: 1_000, members: 15, projects: 100 },
    features: all(BUSINESS_FEATURES, ["documentAnalysis", "taskExtraction", "actionPlans", "contextSearch", "insights", "recurringTasks", "advancedSummaries", "projects", "team", "workflows", "advancedAnalysis", "automations"]),
    bullets: ["Everything in Starter", "Advanced project management", "Team features & task assignment", "Shared company knowledge base", "Advanced AI analysis", "Team workflows & automations", "Up to 15 users"],
    aiEffort: "medium",
  },
  {
    id: "scale", world: "business", name: "Business Scale", tagline: "For companies with extensive requirements.", priceMonthlyEur: null, active: true, sort: 3,
    limits: { aiRequestsPerMonth: 20_000, storageMb: 500_000, maxFileMb: 25, memories: 1_000_000, activeActions: 10_000, members: 100, projects: 1_000 },
    features: all(BUSINESS_FEATURES, BUSINESS_FEATURES),
    bullets: ["Everything in Growth", "Advanced processes & complex workflows", "Advanced team permissions", "Advanced reporting", "Configurable company areas", "Integrations (coming soon)", "Up to 100 users"],
    aiEffort: "high",
  },
];

/** Sync fallback map of the defaults (for places that can't await the store, e.g. client components given no catalogue). */
export const PLANS: Record<string, Plan> = Object.fromEntries(DEFAULT_PLANS.map((p) => [p.id, p]));

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  documentAnalysis: "Intelligent document analysis",
  taskExtraction: "Automatic task & deadline detection",
  actionPlans: "AI action plans",
  contextSearch: "Context-aware AI search",
  insights: "Personal insights",
  recurringTasks: "Recurring tasks",
  advancedSummaries: "Advanced summaries",
  weeklyPlanning: "Weekly planning",
  proactiveSuggestions: "Proactive support",
  priorityProcessing: "Priority processing",
  projects: "Project management",
  team: "Team members",
  workflows: "Business workflows",
  advancedAnalysis: "Advanced AI analysis",
  automations: "Automations",
  advancedPermissions: "Advanced team permissions",
  reporting: "Reporting",
  integrations: "Integrations (coming soon)",
};

export const LIMIT_LABELS: Record<keyof PlanLimits, string> = {
  aiRequestsPerMonth: "AI requests / month",
  storageMb: "Storage (MB)",
  maxFileMb: "Max file size (MB)",
  memories: "Saved items",
  activeActions: "Open actions",
  members: "Users",
  projects: "Projects",
};

export const DEFAULT_PLAN: Record<World, string> = { personal: "free", business: "starter" };

export function isWorld(v: unknown): v is World {
  return v === "personal" || v === "business";
}

/** Known default plan id check (sync). Use the store's `findPlan` for custom plans. */
export function isPlanId(v: unknown): v is PersonalPlanId {
  return v === "free" || v === "premium" || v === "exclusive";
}

export function formatPrice(eur: number | null, locale: "en" | "de" = "en"): string {
  if (eur === null) return locale === "de" ? "Preis folgt" : "Price coming soon";
  if (eur === 0) return "€0";
  return locale === "de" ? `${eur.toFixed(2).replace(".", ",")} €` : `€${eur.toFixed(2)}`;
}
