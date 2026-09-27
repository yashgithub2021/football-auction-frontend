// GENERATED from backend/src/domain/players/positions.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/**
 * Football positions and their broad groupings.
 *
 * Positions are informational only: the auction NEVER restricts purchases by
 * position. Groups are used by later team analysis (Phase 6).
 */

export const POSITIONS = [
  "GK",
  "CB",
  "LB",
  "RB",
  "LWB",
  "RWB",
  "CDM",
  "CM",
  "CAM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
  "ST",
] as const;

export type Position = (typeof POSITIONS)[number];

export const POSITION_GROUPS = ["GK", "DEF", "MID", "ATT"] as const;

export type PositionGroup = (typeof POSITION_GROUPS)[number];

export const POSITION_GROUP: Readonly<Record<Position, PositionGroup>> = {
  GK: "GK",
  CB: "DEF",
  LB: "DEF",
  RB: "DEF",
  LWB: "DEF",
  RWB: "DEF",
  CDM: "MID",
  CM: "MID",
  CAM: "MID",
  LM: "MID",
  RM: "MID",
  LW: "ATT",
  RW: "ATT",
  CF: "ATT",
  ST: "ATT",
};

export const POSITION_LABEL: Readonly<Record<Position, string>> = {
  GK: "Goalkeeper",
  CB: "Centre-back",
  LB: "Left-back",
  RB: "Right-back",
  LWB: "Left wing-back",
  RWB: "Right wing-back",
  CDM: "Defensive midfielder",
  CM: "Central midfielder",
  CAM: "Attacking midfielder",
  LM: "Left midfielder",
  RM: "Right midfielder",
  LW: "Left winger",
  RW: "Right winger",
  CF: "Centre-forward",
  ST: "Striker",
};

const POSITION_SET: ReadonlySet<string> = new Set(POSITIONS);

export function isPosition(value: string): value is Position {
  return POSITION_SET.has(value);
}

export function getPositionGroup(position: Position): PositionGroup {
  return POSITION_GROUP[position];
}
