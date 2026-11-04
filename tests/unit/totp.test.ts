import { test } from "node:test";
import assert from "node:assert/strict";
import { totp, verifyTotp, generateSecret, base32Encode, base32Decode, otpauthUrl } from "../../src/lib/auth/totp.ts";

// RFC 6238 Appendix B test vectors (SHA-1, secret "12345678901234567890"), last 6 digits.
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

test("matches the RFC 6238 test vectors", () => {
  assert.equal(totp(RFC_SECRET, 59_000), "287082");
  assert.equal(totp(RFC_SECRET, 1_111_111_109_000), "081804");
  assert.equal(totp(RFC_SECRET, 1_234_567_890_000), "005924");
  assert.equal(totp(RFC_SECRET, 20_000_000_000_000), "353130");
});

test("verification accepts ±1 step and rejects others", () => {
  const s = generateSecret();
  const now = 1_700_000_000_000;
  assert.ok(verifyTotp(s, totp(s, now), now));
  assert.ok(verifyTotp(s, totp(s, now - 30_000), now));
  assert.ok(!verifyTotp(s, totp(s, now - 120_000), now));
  for (const bad of ["", "12345", "abcdef", "1234567"]) assert.ok(!verifyTotp(s, bad, now), bad);
});

test("base32 round trip and fresh secrets", () => {
  const buf = Buffer.from([0, 1, 2, 250, 255, 7, 9]);
  assert.deepEqual(base32Decode(base32Encode(buf)), buf);
  const a = generateSecret(), b = generateSecret();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Z2-7]{32}$/);
  assert.match(otpauthUrl(a, "owner@one.test"), /^otpauth:\/\/totp\/ONE%20Admin:owner%40one\.test\?secret=/);
});
