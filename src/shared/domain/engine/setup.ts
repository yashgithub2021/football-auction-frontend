// GENERATED from backend/src/domain/engine/setup.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
import {
  DEFAULT_SETTINGS,
  GAME_SCHEMA_VERSION,
  MANAGER_ID_PREFIX,
  MAX_AUCTION_TIMER_MS,
  MAX_AUCTION_TIMER_SECONDS,
  MIN_AUCTION_TIMER_MS,
  MIN_AUCTION_TIMER_SECONDS,
  MIN_MANAGERS,
  MS_PER_SECOND,
} from "../constants";
import { ALL_PLAYER_IDS, PLAYERS_BY_ID } from "../players/players";
import type { CreateGameResult, Game, GameSettings, Manager, SetupError } from "../types";

const SETTING_LABELS: Readonly<Record<keyof GameSettings, string>> = {
  startingBudget: "Starting budget",
  teamSize: "Team size",
  minimumBid: "Minimum bid",
  bidIncrement: "Bid increment",
  auctionTimerMs: "Auction timer",
};

const SETTING_KEYS = Object.keys(SETTING_LABELS) as Array<keyof GameSettings>;

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Validates game settings and manager names. Returns every problem found
 * (empty array means valid) so the setup UI can show them all at once.
 */
export function validateSettings(
  settings: GameSettings,
  managerNames: readonly string[],
  poolSize: number,
): SetupError[] {
  const errors: SetupError[] = [];

  for (const key of SETTING_KEYS) {
    if (!isPositiveInteger(settings[key])) {
      errors.push({
        code: "INVALID_SETTING",
        field: key,
        message: `${SETTING_LABELS[key]} must be a whole number greater than 0.`,
      });
    }
  }

  const { auctionTimerMs } = settings;
  if (
    isPositiveInteger(auctionTimerMs) &&
    (auctionTimerMs % MS_PER_SECOND !== 0 ||
      auctionTimerMs < MIN_AUCTION_TIMER_MS ||
      auctionTimerMs > MAX_AUCTION_TIMER_MS)
  ) {
    errors.push({
      code: "INVALID_SETTING",
      field: "auctionTimerMs",
      message: `Auction timer must be a whole number of seconds from ${MIN_AUCTION_TIMER_SECONDS} to ${MAX_AUCTION_TIMER_SECONDS}.`,
    });
  }

  if (managerNames.length < MIN_MANAGERS) {
    errors.push({
      code: "TOO_FEW_MANAGERS",
      field: "managerNames",
      message: `At least ${MIN_MANAGERS} managers are needed.`,
    });
  }

  const seen = new Set<string>();
  managerNames.forEach((name, index) => {
    const normalized = normalizeName(name);
    if (normalized === "") {
      errors.push({
        code: "BLANK_MANAGER_NAME",
        field: `managerNames.${index}`,
        message: `Manager ${index + 1} needs a name.`,
      });
      return;
    }
    if (seen.has(normalized)) {
      errors.push({
        code: "DUPLICATE_MANAGER_NAME",
        field: `managerNames.${index}`,
        message: `"${name.trim()}" is already taken.`,
      });
      return;
    }
    seen.add(normalized);
  });

  const { startingBudget, teamSize, minimumBid } = settings;
  if (
    isPositiveInteger(startingBudget) &&
    isPositiveInteger(teamSize) &&
    isPositiveInteger(minimumBid) &&
    startingBudget < teamSize * minimumBid
  ) {
    errors.push({
      code: "BUDGET_TOO_LOW",
      field: "startingBudget",
      message: `Starting budget must be at least $${teamSize * minimumBid} (${teamSize} players × $${minimumBid}).`,
    });
  }

  if (isPositiveInteger(teamSize) && poolSize < managerNames.length * teamSize) {
    errors.push({
      code: "PLAYER_POOL_TOO_SMALL",
      message: `The player pool has ${poolSize} players but ${managerNames.length * teamSize} are needed.`,
    });
  }

  return errors;
}

export interface CreateGameInput {
  id: string;
  managerNames: readonly string[];
  settings?: Partial<GameSettings>;
  /** Defaults to every player in the dataset. Duplicate ids are ignored. */
  playerPoolIds?: readonly string[];
  now: number;
}

/** Validates the configuration and returns a READY game, or every setup error. */
export function createGame(input: CreateGameInput): CreateGameResult {
  const settings: GameSettings = { ...DEFAULT_SETTINGS, ...input.settings };
  const pool = [...new Set(input.playerPoolIds ?? ALL_PLAYER_IDS)];

  const errors = validateSettings(settings, input.managerNames, pool.length);
  const unknownIds = pool.filter((id) => !PLAYERS_BY_ID.has(id));
  if (unknownIds.length > 0) {
    errors.push({
      code: "UNKNOWN_PLAYER",
      message: `Unknown player ids in pool: ${unknownIds.join(", ")}.`,
    });
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const managers: Manager[] = input.managerNames.map((name, index) => ({
    id: `${MANAGER_ID_PREFIX}${index + 1}`,
    name: name.trim(),
    budgetRemaining: settings.startingBudget,
    playerIds: [],
  }));

  const game: Game = {
    id: input.id,
    schemaVersion: GAME_SCHEMA_VERSION,
    status: "READY",
    settings,
    managers,
    availablePlayerIds: pool,
    discardedPlayerIds: [],
    currentAuction: null,
    lastResult: null,
    history: [],
    interruptedLot: null,
    createdAt: input.now,
    lotCounter: 0,
  };
  return { ok: true, game };
}
