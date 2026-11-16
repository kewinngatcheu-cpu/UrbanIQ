import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { KewinDB, backupSchema, loadAll, replaceAll } from "./db";
import { initialData } from "./seed";

describe("Speicherung & Backup", () => {
  it("speichert und lädt alle Daten (bleibt nach Neustart erhalten)", async () => {
    const name = `t-${Math.random()}`;
    const data = initialData(new Date(2026, 10, 16));
    data.expenses.push({ id: "e1", amount: 12.5, category: "Lebensmittel", date: "2026-11-16", createdAt: new Date().toISOString() });
    await replaceAll(data, new KewinDB(name));
    const reopened = await loadAll(new KewinDB(name)); // neue Verbindung = App neu geöffnet
    expect(reopened?.expenses[0].amount).toBe(12.5);
    expect(reopened?.plan).toHaveLength(10);
  });
  it("Backup-Schema akzeptiert gültige und lehnt kaputte Daten ab", () => {
    const data = initialData(new Date(2026, 10, 16));
    expect(backupSchema.safeParse({ app: "kewin-finance", version: 1, exportedAt: "x", data }).success).toBe(true);
    expect(backupSchema.safeParse({ app: "kewin-finance", version: 1, exportedAt: "x", data: { ...data, expenses: [{ amount: -1 }] } }).success).toBe(false);
  });
});
