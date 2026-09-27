/**
 * Setup form state and its mapping onto the domain.
 *
 * This module holds only form concerns: raw input strings, stable row keys,
 * and which domain error belongs to which field. Every rule (valid numbers,
 * name rules, budget and pool checks) comes from the domain's
 * validateSettings()/createGame(); nothing here decides validity itself.
 */

import { DEFAULT_SETTINGS, MIN_MANAGERS, MS_PER_SECOND } from "@domain/constants";
import { validateSettings } from "@domain/engine";
import { ALL_PLAYER_IDS } from "@domain/players/players";
import type { Game, GameSettings, SetupError, SetupErrorCode } from "@domain/types";

/**
 * Settings the host can edit in setup. The auction timer is typed in seconds
 * and converted to the domain's milliseconds; the domain validates the result.
 */
export const EDITABLE_SETTINGS = [
  "startingBudget",
  "teamSize",
  "minimumBid",
  "bidIncrement",
  "auctionTimerMs",
] as const;

export type EditableSetting = (typeof EDITABLE_SETTINGS)[number];

export type EditableSettings = Pick<GameSettings, EditableSetting>;

export interface ManagerDraft {
  /** Stable React key; independent of position so rows can be removed safely. */
  key: string;
  name: string;
}

export interface SetupDraft {
  managers: readonly ManagerDraft[];
  /** Raw input values, exactly as typed. Parsed only when handed to the domain. */
  settings: Readonly<Record<EditableSetting, string>>;
  nextManagerNumber: number;
}

/** The pool createGame() uses by default: every player in the dataset. */
export const PLAYER_POOL_SIZE = ALL_PLAYER_IDS.length;

/**
 * Codes caused by a combination of otherwise-complete inputs. They are shown
 * as soon as they occur; per-field problems wait until the field is touched
 * or the host tries to start, so a half-typed form isn't covered in red.
 */
const IMMEDIATE_ERROR_CODES: ReadonlySet<SetupErrorCode> = new Set([
  "TOO_FEW_MANAGERS",
  "BUDGET_TOO_LOW",
  "PLAYER_POOL_TOO_SMALL",
]);

const MANAGER_KEY_PREFIX = "manager-row-";
const MANAGER_NAMES_FIELD = "managerNames";

function managerRow(number: number): ManagerDraft {
  return { key: `${MANAGER_KEY_PREFIX}${number}`, name: "" };
}

export type SettingInputs = Readonly<Record<EditableSetting, string>>;

/** Domain settings → input strings (the timer is shown in seconds). */
export function settingsToInputs(settings: EditableSettings): Record<EditableSetting, string> {
  return {
    startingBudget: String(settings.startingBudget),
    teamSize: String(settings.teamSize),
    minimumBid: String(settings.minimumBid),
    bidIncrement: String(settings.bidIncrement),
    auctionTimerMs: String(settings.auctionTimerMs / MS_PER_SECOND),
  };
}

export function createInitialDraft(): SetupDraft {
  return {
    managers: Array.from({ length: MIN_MANAGERS }, (_, index) => managerRow(index + 1)),
    settings: settingsToInputs(DEFAULT_SETTINGS),
    nextManagerNumber: MIN_MANAGERS + 1,
  };
}

/** Rebuilds a draft from a created game, e.g. when the host goes back to edit. */
export function draftFromGame(game: Game): SetupDraft {
  return {
    managers: game.managers.map((manager, index) => ({ ...managerRow(index + 1), name: manager.name })),
    settings: settingsToInputs(game.settings),
    nextManagerNumber: game.managers.length + 1,
  };
}

export function addManager(draft: SetupDraft): SetupDraft {
  return {
    ...draft,
    managers: [...draft.managers, managerRow(draft.nextManagerNumber)],
    nextManagerNumber: draft.nextManagerNumber + 1,
  };
}

export function removeManager(draft: SetupDraft, key: string): SetupDraft {
  return { ...draft, managers: draft.managers.filter((manager) => manager.key !== key) };
}

export function renameManager(draft: SetupDraft, key: string, name: string): SetupDraft {
  return {
    ...draft,
    managers: draft.managers.map((manager) => (manager.key === key ? { ...manager, name } : manager)),
  };
}

export function updateSetting(draft: SetupDraft, field: EditableSetting, value: string): SetupDraft {
  return { ...draft, settings: { ...draft.settings, [field]: value } };
}

/**
 * Converts raw input to a number without judging it. Blank input becomes NaN
 * so the domain reports it as an invalid setting.
 */
export function parseSettingInput(value: string): number {
  const trimmed = value.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

/** Input strings → domain settings, without judging them (the timer goes seconds → ms). */
export function inputsToSettings(inputs: SettingInputs): EditableSettings {
  return {
    startingBudget: parseSettingInput(inputs.startingBudget),
    teamSize: parseSettingInput(inputs.teamSize),
    minimumBid: parseSettingInput(inputs.minimumBid),
    bidIncrement: parseSettingInput(inputs.bidIncrement),
    auctionTimerMs: parseSettingInput(inputs.auctionTimerMs) * MS_PER_SECOND,
  };
}

export function draftToSettings(draft: SetupDraft): EditableSettings {
  return inputsToSettings(draft.settings);
}

/** Names exactly as typed; the domain trims and checks them. */
export function draftManagerNames(draft: SetupDraft): string[] {
  return draft.managers.map((manager) => manager.name);
}

/** Live validation for the form, delegated entirely to the domain. */
export function validateDraft(draft: SetupDraft): SetupError[] {
  return validateSettings(
    { ...DEFAULT_SETTINGS, ...draftToSettings(draft) },
    draftManagerNames(draft),
    PLAYER_POOL_SIZE,
  );
}

// ---------------------------------------------------------------------------
// Mapping domain errors onto the form
// ---------------------------------------------------------------------------

export function isImmediateError(error: SetupError): boolean {
  return IMMEDIATE_ERROR_CODES.has(error.code);
}

export function managerNameField(index: number): string {
  return `${MANAGER_NAMES_FIELD}.${index}`;
}

export function isManagerListError(error: SetupError): boolean {
  return error.field === MANAGER_NAMES_FIELD;
}

export function isPoolError(error: SetupError): boolean {
  return error.code === "PLAYER_POOL_TOO_SMALL";
}

export function settingInputId(field: EditableSetting): string {
  return `setting-${field}`;
}

export function managerInputId(key: string): string {
  return `name-${key}`;
}

export const MANAGER_LIST_ID = "managers";
export const PLAYER_POOL_ID = "player-pool";

/** DOM id of the control an error refers to, for links in the error summary. */
export function inputIdForError(error: SetupError, draft: SetupDraft): string | null {
  if (error.field === undefined) {
    return isPoolError(error) ? PLAYER_POOL_ID : null;
  }
  if (error.field === MANAGER_NAMES_FIELD) {
    return MANAGER_LIST_ID;
  }
  const settingField = EDITABLE_SETTINGS.find((field) => field === error.field);
  if (settingField !== undefined) {
    return settingInputId(settingField);
  }
  const row = draft.managers.find((_, index) => managerNameField(index) === error.field);
  return row === undefined ? null : managerInputId(row.key);
}
