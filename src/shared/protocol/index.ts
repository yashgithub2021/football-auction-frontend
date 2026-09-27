// GENERATED from backend/src/protocol/index.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/**
 * The wire protocol between browsers and the server, shared by backend/ and
 * frontend/. Pure: types and constants only (no Node, Socket.IO or zod), so
 * the browser can import it without pulling in any server code.
 *
 * Clients only send intents. Every event carries a `requestId`, and commands
 * are answered through a Socket.IO acknowledgement with an AckResponse. State
 * reaches clients only through `room:snapshot` (the same for everyone in the
 * room) and `room:session` (just for that connection).
 *
 * There is deliberately no client event for the server-only room actions
 * (COUNTDOWN_ELAPSED, TICK, CLOSE_ROOM): the server issues those itself.
 */

import type { BidRejectionReason, GameSettings, SetupError } from "../domain/types";
import type { PublicRoomSnapshot, RoomErrorCode, SessionSnapshot, StartBlocker } from "../room/types";

export type {
  Countdown,
  ParticipantRole,
  PublicParticipant,
  PublicRoomSnapshot,
  RoomErrorCode,
  RoomStatus,
  SessionSnapshot,
  StartBlocker,
} from "../room/types";
export { MAX_NAME_LENGTH } from "../room/constants";
/** Final results carried by `PublicRoomSnapshot.results`, built on the server. */
export type {
  AuctionStatistics,
  EndReason,
  GameResults,
  HighestSale,
  LotBid,
  LotHistoryEntry,
  LotOutcome,
  ManagerResult,
  RatingAverages,
  SquadPlayer,
} from "../results/types";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const CLIENT_EVENTS = [
  "room:create",
  "room:join",
  "room:resume",
  "lobby:setReady",
  "lobby:updateSettings",
  "lobby:setPlaying",
  "lobby:remove",
  "lobby:start",
  "lobby:cancel",
  "game:bid",
  "game:pause",
  "game:resume",
  "game:end",
  "game:newAuction",
  "clock:ping",
] as const;

export type ClientEvent = (typeof CLIENT_EVENTS)[number];

/** Events that act on the room the connection has joined. */
export type CommandEvent = Exclude<ClientEvent, "room:create" | "room:join" | "room:resume" | "clock:ping">;

export const SERVER_EVENTS = {
  snapshot: "room:snapshot",
  session: "room:session",
  pong: "clock:pong",
} as const;

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** Server-generated room ids: 10 characters without look-alikes (no i, l, o, 0, 1). */
export const ROOM_ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const ROOM_ID_LENGTH = 10;
export const ROOM_ID_PATTERN = /^[a-hjkmnp-z2-9]{10}$/;

// ---------------------------------------------------------------------------
// Request payloads (what a client is allowed to send; nothing more)
// ---------------------------------------------------------------------------

interface WithRequestId {
  requestId: string;
}

export type SettingsPatch = Partial<GameSettings>;

export interface ClientPayloads {
  "room:create": WithRequestId & { name: string; playing: boolean; settings?: SettingsPatch };
  /** `token` only proves "I'm already in this room"; it can't introduce a new session. */
  "room:join": WithRequestId & { roomId: string; name: string; token?: string };
  "room:resume": WithRequestId & { roomId: string; token: string };
  "lobby:setReady": WithRequestId & { ready: boolean };
  "lobby:updateSettings": WithRequestId & { settings: SettingsPatch };
  "lobby:setPlaying": WithRequestId & { playing: boolean };
  "lobby:remove": WithRequestId & { participantId: string };
  "lobby:start": WithRequestId;
  "lobby:cancel": WithRequestId;
  "game:bid": WithRequestId & { amount: number };
  "game:pause": WithRequestId;
  "game:resume": WithRequestId;
  "game:end": WithRequestId;
  /** Host, once the game is over: back to the lobby with the same people and settings. */
  "game:newAuction": WithRequestId;
  "clock:ping": WithRequestId & { clientSentAt: number };
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export type ServerErrorCode =
  | "INVALID_MESSAGE"
  | "UNKNOWN_EVENT"
  | "RATE_LIMITED"
  | "ROOM_NOT_FOUND"
  | "NOT_IN_ROOM"
  | "ALREADY_IN_ROOM"
  | "SESSION_INVALID"
  | "SERVER_FULL"
  | "INTERNAL_ERROR";

export type ErrorCode = ServerErrorCode | RoomErrorCode;

/** Public details that help the client explain a rejection. Never internal state. */
export interface ErrorDetails {
  setupErrors?: readonly SetupError[];
  startBlockers?: readonly StartBlocker[];
  bidRejection?: BidRejectionReason;
  /** Which field of the message was invalid (INVALID_MESSAGE only). */
  field?: string;
}

export interface ErrorBody {
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
}

export type AckResponse<T = unknown> =
  | { ok: true; requestId: string; data: T }
  | { ok: false; requestId: string | null; error: ErrorBody };

/** Reply to room:create and room:join. The token is only ever sent here, to its owner. */
export interface EnteredRoomData {
  roomId: string;
  token: string;
  snapshot: PublicRoomSnapshot;
  session: SessionSnapshot;
}

/** Reply to room:resume (the client already holds its token). */
export interface ResumedRoomData {
  roomId: string;
  snapshot: PublicRoomSnapshot;
  session: SessionSnapshot;
}

/** Reply to a command: the room version the command produced (or left unchanged). */
export interface CommandData {
  version: number;
}

export interface SessionMessage {
  /** Null once this connection no longer belongs to a participant (removed, room closed). */
  session: SessionSnapshot | null;
  reason?: "REMOVED" | "ROOM_CLOSED";
}

export interface PongMessage {
  requestId: string;
  clientSentAt: number;
  serverNow: number;
}

// ---------------------------------------------------------------------------
// Socket.IO event maps
// ---------------------------------------------------------------------------

type AckFn = (response: AckResponse) => void;

/** Server side: payloads arrive as `unknown` on purpose and are validated before use. */
export type ClientToServerEvents = Record<ClientEvent, (payload: unknown, ack?: AckFn) => void>;

export interface ServerToClientEvents {
  "room:snapshot": (snapshot: PublicRoomSnapshot) => void;
  "room:session": (message: SessionMessage) => void;
  "clock:pong": (message: PongMessage) => void;
}
