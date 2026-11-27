import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore, _setStore } from "@/lib/server/store";
import { decryptJSON, encryptJSON, looksLikeToken } from "@/lib/server/crypto";
import * as svc from "@/lib/server/service";
import { PERSONAS } from "@/lib/demo";
import { sanitizeAnswers } from "@/lib/survey/answers";

let store: MemoryStore;
let tJ: string;
let tK: string;

beforeEach(async () => {
  store = new MemoryStore();
  _setStore(store);
  tJ = await svc.adminRegenerate("joanna");
  tK = await svc.adminRegenerate("kewin");
});

describe("crypto", () => {
  it("tokens are 256-bit url-safe and answers are encrypted at rest", async () => {
    expect(looksLikeToken(tJ)).toBe(true);
    const enc = encryptJSON({ a: 1 });
    expect(enc).not.toContain('"a"');
    expect(decryptJSON(enc)).toEqual({ a: 1 });
    await svc.adminSetPhase("live");
    await svc.saveDraft(tJ, { avoid: "privat" });
    const row = await store.getResponse("joanna");
    expect(row!.payload).not.toContain("privat");
    const parts = await store.listParticipants();
    expect(JSON.stringify(parts)).not.toContain(tJ);
  });
});

describe("survey lifecycle", () => {
  it("saving is blocked before the admin starts the survey", async () => {
    expect(await svc.saveDraft(tJ, { beach: "coves" })).toEqual({ ok: false, error: "not_live" });
  });
  it("invalid tokens are rejected", async () => {
    expect(await svc.getContext("x".repeat(43))).toBeNull();
    expect(await svc.getContext("short")).toBeNull();
  });
  it("1 · Joanna done, Kewin not → no shared result; 2 · inverse; 3 · both → shared result", async () => {
    await svc.adminSetPhase("live");
    expect((await svc.submit(tJ, PERSONAS.romanticLuxury.answers)).ok).toBe(true);
    expect((await svc.getContext(tJ))!.sharedReady).toBe(false);
    expect((await svc.getContext(tK))!.sharedReady).toBe(false);
    expect(await svc.getSharedResult(tJ)).toBeNull();
    expect(await svc.getSharedResult(tK)).toBeNull();
    expect(await svc.getIndividualResult(tK)).toBeNull(); // Kewin hasn't submitted
    expect(await svc.getIndividualResult(tJ)).not.toBeNull();

    expect((await svc.submit(tK, PERSONAS.livelyExplorer.answers)).ok).toBe(true);
    expect((await svc.getContext(tJ))!.sharedReady).toBe(true);
    const shared = await svc.getSharedResult(tK);
    expect(shared!.top3).toHaveLength(3);
  });
  it("drafts can be edited until submission, then they are locked", async () => {
    await svc.adminSetPhase("live");
    await svc.saveDraft(tJ, { beach: "coves" });
    await svc.saveDraft(tJ, { beach: "long" });
    expect((await svc.getOwnAnswers(tJ))!.beach).toBe("long");
    expect((await svc.submit(tJ, { beach: "long" })).ok).toBe(false); // incomplete
    await svc.submit(tJ, PERSONAS.quietBeach.answers);
    expect(await svc.saveDraft(tJ, { beach: "club" })).toEqual({ ok: false, error: "locked" });
    expect(await svc.submit(tJ, PERSONAS.quietBeach.answers)).toEqual({ ok: false, error: "locked" });
  });
  it("each person only ever reads their own answers", async () => {
    await svc.adminSetPhase("live");
    await svc.saveDraft(tJ, { avoid: "nur-joanna" });
    expect(JSON.stringify(await svc.getOwnAnswers(tK))).not.toContain("nur-joanna");
  });
  it("regenerating a link invalidates the old one but keeps answers", async () => {
    await svc.adminSetPhase("live");
    await svc.saveDraft(tJ, { beach: "coves" });
    const fresh = await svc.adminRegenerate("joanna");
    expect(await svc.getContext(tJ)).toBeNull();
    expect((await svc.getOwnAnswers(fresh))!.beach).toBe("coves");
  });
  it("admin overview exposes no per-person progress", async () => {
    const ov = await svc.adminOverview();
    expect(JSON.stringify(ov)).not.toMatch(/draft|submitted|status/);
  });
  it("reset removes all answers", async () => {
    await svc.adminSetPhase("live");
    await svc.submit(tJ, PERSONAS.quietBeach.answers);
    await svc.adminResetAnswers();
    expect((await svc.getContext(tJ))!.status).toBe("none");
  });
});

describe("answer sanitising", () => {
  it("drops unknown fields, invalid options and clamps values", () => {
    const a = sanitizeAnswers({ hack: 1, beach: "nope", vibes: ["luxury", "x", "relax", "beach"], exploration: 99, avoid: "a\u0000b", compromises: { c1: "a", c9: "b", c2: "z" } });
    expect(a).toEqual({ vibes: ["luxury", "relax"], exploration: 10, avoid: "ab", compromises: { c1: "a" } });
  });
});
