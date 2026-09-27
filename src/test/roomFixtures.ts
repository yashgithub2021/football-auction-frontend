/**
 * Realistic server snapshots for tests. Games are built with the real engine
 * (imported by submodule path, so tests that mock the `@domain/engine` barrel
 * still get real fixtures) exactly as the server would build them.
 */

import { DEFAULT_SETTINGS, MIN_MANAGERS } from "@domain/constants";
import { createSeededRandom } from "@domain/engine/random";
import { applyAction } from "@domain/engine/reducer";
import { createGame } from "@domain/engine/setup";
import type { Game, GameAction, GameSettings } from "@domain/types";
import { buildGameResults } from "@results";
import {
  MAX_NAME_LENGTH,
  type EnteredRoomData,
  type PublicParticipant,
  type PublicRoomSnapshot,
  type ResumedRoomData,
  type SessionSnapshot,
} from "@protocol";

export const T0 = 1_700_000_000_000;
export const ROOM_ID = "tafd9jxcgj";
export const TOKEN = "T0k3n-for-tests_xxxxxxxxxxxxxxxxxxxxxxxxxxx";

export const IDS = { host: "p-host", viraj: "p-viraj", vineet: "p-vineet", watcher: "p-watcher" } as const;

const MAX_PLAYING = 12;

interface Person {
  participantId: string;
  name: string;
}

const HOST: Person = { participantId: IDS.host, name: "Yash" };
const VIRAJ: Person = { participantId: IDS.viraj, name: "Viraj" };
const VINEET: Person = { participantId: IDS.vineet, name: "Vineet" };

export function participant(person: Person, overrides: Partial<PublicParticipant> = {}): PublicParticipant {
  return {
    participantId: person.participantId,
    name: person.name,
    role: person.participantId === IDS.host ? "HOST" : "MANAGER",
    playing: true,
    ready: false,
    connected: true,
    managerId: null,
    joinedAt: T0,
    ...overrides,
  };
}

function base(overrides: Partial<PublicRoomSnapshot>): PublicRoomSnapshot {
  return {
    roomId: ROOM_ID,
    status: "LOBBY",
    version: 1,
    serverNow: T0,
    hostParticipantId: IDS.host,
    participants: [],
    settings: DEFAULT_SETTINGS,
    countdown: null,
    game: null,
    results: null,
    startBlockers: [],
    limits: { minPlayingManagers: MIN_MANAGERS, maxPlayingManagers: MAX_PLAYING, maxNameLength: MAX_NAME_LENGTH },
    ...overrides,
  };
}

export interface LobbyOptions {
  version?: number;
  hostPlaying?: boolean;
  ready?: boolean;
  settings?: GameSettings;
  withVineet?: boolean;
  overrides?: Partial<PublicRoomSnapshot>;
}

export function lobbySnapshot({ version = 1, hostPlaying = true, ready = true, settings, withVineet = true, overrides = {} }: LobbyOptions = {}): PublicRoomSnapshot {
  const people = [
    participant(HOST, { playing: hostPlaying }),
    participant(VIRAJ, { ready }),
    ...(withVineet ? [participant(VINEET, { ready })] : []),
  ];
  return base({
    version,
    participants: people,
    settings: settings ?? DEFAULT_SETTINGS,
    startBlockers: ready
      ? []
      : [{ code: "MANAGERS_NOT_READY", message: "Waiting for Viraj, Vineet to be ready.", participantIds: [IDS.viraj, IDS.vineet] }],
    ...overrides,
  });
}

export interface GameOptions {
  version?: number;
  hostPlaying?: boolean;
  now?: number;
  /** Bids placed by participant id, applied through the real engine. */
  bids?: ReadonlyArray<{ participantId: string; amount: number; at?: number }>;
  withSpectator?: boolean;
}

export function gameSnapshot({ version = 10, hostPlaying = true, now = T0, bids = [], withSpectator = false }: GameOptions = {}): PublicRoomSnapshot {
  const players = hostPlaying ? [HOST, VIRAJ, VINEET] : [VIRAJ, VINEET];
  const created = createGame({ id: ROOM_ID, managerNames: players.map((p) => p.name), now });
  if (!created.ok) throw new Error("fixture game failed");
  const random = createSeededRandom(3);
  let game: Game = applyAction(created.game, { type: "START_GAME" }, { now, random }).game;
  const managerIdOf = new Map(players.map((person, index) => [person.participantId, game.managers[index]?.id ?? null]));
  for (const bid of bids) {
    const managerId = managerIdOf.get(bid.participantId);
    if (managerId === null || managerId === undefined) throw new Error("fixture: bidder isn't playing");
    game = applyAction(game, { type: "PLACE_BID", managerId, amount: bid.amount }, { now: bid.at ?? now, random }).game;
  }

  const people = [
    participant(HOST, { playing: hostPlaying, managerId: managerIdOf.get(IDS.host) ?? null }),
    participant(VIRAJ, { ready: true, managerId: managerIdOf.get(IDS.viraj) ?? null }),
    participant(VINEET, { ready: true, managerId: managerIdOf.get(IDS.vineet) ?? null }),
    ...(withSpectator ? [participant({ participantId: IDS.watcher, name: "Watcher" }, { role: "SPECTATOR", playing: false })] : []),
  ];
  return base({ status: "IN_GAME", version, serverNow: now, participants: people, game });
}

export interface FinishedOptions {
  /** COMPLETED: every squad fills (team size 1). ENDED_EARLY: the host ends lot 2 mid-bidding. */
  ending: "COMPLETED" | "ENDED_EARLY";
  hostPlaying?: boolean;
  withSpectator?: boolean;
  version?: number;
}

/**
 * A FINISHED room whose game was played through the real engine and whose
 * results come from the same pure builder the server uses.
 *
 * COMPLETED (Yash, Viraj, Vineet; team size 1):
 *   lot 1: Viraj $1, Vineet $2, Viraj $3 → sold to Viraj for $3
 *   lot 2: Vineet $2 → sold to Vineet
 *   lot 3: Yash is the last manager with a slot → auto-awarded at $1
 * ENDED_EARLY (team size 6):
 *   lot 1: Viraj $2 → sold; lot 2: Vineet $1, then the host ends the game.
 */
export function finishedSnapshot({ ending, hostPlaying = true, withSpectator = false, version = 50 }: FinishedOptions): PublicRoomSnapshot {
  if (ending === "COMPLETED" && !hostPlaying) throw new Error("fixture: the COMPLETED script needs a playing host");
  const players = hostPlaying ? [HOST, VIRAJ, VINEET] : [VIRAJ, VINEET];
  const settings = ending === "COMPLETED" ? { ...DEFAULT_SETTINGS, teamSize: 1 } : DEFAULT_SETTINGS;
  const created = createGame({ id: ROOM_ID, managerNames: players.map((p) => p.name), settings, now: T0 });
  if (!created.ok) throw new Error("fixture game failed");
  const random = createSeededRandom(3);
  let game: Game = applyAction(created.game, { type: "START_GAME" }, { now: T0, random }).game;
  const managerIdOf = new Map(players.map((person, index) => [person.participantId, game.managers[index]?.id ?? null]));
  let now = T0;
  const act = (action: GameAction) => {
    const result = applyAction(game, action, { now, random });
    if (result.error !== undefined) throw new Error(`fixture ${action.type}: ${result.error.message}`);
    game = result.game;
  };
  const bid = (participantId: string, amount: number) => {
    now += 100;
    act({ type: "PLACE_BID", managerId: managerIdOf.get(participantId) ?? "", amount });
  };
  /** Lets the lot's timer (or the reveal) run out. */
  const finishStage = () => {
    const auction = game.currentAuction;
    if (auction === null) throw new Error("fixture: no lot");
    now = game.status === "PLAYER_SOLD" ? (auction.revealEndsAt ?? now) : auction.endsAt;
    act({ type: "TICK" });
  };

  if (ending === "COMPLETED") {
    bid(IDS.viraj, 1);
    bid(IDS.vineet, 2);
    bid(IDS.viraj, 3);
    finishStage();
    finishStage();
    bid(IDS.vineet, 2);
    finishStage();
    finishStage(); // Yash is the only manager left: auto-award
    finishStage();
  } else {
    bid(IDS.viraj, 2);
    finishStage();
    finishStage();
    bid(IDS.vineet, 1);
    act({ type: "END_GAME" });
  }

  const people = [
    participant(HOST, { playing: hostPlaying, managerId: managerIdOf.get(IDS.host) ?? null }),
    participant(VIRAJ, { ready: true, managerId: managerIdOf.get(IDS.viraj) ?? null }),
    participant(VINEET, { ready: true, managerId: managerIdOf.get(IDS.vineet) ?? null }),
    ...(withSpectator ? [participant({ participantId: IDS.watcher, name: "Watcher" }, { role: "SPECTATOR", playing: false })] : []),
  ];
  return base({ status: "FINISHED", version, serverNow: now, participants: people, settings, game, results: buildGameResults(game) });
}

export function sessionFor(snapshot: PublicRoomSnapshot, participantId: string): SessionSnapshot {
  const person = snapshot.participants.find((p) => p.participantId === participantId);
  if (person === undefined) throw new Error(`fixture: no participant ${participantId}`);
  return {
    roomId: snapshot.roomId,
    participantId,
    role: person.role,
    isHost: participantId === snapshot.hostParticipantId,
    playing: person.playing,
    managerId: person.managerId,
  };
}

export function enteredData(snapshot: PublicRoomSnapshot, participantId: string, token = TOKEN): EnteredRoomData {
  return { roomId: snapshot.roomId, token, snapshot, session: sessionFor(snapshot, participantId) };
}

export function resumedData(snapshot: PublicRoomSnapshot, participantId: string): ResumedRoomData {
  return { roomId: snapshot.roomId, snapshot, session: sessionFor(snapshot, participantId) };
}
