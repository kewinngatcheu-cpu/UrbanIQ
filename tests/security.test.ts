import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => { const p = path.join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

describe("security invariants", () => {
  it("every protected page calls requireOwner()", () => {
    const pages = walk("src/app/(app)").filter((f) => f.endsWith("page.tsx"));
    expect(pages.length).toBeGreaterThan(5);
    for (const p of pages) expect(readFileSync(p, "utf8"), p).toContain("await requireOwner()");
  });
  it("every API route goes through api() unless it is the health check", () => {
    const routes = walk("src/app/api").filter((f) => f.endsWith("route.ts") && !f.includes(`${path.sep}health${path.sep}`));
    for (const r of routes) {
      const src = readFileSync(r, "utf8");
      expect(src, r).toMatch(/= api(<[^>]+>)?\(/);
      expect(src.includes("{ public: true }") ? /auth/.test(r) : true, `${r} is public`).toBe(true);
    }
  });
  it("no secrets are referenced from client components", () => {
    const client = walk("src").filter((f) => /\.tsx?$/.test(f) && readFileSync(f, "utf8").startsWith('"use client"'));
    for (const f of client) expect(readFileSync(f, "utf8"), f).not.toMatch(/process\.env\.(ANTHROPIC|OPENAI|DATABASE|JARVIS_SETUP)/);
  });
});
