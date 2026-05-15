// Pure helper that tries to short-circuit a chat turn for the common case
// "what's the X password?" by matching the message to a single credential in
// the user's accessible list. When it succeeds we can skip the LLM round-trip
// entirely — server decrypts, audit-logs, returns the card payload.

import type { ChatContextCredential } from "@/lib/chatContext";

const LOOKUP_KEYWORDS = new Set([
  "password",
  "pw",
  "pass",
  "login",
  "credential",
  "credentials",
  "creds",
  "key",
  "info",
  "details",
  "wifi", // people say "what's the wifi" without "password"
  "wi-fi",
]);

/** Tokenize a string into a Set of lower-cased word tokens. */
function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

/** Words shorter than this are too generic to drive a match alone. */
const MIN_TOKEN_LEN = 3;

export type QuickMatchResult =
  | { matched: true; credential: ChatContextCredential; reason: string }
  | { matched: false; reason: string };

/**
 * Attempt a deterministic match on a single credential. Returns
 * { matched: true } iff exactly one credential is clearly the user's target.
 *
 * Anything ambiguous (no lookup keyword, no service-name overlap, OR two
 * credentials with similar scores) returns matched=false so the caller can
 * fall back to the full LLM path, which can ask for clarification.
 */
export function quickMatch(
  text: string,
  credentials: ChatContextCredential[],
): QuickMatchResult {
  if (!text.trim()) {
    return { matched: false, reason: "empty_input" };
  }
  if (credentials.length === 0) {
    return { matched: false, reason: "no_credentials" };
  }

  const messageTokens = tokens(text);
  const messageLower = text.toLowerCase();

  // Must look like a lookup question, OR explicitly contain the full service
  // name. ("Netflix" alone is a clear ask; "I was watching netflix" isn't,
  // but "watching" doesn't appear in our keyword set so it'll be rejected.)
  const hasLookupKeyword = [...messageTokens].some((w) =>
    LOOKUP_KEYWORDS.has(w),
  );

  const candidates: { cred: ChatContextCredential; score: number }[] = [];

  for (const cred of credentials) {
    const svcLower = cred.service.toLowerCase();
    const svcTokens = svcLower
      .split(/[\s\-_]+/)
      .filter((w) => w.length >= MIN_TOKEN_LEN);
    if (svcTokens.length === 0) continue;

    // Strong signal: the full service name appears as a substring of the
    // message (e.g. "what's the home wifi password").
    if (messageLower.includes(svcLower)) {
      candidates.push({ cred, score: 1000 + svcLower.length });
      continue;
    }

    // Word-level overlap: how many distinctive service tokens appear in the
    // message? Each match scores by token length so "spotify" beats "the".
    const matchedTokens = svcTokens.filter((w) => messageTokens.has(w));
    if (matchedTokens.length === 0) continue;

    const ratio = matchedTokens.length / svcTokens.length;
    const distinctiveness = matchedTokens.reduce((sum, w) => sum + w.length, 0);
    candidates.push({
      cred,
      score: Math.round(ratio * 100) + distinctiveness,
    });
  }

  if (candidates.length === 0) {
    return { matched: false, reason: "no_service_overlap" };
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];

  // Without a lookup keyword we only accept the strongest "full name in
  // message" hits — otherwise innocent service mentions ("I saw Netflix in
  // the news") would fire a reveal.
  if (!hasLookupKeyword && top.score < 1000) {
    return { matched: false, reason: "no_keyword_and_weak_match" };
  }

  // Disambiguate against the runner-up. If two credentials score similarly
  // we'd rather hand off to the LLM so it can ask "which one?"
  if (candidates.length >= 2) {
    const second = candidates[1];
    if (second.score >= top.score * 0.75) {
      return { matched: false, reason: "ambiguous_match" };
    }
  }

  return {
    matched: true,
    credential: top.cred,
    reason:
      top.score >= 1000 ? "full_name_in_message" : "service_token_overlap",
  };
}
