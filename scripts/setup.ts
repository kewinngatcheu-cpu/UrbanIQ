/**
 * Local setup: creates .env.local with a random setup token (never overwrites existing values).
 * Usage: npm run setup
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";

const file = ".env.local";
if (!existsSync(file)) copyFileSync(".env.example", file);
let env = readFileSync(file, "utf8");
const m = env.match(/^JARVIS_SETUP_TOKEN=(.*)$/m);
let token = m?.[1]?.trim();
if (!token) {
  token = randomBytes(18).toString("base64url");
  env = m ? env.replace(/^JARVIS_SETUP_TOKEN=.*$/m, `JARVIS_SETUP_TOKEN=${token}`) : env + `\nJARVIS_SETUP_TOKEN=${token}\n`;
  writeFileSync(file, env, { mode: 0o600 });
}
console.log(`\n  JARVIS setup\n  ────────────\n  .env.local ready.\n  Setup token: ${token}\n\n  1. Optional: add ANTHROPIC_API_KEY to .env.local\n  2. npm run dev\n  3. Open http://localhost:3000/setup and enter the token\n`);
