// GENERATED from backend/src/room/types.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/**
 * Room layer types. A room wraps one domain Game with the multiplayer
 * concerns around it: who is in the room, who is host, who is ready, the
 * synchronized start countdown, and which room actions each person may take.
 *
 * All state is plain, serializable data. Nothing here knows about sockets,
 * HTTP, browsers or storage; the server (R2) supplies identities and time.
 */

import type { BidValidation, Game, GameSettings, RandomFn, SetupError } from "../domain/types";
import type { GameResults } from "../results/types";
import type { PlayerFilter } from "./playerFilter";

// ---------------------------------------------------------------------------
// Room state (internal: the server keeps this; clients only see snapshots)
// ---------------------------------------------------------------------------

export type RoomStatus = "LOBBY" | "COUNTDOWN" | "IN_GAME" | "FINISHED" | "CLOSED";

/**
 * HOST runs the room (and may also play). MANAGER plays. SPECTATOR joined
 * after the game started and can only watch.
 */
export type ParticipantRole = "HOST" | "MANAGER" | "SPECTATOR";

export interface Participant {
  participantId: string;
  /**
   * Opaque, server-assigned identifier of the session that owns this
   * participant. R2 derives it from the session token; the room layer only
   * compares it. Private: never included in any snapshot.
   */
  sessionId: string;
  name: string;
  role: ParticipantRole;
  /** Whether this participant is (or will be) a manager in the game. */
  playing: boolean;
  /** Lobby readiness. Ignored for the host, whose Start counts as ready. */
  ready: boolean;
  /** Domain manager id, assigned when the game is created; null otherwise. */
  managerId: string | null;
  /**
   * Number of live connections (e.g. browser tabs) for this participant. The
   * server reports connects/disconnects; the room never holds connection
   * objects. Private: snapshots expose only `connected`.
   */
  connectionCount: number;
  joinedAt: number;
}

export interface Countdown {
  startedAt: number;
  /** When "GO" appears (after the 3, 2, 1). */
  goAt: number;
  /** When the game is created and the first player goes up. */
  endsAt: number;
}

export interface Room {
  roomId: string;
  status: RoomStatus;
  /** Increases by one on every change; lets clients drop stale snapshots. */
  version: number;
  createdAt: number;
  updatedAt: number;
  hostParticipantId: string;
  /** Join order. This order also decides domain manager ids at game start. */
  participants: readonly Participant[];
  /** Game settings the host edits in the lobby; validated by the domain. */
  settings: GameSettings;
  countdown: Countdown | null;
  /** The domain Game, created when the countdown elapses. */
  game: Game | null;
  /**
   * Host's position filter for the remaining-players list, changed only
   * while the auction is paused. Display only: the domain never reads it.
   */
  playerFilter: PlayerFilter;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Actions taken on behalf of a person. `actorId` is the participant the
 * server authenticated for the connection; it is never taken from message
 * content. Gameplay actions carry no manager id, budget or bid state: the
 * room derives the manager from the actor.
 */
export type ParticipantAction =
  | { type: "DISCONNECT"; actorId: string }
  | { type: "SET_READY"; actorId: string; ready: boolean }
  /**
   * The host switches their own playing status in the lobby. `participantId`
   * names the target explicitly so "only yourself" is an enforced rule.
   * Non-host lobby participants are always playing managers (to not play,
   * they leave or are removed), so this is host-only.
   */
  | { type: "SET_PLAYING"; actorId: string; participantId: string; playing: boolean }
  | { type: "UPDATE_SETTINGS"; actorId: string; settings: Partial<GameSettings> }
  | { type: "REMOVE_PARTICIPANT"; actorId: string; participantId: string }
  | { type: "START_COUNTDOWN"; actorId: string }
  | { type: "CANCEL_COUNTDOWN"; actorId: string }
  | { type: "BID"; actorId: string; amount: number }
  | { type: "PAUSE"; actorId: string }
  | { type: "RESUME_AUCTION"; actorId: string }
  | { type: "END_GAME"; actorId: string }
  /** Host, after the game is over: back to the lobby with the same people and settings. */
  | { type: "NEW_AUCTION"; actorId: string }
  /** Host, while the auction is paused: which positions the remaining-players list shows. */
  | { type: "SET_PLAYER_FILTER"; actorId: string; filter: PlayerFilter };

/** Joining and reconnecting identify the caller by session, since they may not have a participant yet. */
export type SessionAction =
  | { type: "JOIN"; sessionId: string; name: string }
  | { type: "RESUME"; sessionId: string };

/**
 * Issued only by the server itself (scheduler, housekeeping), never on
 * behalf of a client message. R2's protocol layer must not map client input
 * to these.
 */
export type SystemAction = { type: "COUNTDOWN_ELAPSED" } | { type: "TICK" } | { type: "CLOSE_ROOM" };

export type RoomAction = ParticipantAction | SessionAction | SystemAction;

export type RoomActionType = RoomAction["type"];

export interface RoomDeps {
  now: number;
  random: RandomFn;
  /** Generates participant ids. Must return a new, unused id on each call. */
  createId: () => string;
}

// ---------------------------------------------------------------------------
// Results and errors
// ---------------------------------------------------------------------------

export type RoomErrorCode =
  | "ROOM_CLOSED"
  | "INVALID_STATUS"
  | "UNKNOWN_PARTICIPANT"
  | "UNKNOWN_SESSION"
  | "ALREADY_JOINED"
  | "DUPLICATE_PARTICIPANT_ID"
  | "INVALID_NAME"
  | "ROOM_FULL"
  | "ROOM_LOCKED"
  | "NOT_HOST"
  | "NOT_PLAYING"
  | "NOT_SELF"
  | "HOST_READY_IMPLICIT"
  | "CANNOT_REMOVE_HOST"
  | "INVALID_SETTINGS"
  | "START_BLOCKED"
  | "COUNTDOWN_NOT_ELAPSED"
  | "BID_REJECTED"
  | "GAME_ACTION_REJECTED";

export type StartBlocker =
  | { code: "MANAGERS_NOT_READY"; message: string; participantIds: readonly string[] }
  | { code: "INVALID_SETUP"; message: string; setupError: SetupError };

export interface RoomError {
  code: RoomErrorCode;
  message: string;
  /** Domain validation errors (names, settings). */
  setupErrors?: readonly SetupError[];
  /** Why the game can't start yet. */
  startBlockers?: readonly StartBlocker[];
  /** The domain's verdict on a rejected bid. */
  bidValidation?: BidValidation;
}

/**
 * On success `room` is the new state (the same object if nothing changed).
 * On rejection `room` is the state to keep: identical to the input, except
 * when the domain caught up on elapsed time before rejecting (e.g. PAUSE
 * after the timer ran out finalizes that lot first).
 */
export type RoomResult =
  | { ok: true; room: Room; participantId?: string }
  | { ok: false; room: Room; error: RoomError };

export type CreateRoomResult =
  | { ok: true; room: Room; participantId: string }
  | { ok: false; error: RoomError };

// ---------------------------------------------------------------------------
// Snapshots (what clients receive)
// ---------------------------------------------------------------------------

export interface PublicParticipant {
  participantId: string;
  name: string;
  role: ParticipantRole;
  playing: boolean;
  ready: boolean;
  connected: boolean;
  managerId: string | null;
  joinedAt: number;
}

/** Broadcast to everyone in the room. Contains no session or connection details. */
export interface PublicRoomSnapshot {
  roomId: string;
  status: RoomStatus;
  version: number;
  /** Server time when the snapshot was made, for client clock-offset estimates. */
  serverNow: number;
  hostParticipantId: string;
  participants: readonly PublicParticipant[];
  settings: GameSettings;
  countdown: Countdown | null;
  game: Game | null;
  /** The host's current remaining-players filter; the same for everyone. */
  playerFilter: PlayerFilter;
  /**
   * Final results, built on the server from the authoritative game once it
   * is over (FINISHED, and still present if the room then closes). null
   * while the game hasn't started or is still running.
   */
  results: GameResults | null;
  /** Empty when the host could start now (only meaningful in the lobby). */
  startBlockers: readonly StartBlocker[];
  limits: { minPlayingManagers: number; maxPlayingManagers: number; maxNameLength: number };
}

/** Sent only to the connection that owns the participant. */
export interface SessionSnapshot {
  roomId: string;
  participantId: string;
  role: ParticipantRole;
  isHost: boolean;
  playing: boolean;
  managerId: string | null;
}
