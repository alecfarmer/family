/**
 * Smoke test for lib/crypto.ts.
 *
 * Run: `pnpm crypto:test` (which wraps `tsx --env-file=.env.local`).
 *
 * Generates a fresh ENCRYPTION_KEY if one isn't set, so the script is runnable
 * cold. Stubs unrelated env vars (Supabase URL, VAPID, etc.) before importing
 * lib/crypto — the env proxy validates ALL required vars on first access, and
 * we don't want missing Supabase config to mask a real crypto failure.
 */
import { randomBytes } from "node:crypto";

async function main() {
  // Stub unrelated required env vars BEFORE importing lib/crypto. The env
  // proxy zod-validates the entire schema on first access, so any missing
  // var would throw before we ever touch encryptPassword.
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://placeholder.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "placeholder";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "placeholder";
  process.env.NEXT_PUBLIC_SITE_URL ||= "http://localhost:3000";
  process.env.VAPID_PUBLIC_KEY ||= "placeholder";
  process.env.VAPID_PRIVATE_KEY ||= "placeholder";
  process.env.VAPID_EMAIL ||= "placeholder@example.com";

  let generated = false;
  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
    generated = true;
    console.log("ENCRYPTION_KEY was unset — generated a fresh key for this run:");
    console.log(`  ENCRYPTION_KEY=${process.env.ENCRYPTION_KEY}`);
    console.log(
      "Add the above to .env.local + Vercel if you want to keep using it.\n",
    );
  }

  // Dynamic import — must come AFTER env stubs so the static-import hoist
  // doesn't pull `lib/env` validation before we set the vars.
  const { encryptPassword, decryptPassword } = await import("../lib/crypto");

  const plaintexts = [
    "hunter2",
    "",
    "a".repeat(1000),
    "non-ascii: ñ é 🔑 漢字",
    "with\nnewlines\tand\ttabs",
  ];

  let passed = 0;
  for (const pt of plaintexts) {
    const ct = encryptPassword(pt);
    const rt = decryptPassword(ct);
    const ok = rt === pt;
    const label = pt.length > 40 ? `${pt.slice(0, 37)}...` : pt;
    console.log(`${ok ? "OK  " : "FAIL"}  "${label}" (${pt.length} chars)`);
    if (ok) passed++;
    else {
      console.error("  expected:", JSON.stringify(pt));
      console.error("  got:     ", JSON.stringify(rt));
      process.exitCode = 1;
    }
  }

  // Tamper test: flipping a byte should fail auth tag verification.
  const ct = encryptPassword("tamper-me");
  const buf = Buffer.from(ct, "base64");
  buf[20] ^= 0xff; // mutate inside the auth tag
  const tampered = buf.toString("base64");
  try {
    decryptPassword(tampered);
    console.error("FAIL  tamper detection — decryption should have thrown");
    process.exitCode = 1;
  } catch {
    console.log("OK    tamper detection threw on modified ciphertext");
    passed++;
  }

  console.log(
    `\n${passed}/${plaintexts.length + 1} passed${generated ? " (using ephemeral key)" : ""}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
