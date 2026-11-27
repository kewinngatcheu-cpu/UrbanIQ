import "server-only";
import { computeCouple, computeIndividual, type CoupleView, type IndividualView } from "../engine/results";
import { missingQuestions, sanitizeAnswers, type Answers } from "../survey/answers";
import { decryptJSON, encryptJSON, generateToken, hashToken, looksLikeToken } from "./crypto";
import { getStore, PARTICIPANTS, type ParticipantId, type Phase } from "./store";

/**
 * Application service – the ONLY place that combines access control, storage
 * and the engine. Every function that takes a token resolves it server-side;
 * a participant can only ever read and write their own answers, and the shared
 * result is computed exclusively when both have submitted.
 */

export interface ParticipantContext {
  id: ParticipantId;
  name: string;
  phase: Phase;
  status: "none" | "draft" | "submitted";
  sharedReady: boolean;
}

async function resolve(token: string) {
  if (!looksLikeToken(token)) return null;
  return getStore().findParticipantByTokenHash(hashToken(token));
}

async function isSharedReady(): Promise<boolean> {
  const store = getStore();
  const rows = await Promise.all(PARTICIPANTS.map((p) => store.getResponse(p.id)));
  return rows.every((r) => r?.status === "submitted");
}

export async function getContext(token: string): Promise<ParticipantContext | null> {
  const p = await resolve(token);
  if (!p) return null;
  const store = getStore();
  const [settings, resp, sharedReady] = await Promise.all([store.getSettings(), store.getResponse(p.id), isSharedReady()]);
  return { id: p.id, name: p.name, phase: settings.phase, status: resp?.status ?? "none", sharedReady };
}

/** The participant's OWN answers (decrypted) – used to resume the survey. */
export async function getOwnAnswers(token: string): Promise<Answers | null> {
  const p = await resolve(token);
  if (!p) return null;
  const resp = await getStore().getResponse(p.id);
  if (!resp) return {};
  try {
    return sanitizeAnswers(decryptJSON(resp.payload));
  } catch {
    return {};
  }
}

export type SaveResult =
  | { ok: true; missing: string[] }
  | { ok: false; error: "not_found" | "not_live" | "locked" | "incomplete"; missing?: string[] };

export async function saveDraft(token: string, raw: unknown): Promise<SaveResult> {
  const p = await resolve(token);
  if (!p) return { ok: false, error: "not_found" };
  const store = getStore();
  if ((await store.getSettings()).phase !== "live") return { ok: false, error: "not_live" };
  const answers = sanitizeAnswers(raw);
  const ok = await store.saveDraft(p.id, encryptJSON(answers));
  if (!ok) return { ok: false, error: "locked" };
  return { ok: true, missing: missingQuestions(answers) };
}

export async function submit(token: string, raw: unknown): Promise<SaveResult> {
  const p = await resolve(token);
  if (!p) return { ok: false, error: "not_found" };
  const store = getStore();
  if ((await store.getSettings()).phase !== "live") return { ok: false, error: "not_live" };
  const answers = sanitizeAnswers(raw);
  const missing = missingQuestions(answers);
  if (missing.length) return { ok: false, error: "incomplete", missing };
  const ok = await store.submit(p.id, encryptJSON(answers));
  if (!ok) return { ok: false, error: "locked" };
  return { ok: true, missing: [] };
}

/** Private travel profile – only the caller's own ranking, only after submitting. */
export async function getIndividualResult(token: string): Promise<IndividualView | null> {
  const p = await resolve(token);
  if (!p) return null;
  const resp = await getStore().getResponse(p.id);
  if (resp?.status !== "submitted") return null;
  return computeIndividual(sanitizeAnswers(decryptJSON(resp.payload)));
}

/** Shared result – aggregated only, and only when BOTH have submitted. */
export async function getSharedResult(token: string): Promise<CoupleView | null> {
  const p = await resolve(token);
  if (!p) return null;
  const store = getStore();
  const [ra, rb] = await Promise.all(PARTICIPANTS.map((x) => store.getResponse(x.id)));
  if (ra?.status !== "submitted" || rb?.status !== "submitted") return null;
  return computeCouple(sanitizeAnswers(decryptJSON(ra.payload)), sanitizeAnswers(decryptJSON(rb.payload)));
}

/* ───────────────────────── admin ───────────────────────── */

export interface AdminOverview {
  phase: Phase;
  startedAt: string | null;
  storage: "supabase" | "file" | "memory";
  participants: { id: ParticipantId; name: string; hasLink: boolean; linkCreatedAt: string | null }[];
  /** Deliberately no per-person progress – only whether the shared result is unlocked. */
  sharedReady: boolean;
}

export async function adminOverview(): Promise<AdminOverview> {
  const store = getStore();
  const [settings, parts, sharedReady] = await Promise.all([store.getSettings(), store.listParticipants(), isSharedReady()]);
  return {
    phase: settings.phase,
    startedAt: settings.startedAt,
    storage: store.kind,
    participants: parts.map((p) => ({ id: p.id, name: p.name, hasLink: !!p.tokenHash, linkCreatedAt: p.tokenCreatedAt })),
    sharedReady,
  };
}

export async function adminSetPhase(phase: Phase) {
  await getStore().setPhase(phase);
}

export async function adminResetAnswers() {
  await getStore().deleteAllResponses();
}

/** Creates a fresh access token. The plain token is returned ONCE and never stored. */
export async function adminRegenerate(id: ParticipantId): Promise<string> {
  const token = generateToken();
  await getStore().setTokenHash(id, hashToken(token));
  return token;
}
