import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { WealthDB, loadAll, replaceAll } from "./index";
import { backupSchema } from "./schema";
import { demoData } from "../seed";

describe("Datenbank & Backup", () => {
  it("speichert und lädt den kompletten Datenbestand", async () => {
    const d = new WealthDB("test-" + Math.random());
    const data = demoData(new Date(2026, 10, 16));
    await replaceAll(data, d);
    const loaded = await loadAll(d);
    expect(loaded?.transactions.length).toBe(data.transactions.length);
    expect(loaded?.recurring.length).toBe(10);
    expect(loaded?.settings.demoMode).toBe(true);
  });
  it("Backup-Format validiert Demo-Daten", () => {
    const data = demoData(new Date(2026, 10, 16));
    const res = backupSchema.safeParse({ app: "wealth-os", version: 1, exportedAt: new Date().toISOString(), data });
    expect(res.success).toBe(true);
  });
  it("lehnt manipulierte Backups ab", () => {
    const data = demoData(new Date(2026, 10, 16));
    const bad = { app: "wealth-os", version: 1, exportedAt: "", data: { ...data, transactions: [{ id: 1 }] } };
    expect(backupSchema.safeParse(bad).success).toBe(false);
  });
});
