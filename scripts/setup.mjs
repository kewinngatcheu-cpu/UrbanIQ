#!/usr/bin/env node
/**
 * One-time local setup for ONE (local demo backend).
 *
 *   npm run setup                                   (asks for email + password)
 *   npm run setup -- --email you@x.com --password "..."   (non-interactive)
 *
 * - creates .env.local with a random session secret (keeps an existing file)
 * - creates YOUR owner/admin account and writes ONE_OWNER_USER_ID into .env.local
 * Afterwards: npm run dev  →  http://localhost:3000
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []));
const ENV = ".env.local";

console.log("\n  ONE — lokale Einrichtung / local setup\n");

// 1) .env.local
let envText = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const setVar = (name, value, overwrite = true) => {
  const re = new RegExp(`^${name}=.*$`, "m");
  if (re.test(envText)) {
    if (overwrite) envText = envText.replace(re, `${name}=${value}`);
  } else {
    envText += `${envText && !envText.endsWith("\n") ? "\n" : ""}${name}=${value}\n`;
  }
};
setVar("NEXT_PUBLIC_APP_URL", "http://localhost:3000", false);
setVar("ONE_SESSION_SECRET", randomBytes(48).toString("base64"), false);
setVar("ONE_BILLING_MODE", "demo", false);
// Local only: without a mail service, password-reset links are printed in this terminal.
setVar("ONE_LOG_DEMO_MAIL", "true", false);

// 2) Owner account
let email = args.email;
let password = args.password;
if (!email || !password) {
  const rl = readline.createInterface({ input, output });
  email ||= (await rl.question("  Deine E-Mail (wird dein Admin-Konto) / your email: ")).trim();
  password ||= await rl.question("  Passwort (min. 10 Zeichen, Buchstaben + Zahlen) / password: ");
  rl.close();
}

let out;
try {
  out = execFileSync(process.execPath, ["scripts/create-owner.mjs", "--email", email, "--password", password], { encoding: "utf8" });
} catch (e) {
  console.error("\n  ✘ " + (e.stderr || e.message).trim() + "\n");
  process.exit(1);
}
const id = out.match(/ONE_OWNER_USER_ID=([0-9a-f-]{36})/)?.[1];
if (!id) {
  console.error("\n  ✘ Owner account could not be created.\n" + out);
  process.exit(1);
}
setVar("ONE_OWNER_USER_ID", id, true);
writeFileSync(ENV, envText);

console.log(`
  ✔ Fertig! / Done!

  Admin-Konto:  ${email}
  Starten:      npm run dev
  Öffnen:       http://localhost:3000   →  „Anmelden“ mit deiner E-Mail

  Du landest direkt im Admin-Bereich. Über „Mein persönliches ONE“ nutzt du die App selbst.
`);
