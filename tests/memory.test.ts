import { beforeEach, describe, expect, it } from "vitest";
import { freshDb } from "./helpers";
import { createMemory, deleteMemory, getMemoryHistory, retrieveContext, searchMemories, updateMemory, exportAll } from "@/lib/memory/service";
import type { Db } from "@/lib/db";

let db: Db;
beforeEach(async () => { db = await freshDb(); });

describe("memory service", () => {
  it("creates a memory with embedding, version 1 and an audit entry", async () => {
    const r = await createMemory({ workspaceId: "personal", layer: "personal", title: "Lieblingssport", content: "Kewin trainiert dreimal pro Woche Krafttraining." }, "owner");
    expect(r.kind).toBe("created");
    if (r.kind !== "created") return;
    expect(r.memory.version).toBe(1);
    expect(r.memory.embedding_model).toBe("local-hash-v1");
    expect(await getMemoryHistory(r.memory.id)).toHaveLength(1);
    const audit = await db.query<{ action: string }>(`SELECT action FROM audit_log`);
    expect(audit.map((a) => a.action)).toContain("memory.create");
  });

  it("detects duplicates instead of storing the same fact twice", async () => {
    await createMemory({ workspaceId: "ngcx", layer: "business", title: "Zielmarkt", content: "NGCX fokussiert auf IT-Dienstleister und IT-Beratungen." }, "owner");
    const dup = await createMemory({ workspaceId: "ngcx", layer: "business", title: "Zielmarkt", content: "NGCX fokussiert auf IT-Dienstleister und IT-Beratungen!" }, "owner");
    expect(dup.kind).toBe("duplicate");
    const forced = await createMemory({ workspaceId: "ngcx", layer: "business", title: "Zielmarkt", content: "NGCX fokussiert auf IT-Dienstleister und IT-Beratungen!" }, "owner", { allowDuplicate: true });
    expect(forced.kind).toBe("created");
  });

  it("keeps a version history on updates and never silently overwrites", async () => {
    const r = await createMemory({ workspaceId: "personal", layer: "identity", title: "Alter", content: "Kewin ist 20 Jahre alt." }, "owner");
    if (r.kind !== "created") throw new Error();
    const u = await updateMemory(r.memory.id, { content: "Kewin ist 21 Jahre alt.", reason: "Geburtstag" }, "owner");
    expect(u.version).toBe(2);
    const h = await getMemoryHistory(r.memory.id);
    expect(h.map((x) => (x as { content: string }).content)).toEqual(["Kewin ist 21 Jahre alt.", "Kewin ist 20 Jahre alt."]);
    // Non-text change (pinning) does not create a version
    const p = await updateMemory(r.memory.id, { pinned: true }, "owner");
    expect(p.version).toBe(2);
  });

  it("finds memories via semantic/lexical search", async () => {
    await createMemory({ workspaceId: "personal", layer: "personal", title: "Fitnessziel", content: "Bis Juni 10 kg Muskelmasse aufbauen." }, "owner");
    await createMemory({ workspaceId: "personal", layer: "strategic", title: "Finanzziel", content: "10.000 Euro Nettoeinkommen pro Monat." }, "owner");
    const res = await searchMemories({ q: "Muskelaufbau Fitness" });
    expect(res[0].title).toBe("Fitnessziel");
  });

  it("isolates workspaces: NGCX context never contains VenturesX or private memories", async () => {
    await createMemory({ workspaceId: "personal", layer: "identity", title: "Name", content: "Kewin Ngatcheu aus Berlin.", pinned: true }, "owner");
    await createMemory({ workspaceId: "personal", layer: "personal", title: "Arzttermin", content: "Privater Arzttermin am Freitag." }, "owner");
    await createMemory({ workspaceId: "venturesx", layer: "business", title: "VX Preismodell", content: "VenturesX Preismodell: Abo 49 Euro." }, "owner");
    await createMemory({ workspaceId: "ngcx", layer: "business", title: "NGCX Preismodell", content: "NGCX Preismodell noch offen." }, "owner");
    const ctx = await retrieveContext("ngcx", "Preismodell Arzttermin Berlin", 20);
    const titles = ctx.map((m) => m.title);
    expect(titles).toContain("NGCX Preismodell");
    expect(titles).toContain("Name"); // owner identity is global
    expect(titles).not.toContain("VX Preismodell");
    expect(titles).not.toContain("Arzttermin");
  });

  it("includes explicitly shared memories and excludes proposed/outdated ones", async () => {
    const shared = await createMemory({ workspaceId: "venturesx", layer: "business", title: "Gemeinsamer Lead", content: "Lead Müller GmbH interessiert an beiden Ventures." }, "owner");
    if (shared.kind !== "created") throw new Error();
    await createMemory({ workspaceId: "ngcx", layer: "business", title: "Vorschlag", content: "Lead Müller GmbH unbestätigt.", status: "proposed" }, "jarvis");
    await createMemory({ workspaceId: "ngcx", layer: "business", title: "Alte Info", content: "Lead Müller GmbH abgesagt.", status: "outdated" }, "owner");
    let ctx = await retrieveContext("ngcx", "Lead Müller GmbH");
    expect(ctx.map((m) => m.title)).toEqual([]);
    await updateMemory(shared.memory.id, { sharedWith: ["ngcx"] }, "owner");
    ctx = await retrieveContext("ngcx", "Lead Müller GmbH");
    expect(ctx.map((m) => m.title)).toEqual(["Gemeinsamer Lead"]);
    const share = await db.query<{ action: string }>(`SELECT action FROM audit_log WHERE action = 'memory.share'`);
    expect(share).toHaveLength(1);
  });

  it("deletes memories with their history and exports everything", async () => {
    const r = await createMemory({ workspaceId: "personal", layer: "personal", title: "Temp", content: "Temporärer Eintrag." }, "owner");
    if (r.kind !== "created") throw new Error();
    await deleteMemory(r.memory.id, "owner");
    expect(await getMemoryHistory(r.memory.id)).toHaveLength(0);
    const ex = await exportAll();
    expect(ex.format).toBe("jarvis-export-v1");
    expect(ex.memories).toHaveLength(0);
    expect(JSON.stringify(ex)).not.toContain("embedding\":");
  });
});
