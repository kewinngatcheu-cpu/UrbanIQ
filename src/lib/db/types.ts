import type { PlanId } from "@/lib/config/plans";

export type Role = "user" | "owner";
export type AccountStatus = "active" | "suspended";

export interface Profile {
  id: string; // = auth user id
  email: string;
  full_name: string | null;
  role: Role;
  status: AccountStatus;
  plan: PlanId;
  email_verified: boolean;
  onboarding_completed: boolean;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "pending";
export type BillingProvider = "none" | "demo" | "stripe" | "admin_grant";

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  provider: BillingProvider;
  provider_ref: string | null;
  stripe_customer_id: string | null;
  cancel_at_period_end: boolean;
  price_monthly_eur: number;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  interests: string[];
  requested_plan: PlanId | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

export type MemoryKind = "note" | "idea" | "info" | "goal" | "document" | "image" | "voice";

export interface Memory {
  id: string;
  user_id: string;
  kind: MemoryKind;
  title: string;
  content: string;
  summary: string | null;
  summary_source: "ai" | "extractive" | null;
  tags: string[];
  category_id: string | null;
  document_id: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  extracted_text: string | null;
  extraction_status: "done" | "unsupported" | "failed" | "pending";
  /** How the text was obtained: file parser, or AI recognition (OCR / scanned PDF). */
  extraction_method: "parser" | "ai" | null;
  created_at: string;
  updated_at: string;
}

export type TaskKind = "task" | "appointment" | "deadline";
export type TaskStatus = "open" | "done";
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  user_id: string;
  kind: TaskKind;
  title: string;
  notes: string | null;
  due_at: string | null;
  priority: "low" | "normal" | "high";
  status: TaskStatus;
  recurrence: Recurrence;
  project_id: string | null;
  category_id: string | null;
  source_memory_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  remind_at: string;
  done: boolean;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  kind: "project" | "goal";
  name: string;
  description: string | null;
  color: string;
  status: "active" | "archived";
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export type ActionStatus = "new" | "in_progress" | "waiting" | "done";
export type ActionType =
  | "cancellation"
  | "complaint"
  | "understand_invoice"
  | "move"
  | "email"
  | "appointment"
  | "summarize"
  | "custom";

export interface ActionStep {
  text: string;
  done: boolean;
}

export interface ActionItem {
  id: string;
  user_id: string;
  type: ActionType;
  title: string;
  description: string | null;
  status: ActionStatus;
  steps: ActionStep[];
  draft: string | null;
  plan_source: "ai" | "template" | null;
  missing_info: string[];
  memory_id: string | null;
  external_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Source {
  type: "memory" | "task" | "action" | "document";
  id: string;
  title: string;
}

export interface AiConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  user_id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  mode: "ai" | "demo";
  created_at: string;
  updated_at: string;
}

export interface UsageRow {
  id: string;
  user_id: string;
  period: string; // YYYY-MM
  ai_requests: number;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  user_id: string | null;
  email: string | null;
  kind: "feedback" | "bug" | "idea";
  message: string;
  status: "new" | "reviewed" | "resolved";
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface BillingCheckout {
  id: string;
  user_id: string;
  plan: PlanId;
  provider: "demo" | "stripe";
  status: "pending" | "paid" | "expired" | "canceled";
  amount_eur: number;
  expires_at: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportAccessGrant {
  id: string;
  user_id: string;
  reason: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Processed payment-provider webhook events (idempotency). */
export interface BillingEvent {
  id: string; // provider event id
  type: string;
  created_at: string;
  updated_at: string;
}

/** Local-backend only: credentials & verification (Supabase Auth handles this in supabase mode). */
export interface LocalCredential {
  id: string; // = user id
  email: string;
  password_hash: string;
  verify_token_hash: string | null;
  verify_expires_at: string | null;
  reset_token_hash: string | null;
  reset_expires_at: string | null;
  /** Sessions issued before this instant are invalid (set on password change/reset). */
  password_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tables {
  profiles: Profile;
  subscriptions: Subscription;
  user_preferences: UserPreferences;
  memories: Memory;
  documents: DocumentRow;
  tasks: Task;
  reminders: Reminder;
  projects: Project;
  categories: Category;
  action_items: ActionItem;
  ai_conversations: AiConversation;
  ai_messages: AiMessage;
  usage_limits: UsageRow;
  feedback: Feedback;
  audit_logs: AuditLog;
  feature_flags: FeatureFlag;
  billing_checkouts: BillingCheckout;
  support_access_grants: SupportAccessGrant;
  local_credentials: LocalCredential;
  billing_events: BillingEvent;
}

export type TableName = keyof Tables;

/** Tables containing private, per-user content. Admins never read these by default. */
export const PRIVATE_TABLES = [
  "memories",
  "documents",
  "tasks",
  "reminders",
  "projects",
  "categories",
  "action_items",
  "ai_conversations",
  "ai_messages",
] as const satisfies readonly TableName[];

export type PrivateTable = (typeof PRIVATE_TABLES)[number];
