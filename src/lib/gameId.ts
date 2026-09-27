const RADIX_BASE36 = 36;
const RANDOM_SUFFIX_START = 2;

/**
 * Creates a unique game id. crypto.randomUUID() is only available in secure
 * contexts (https or localhost), so fall back when the app is opened over a
 * plain-http LAN address.
 */
export function createGameId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const random = Math.random().toString(RADIX_BASE36).slice(RANDOM_SUFFIX_START);
  return `game-${Date.now().toString(RADIX_BASE36)}-${random}`;
}
