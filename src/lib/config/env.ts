import "server-only";

/**
 * Central, server-only environment access.
 * Nothing in here may ever be imported into a client component.
 */
function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export type BackendMode = "local" | "supabase";
export type AiMode = "anthropic" | "demo";
export type BillingMode = "demo" | "stripe";

export const env = {
  appUrl: read("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  isProd: process.env.NODE_ENV === "production",

  // Backend selection
  get backend(): BackendMode {
    const forced = read("ONE_BACKEND");
    if (forced === "local" || forced === "supabase") return forced;
    return read("NEXT_PUBLIC_SUPABASE_URL") && read("NEXT_PUBLIC_SUPABASE_ANON_KEY") && read("SUPABASE_SERVICE_ROLE_KEY")
      ? "supabase"
      : "local";
  },
  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),

  // Local demo backend
  dataDir: read("ONE_DATA_DIR") ?? ".data",
  get sessionSecret(): string {
    const s = read("ONE_SESSION_SECRET");
    if (s && s.length >= 32) return s;
    if (process.env.NODE_ENV === "production" && read("ONE_BACKEND") !== "supabase" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("ONE_SESSION_SECRET (min. 32 chars) is required in production for the local backend.");
    }
    return "dev-only-insecure-session-secret-change-me-please-0000";
  },

  // Owner (server-side only — never exposed to the client)
  ownerUserId: read("ONE_OWNER_USER_ID"),

  // AI
  anthropicApiKey: read("ANTHROPIC_API_KEY"),
  aiModel: read("ONE_AI_MODEL") ?? "claude-opus-5-5",
  get aiMode(): AiMode {
    return read("ANTHROPIC_API_KEY") ? "anthropic" : "demo";
  },

  // Billing
  get billingMode(): BillingMode {
    return read("ONE_BILLING_MODE") === "stripe" ? "stripe" : "demo";
  },
  stripeSecretKey: read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
};
