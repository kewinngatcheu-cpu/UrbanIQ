import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/lib/demo";
import { computeCouple, computeIndividual, rankCouple } from "@/lib/engine/results";
import { buildProfile } from "@/lib/engine/profile";
import { scoreIndividual } from "@/lib/engine/score";
import { DESTINATION_BY_ID, DESTINATIONS } from "@/lib/destinations/data";
import { weatherScore, accessScore } from "@/lib/destinations/derived";

const P = (k: keyof typeof PERSONAS) => PERSONAS[k].answers;
const rankOf = (ids: string[], id: string) => ids.indexOf(id) + 1;

describe("Destination database", () => {
  it("contains at least 90 destinations incl. all required ones", () => {
    expect(DESTINATIONS.length).toBeGreaterThanOrEqual(90);
    const required = ["rhodes", "crete", "kos", "corfu", "zakynthos", "mykonos", "santorini", "lefkada", "chalkidiki", "paros", "ksamil", "saranda", "himare", "dhermi", "vlore", "budva", "becici", "kotor", "svetistefan", "dubrovnik", "split", "zadar", "hvar", "makarska", "brac", "sardinia", "olbia", "costasmeralda", "sicily", "apulia", "amalfi", "rimini", "mallorca", "alicante", "costablanca", "ibiza", "menorca", "malaga", "costadelsol", "nice", "cannes", "antibes", "sainttropez", "corsica", "antalya", "lara", "belek", "side", "alanya", "bodrum", "marmaris", "oludeniz", "dubaimarina", "jumeirah", "palmjumeirah", "rasalkhaimah", "abudhabi", "hurghada", "elgouna", "marsaalam", "sharm", "agadir", "taghazout", "essaouira", "marrakesh", "phuket", "krabi", "kohsamui", "kohphangan", "kohlanta", "pattaya", "langkawi", "penang", "perhentian", "redang", "shanghai", "sanya", "malta", "ayianapa", "paphos", "algarve", "madeira", "grancanaria", "tenerife", "nessebar", "sunnybeach", "hammamet", "djerba", "mauritius", "maldives"];
    for (const id of required) expect(DESTINATION_BY_ID[id], id).toBeDefined();
  });
  it("has unique ids, valid ratings and marks everything as estimated", () => {
    expect(new Set(DESTINATIONS.map((d) => d.id)).size).toBe(DESTINATIONS.length);
    for (const d of DESTINATIONS) {
      for (const v of Object.values(d.ratings)) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100);
      expect(d.cost[0]).toBeLessThan(d.cost[1]);
      expect(d.status.cost).toBe("estimated");
    }
  });
  it("August weather: Dubai heat and Andaman monsoon are penalised, Gulf of Thailand less", () => {
    expect(weatherScore(DESTINATION_BY_ID.dubaimarina).score).toBeLessThan(40);
    expect(weatherScore(DESTINATION_BY_ID.phuket).score).toBeLessThan(45);
    expect(weatherScore(DESTINATION_BY_ID.kohsamui).score).toBeGreaterThan(weatherScore(DESTINATION_BY_ID.phuket).score);
    expect(weatherScore(DESTINATION_BY_ID.rhodes).score).toBeGreaterThan(90);
  });
  it("Ksamil transfer is rated realistically (long)", () => {
    expect(accessScore(DESTINATION_BY_ID.ksamil)).toBeLessThan(accessScore(DESTINATION_BY_ID.corfu));
  });
});

describe("Scenarios 4–12", () => {
  it("4 · nearly identical answers → compatibility ≈ 100 and a strong top match", () => {
    const v = computeCouple(P("europeShortHaul"), P("europeShortHaul"));
    expect(v.compat.overall).toBe(100);
    expect(v.top3[0].match).toBeGreaterThan(85);
  });
  it("5 · very different answers → lower compatibility, top 3 still good for BOTH", () => {
    const a = buildProfile(P("romanticLuxury"));
    const b = buildProfile(P("livelyExplorer"));
    const v = computeCouple(P("romanticLuxury"), P("livelyExplorer"));
    expect(v.compat.overall).toBeLessThan(60);
    for (const c of v.top3) {
      const d = DESTINATION_BY_ID[c.id];
      expect(scoreIndividual(a, d).total).toBeGreaterThan(75);
      expect(scoreIndividual(b, d).total).toBeGreaterThan(75);
    }
  });
  it("6 · Europe vs long-haul: long-haul person sees a far destination, couple result respects the 'no long flights' dealbreaker", () => {
    const longHaul = computeIndividual(P("longHaulDreamer")).top3.map((c) => DESTINATION_BY_ID[c.id].continent);
    expect(longHaul.some((c) => c !== "Europa")).toBe(true);
    const couple = computeCouple(P("longHaulDreamer"), P("europeShortHaul"));
    expect(couple.top3.every((c) => DESTINATION_BY_ID[c.id].travel.flightH < 8)).toBe(true);
  });
  it("7 · luxury vs small budget: top 3 stay affordable, no 4.000 €+ destination wins", () => {
    const v = computeCouple(P("luxurySpender"), P("budgetSaver"));
    for (const c of v.top3) expect(c.cost[0]).toBeLessThanOrEqual(2500);
    expect(v.compat.budget).toBeLessThan(30);
  });
  it("8 · both prefer quiet beaches → calm, uncrowded places", () => {
    const v = computeCouple(P("quietBeach"), P("quietBeach"));
    for (const c of v.top3) expect(DESTINATION_BY_ID[c.id].ratings.crowding).toBeLessThanOrEqual(70);
    expect(v.shared).toContain("Away From the Crowds");
  });
  it("9 · both prefer a lively coastal town → lively, evening-strong places", () => {
    const v = computeCouple(P("livelyTown"), P("livelyTown"));
    for (const c of v.top3) expect(DESTINATION_BY_ID[c.id].ratings.evening).toBeGreaterThanOrEqual(80);
  });
  it("10 · great beach but bad August weather (Maldives, Phuket) does not win", () => {
    for (const [a, b] of [["longHaulDreamer", "longHaulDreamer"], ["quietBeach", "romanticLuxury"]] as const) {
      const ids = rankCouple(buildProfile(P(a)), buildProfile(P(b))).map((s) => s.id);
      expect(rankOf(ids, "maldives")).toBeGreaterThan(10);
      expect(rankOf(ids, "phuket")).toBeGreaterThan(10);
    }
  });
  it("11 · perfect fit but very long journey is penalised for short-haul preferences", () => {
    const p = buildProfile(P("europeShortHaul"));
    expect(scoreIndividual(p, DESTINATION_BY_ID.zanzibar).total).toBeLessThan(scoreIndividual(p, DESTINATION_BY_ID.crete).total - 15);
  });
  it("12 · over-budget destinations drop for a tight budget", () => {
    const p = buildProfile(P("budgetSaver"));
    expect(scoreIndividual(p, DESTINATION_BY_ID.sainttropez).budget).toBe(0);
    expect(scoreIndividual(p, DESTINATION_BY_ID.costasmeralda).total).toBeLessThan(scoreIndividual(p, DESTINATION_BY_ID.hammamet).total);
  });
  it("wildcard is never part of the top 3 and never a classic", () => {
    const v = computeCouple(P("romanticLuxury"), P("livelyExplorer"));
    expect(v.wildcard).not.toBeNull();
    expect(v.top3.map((c) => c.id)).not.toContain(v.wildcard!.id);
    expect(DESTINATION_BY_ID[v.wildcard!.id].classic).toBe(false);
  });
  it("shared view never contains raw answers", () => {
    const v = computeCouple({ ...P("romanticLuxury"), avoid: "GEHEIMER-TEXT" }, P("livelyExplorer"));
    expect(JSON.stringify(v)).not.toContain("GEHEIMER-TEXT");
    expect(JSON.stringify(v)).not.toMatch(/"vibes"|"musts"|"budget":"b/);
  });
});
