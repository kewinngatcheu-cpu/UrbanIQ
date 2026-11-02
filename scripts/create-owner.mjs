#!/usr/bin/env node
/**
 * Creates (or promotes) the OWNER account for the LOCAL backend.
 *
 *   npm run owner:create -- --email you@example.com --password "a-strong-password"
 *
 * Prints the user id. Put it into .env.local as ONE_OWNER_USER_ID and restart the server.
 * Owner rights require BOTH: role 'owner' in the database AND the id in ONE_OWNER_USER_ID.
 * For Supabase, see README → "Admin / owner setup" (SQL, no script needed).
 */
import { randomBytes, randomUUID, scrypt as _scrypt } from "node:crypto";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";

const scrypt = promisify(_scrypt);
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []));
const email = String(args.email ?? "").trim().toLowerCase();
const password = String(args.password ?? "");
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 10 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
  console.error("Usage: npm run owner:create -- --email you@example.com --password <min 10 chars, letters + numbers>");
  process.exit(1);
}

const dataDir = process.env.ONE_DATA_DIR || ".data";
const file = path.resolve(process.cwd(), dataDir, "one-db.json");
let db = {};
try { db = JSON.parse(await fs.readFile(file, "utf8")); } catch (e) { if (e.code !== "ENOENT") throw e; }
for (const t of ["local_credentials", "profiles", "subscriptions", "user_preferences", "audit_logs"]) db[t] ??= [];

const now = new Date().toISOString();
const salt = randomBytes(16);
const hash = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const passwordHash = `scrypt$16384$8$1$${salt.toString("base64")}$${hash.toString("base64")}`;

let cred = db.local_credentials.find((c) => c.email === email);
if (cred) {
  Object.assign(cred, { password_hash: passwordHash, verify_token_hash: null, verify_expires_at: null, updated_at: now });
} else {
  cred = { id: randomUUID(), email, password_hash: passwordHash, verify_token_hash: null, verify_expires_at: null, created_at: now, updated_at: now };
  db.local_credentials.push(cred);
}
const id = cred.id;
let profile = db.profiles.find((p) => p.id === id);
if (profile) Object.assign(profile, { role: "owner", status: "active", email_verified: true, updated_at: now });
else {
  profile = { id, email, full_name: "Owner", role: "owner", status: "active", plan: "exclusive", email_verified: true, onboarding_completed: true, last_active_at: null, created_at: now, updated_at: now };
  db.profiles.push(profile);
}
if (!db.subscriptions.some((s) => s.user_id === id)) {
  db.subscriptions.push({ id: randomUUID(), user_id: id, plan: profile.plan, status: "active", provider: "admin_grant", provider_ref: null, price_monthly_eur: 0, current_period_end: null, canceled_at: null, created_at: now, updated_at: now });
}
if (!db.user_preferences.some((s) => s.user_id === id)) {
  db.user_preferences.push({ id: randomUUID(), user_id: id, interests: [], requested_plan: null, timezone: null, created_at: now, updated_at: now });
}
db.audit_logs.push({ id: randomUUID(), actor_id: null, action: "system.owner_bootstrapped", target_type: "user", target_id: id, details: { via: "scripts/create-owner.mjs" }, created_at: now, updated_at: now });

await fs.mkdir(path.dirname(file), { recursive: true });
await fs.writeFile(file + ".tmp", JSON.stringify(db));
await fs.rename(file + ".tmp", file);
console.log(`\n✔ Owner account ready: ${email}\n\n  Add this line to .env.local and restart the server:\n\n  ONE_OWNER_USER_ID=${id}\n`);
console.log("  Note: if the dev server is running, restart it so it reloads the data file.\n");
