import type { RequestError } from "@/lib/socket/transport";

/**
 * Words for errors whose server message isn't aimed at players. Everything
 * else shows the server's own (authoritative) message; the client never
 * re-derives why something was rejected.
 */
const FRIENDLY: Partial<Record<RequestError["code"], string>> = {
  SESSION_INVALID: "Your session for this room is no longer valid. Join again.",
  ROOM_NOT_FOUND: "This room doesn't exist or has closed.",
  RATE_LIMITED: "You're going a bit fast. Try again in a moment.",
  TIMEOUT: "The server didn't respond. Check your connection and try again.",
  NOT_CONNECTED: "You're offline. Reconnecting…",
  INTERNAL_ERROR: "Something went wrong on the server. Try again.",
  INVALID_MESSAGE: "That request wasn't valid.",
  UNKNOWN_EVENT: "That action isn't available.",
  NOT_IN_ROOM: "You aren't in this room any more.",
  ALREADY_IN_ROOM: "You're already in a room in this tab.",
  SERVER_FULL: "The server is full right now. Try again later.",
};

export function errorText(error: RequestError): string {
  return FRIENDLY[error.code] ?? error.message;
}
