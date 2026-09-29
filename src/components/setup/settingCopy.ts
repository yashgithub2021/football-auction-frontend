import type { EditableSetting } from "./setupDraft";

export interface SettingCopy {
  label: string;
  hint: string;
  prefix?: string;
  suffix?: string;
}

/** Labels and hints for each game setting, shared by the setup form and the lobby. */
export const SETTING_COPY: Readonly<Record<EditableSetting, SettingCopy>> = {
  startingBudget: { label: "Starting budget", hint: "Dollars each manager starts with.", prefix: "$" },
  teamSize: { label: "Team size", hint: "Players each manager must sign." },
  minimumBid: { label: "Minimum bid", hint: "Lowest opening bid for a player, in dollars.", prefix: "$" },
  bidIncrement: { label: "Bid increment", hint: "Smallest raise over the current bid, in dollars.", prefix: "$" },
  auctionTimerMs: { label: "Auction timer", hint: "Seconds on the clock. Every valid bid resets it.", suffix: "sec" },
  auctionOrder: { label: "Auction order", hint: "Choose random draws or goalkeeper → defence → midfield → forwards." },
};

export const SETTING_ORDER: readonly EditableSetting[] = [
  "startingBudget",
  "teamSize",
  "minimumBid",
  "bidIncrement",
  "auctionTimerMs",
  "auctionOrder",
];
