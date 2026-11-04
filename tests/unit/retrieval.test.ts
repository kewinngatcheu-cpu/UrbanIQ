import { test } from "node:test";
import assert from "node:assert/strict";
import { search, related, tokenize, findDate, heuristicTasks, extractiveSummary, type Doc } from "../../src/lib/ai/retrieval.ts";

const docs: Doc[] = [
  { type: "memory", id: "1", title: "Home insurance", text: "Allianz home insurance renews on 1 December. Policy number 4711.", tags: ["insurance", "home"] },
  { type: "memory", id: "2", title: "Gym contract", text: "FitLife membership can be cancelled until 15.11.2026.", tags: ["contracts"] },
  { type: "task", id: "3", title: "Pay electricity invoice", text: "Stadtwerke invoice due 20.11.2026" },
  { type: "memory", id: "4", title: "Rechnungen 2026", text: "Alle Rechnungen für die Wohnung", tags: ["home"] },
];

test("tokenize removes stopwords and stems EN/DE plurals", () => {
  assert.deepEqual(tokenize("What are my invoices?"), ["invoice"]);
  assert.ok(tokenize("Rechnungen").includes("rechnung"));
});

test("search ranks the relevant item first", () => {
  const r = search(docs, "When does my insurance renew?");
  assert.equal(r[0].doc.id, "1");
});

test("search finds German plural against singular", () => {
  assert.equal(search(docs, "rechnung")[0].doc.id, "4");
});

test("minCoverage prevents matches on a single generic word", () => {
  assert.ok(search(docs, "dentist phone number").length > 0, "lenient search matches 'number'");
  assert.equal(search(docs, "dentist phone number", 8, 0.5).length, 0, "strict search must not");
});

test("search returns nothing for empty or unknown queries", () => {
  assert.equal(search(docs, "").length, 0);
  assert.equal(search(docs, "volcano").length, 0);
});

test("related connects items by shared tags", () => {
  const r = related(docs[0], docs);
  assert.ok(r.some((x) => x.doc.id === "4"));
  assert.ok(!r.some((x) => x.doc.id === "1"), "never relates an item to itself");
});

test("findDate parses common EU/ISO/English formats", () => {
  const now = new Date("2026-03-01T12:00:00Z");
  assert.equal(findDate("due 2026-11-20", now), "2026-11-20");
  assert.equal(findDate("bis zum 15.11.2026", now), "2026-11-15");
  assert.equal(findDate("until 15.11.", now), "2026-11-15");
  assert.equal(findDate("on 1 December", now), "2026-12-01");
  assert.equal(findDate("by March 3rd, 2027", now), "2027-03-03");
  assert.equal(findDate("no date here", now), null);
});

test("heuristicTasks extracts checklist items and deadlines", () => {
  const t = heuristicTasks("Notes\n- Call the landlord\n- Pay the invoice by 30.11.2026\nThe weather was nice today.", new Date("2026-01-01"));
  assert.equal(t.length, 2);
  assert.equal(t[1].due, "2026-11-30");
  assert.equal(t[1].kind, "deadline");
});

test("extractiveSummary only uses sentences from the text", () => {
  const text = "ONE stores notes safely. It finds them again quickly when you search. The weather is irrelevant here, honestly. Documents can be summarised and connected to tasks. Users stay in control of every action.";
  const s = extractiveSummary(text, 2);
  for (const sentence of s.split(/(?<=[.!?])\s+/)) assert.ok(text.includes(sentence), `invented: ${sentence}`);
});
