/**
 * Persists ONLY the room session token, one per room, so a refresh or
 * reconnect can resume the same participant. Nothing else about the room
 * or game is ever stored in the browser. Tokens are never logged or rendered.
 */

const KEY_PREFIX = "football-auction:session:";

export const tokenKey = (roomId: string) => `${KEY_PREFIX}${roomId}`;

export interface TokenStore {
  get(roomId: string): string | null;
  set(roomId: string, token: string): void;
  clear(roomId: string): void;
}

/** localStorage-backed store. Degrades to "no session" if storage is unavailable (e.g. blocked). */
export function createLocalStorageTokenStore(): TokenStore {
  const storage = (): Storage | null => {
    try {
      return typeof window === "undefined" ? null : window.localStorage;
    } catch {
      return null;
    }
  };
  return {
    get: (roomId) => {
      try {
        return storage()?.getItem(tokenKey(roomId)) ?? null;
      } catch {
        return null;
      }
    },
    set: (roomId, token) => {
      try {
        storage()?.setItem(tokenKey(roomId), token);
      } catch {
        // Storage full or blocked: the session still works until the tab closes.
      }
    },
    clear: (roomId) => {
      try {
        storage()?.removeItem(tokenKey(roomId));
      } catch {
        // Nothing to clean up.
      }
    },
  };
}

export function createMemoryTokenStore(): TokenStore {
  const tokens = new Map<string, string>();
  return {
    get: (roomId) => tokens.get(roomId) ?? null,
    set: (roomId, token) => void tokens.set(roomId, token),
    clear: (roomId) => void tokens.delete(roomId),
  };
}
