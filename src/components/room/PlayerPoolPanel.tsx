"use client";

import { useId } from "react";
import { getPlayerById } from "@domain/players/players";
import type { Game } from "@domain/types";
import { PLAYER_FILTERS, filterAvailablePlayers, type PlayerFilter } from "@protocol";
import { useRequest, useRoomClient } from "@/state/room/RoomClientProvider";
import { errorText } from "./errorText";
import { ErrorMessage } from "./ui";

const FILTER_LABEL: Record<PlayerFilter, string> = { ALL: "All", GK: "GK", DEF: "DEF", MID: "MID", ATT: "ATT" };
const FILTER_NAME: Record<PlayerFilter, string> = { ALL: "all positions", GK: "goalkeepers", DEF: "defenders", MID: "midfielders", ATT: "attackers" };

/** "No remaining GK players", or "No remaining players" for All. */
export function emptyPoolMessage(filter: PlayerFilter): string {
  return filter === "ALL" ? "No remaining players" : `No remaining ${filter} players`;
}

interface PlayerPoolPanelProps {
  game: Game;
  /** The room's filter from the server snapshot: the same for everyone. */
  filter: PlayerFilter;
  isHost: boolean;
  live: boolean;
}

/**
 * While the auction is paused, everyone sees the players still waiting to be
 * auctioned, filtered by the host's choice. The filter lives in the server's
 * room state: the host's buttons only send an intent, and the list follows
 * the next snapshot. It is a view of the pool; it never changes who comes
 * up next or anything else about the auction.
 */
export function PlayerPoolPanel({ game, filter, isHost, live }: PlayerPoolPanelProps) {
  const client = useRoomClient();
  const setFilter = useRequest(client.setPlayerFilter);
  const headingId = useId();
  const listLabelId = useId();
  if (game.status !== "PAUSED") return null;

  const ids = filterAvailablePlayers(game, filter);

  return (
    <section aria-labelledby={headingId} data-testid="player-pool" className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-sm font-bold tracking-widest text-emerald-200/80 uppercase">
          Remaining players
        </h2>
        <p className="text-sm text-emerald-100/80 tabular-nums">
          {ids.length} of {game.availablePlayerIds.length} shown
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Show players:</span>
        {isHost ? (
          <div role="group" aria-label="Show players" aria-busy={setFilter.pending} className="flex flex-wrap gap-2">
            {PLAYER_FILTERS.map((value) => {
              const selected = value === filter;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  aria-disabled={!live}
                  onClick={() => live && !selected && void setFilter.run(value)}
                  className={`min-h-11 min-w-14 rounded-xl px-3 text-sm font-black transition focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none ${
                    selected ? "bg-lime-300 text-emerald-950" : live ? "border-2 border-white/25 hover:border-white/60" : "border-2 border-white/10 text-white/40"
                  }`}
                >
                  {FILTER_LABEL[value]}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm">
            <span className="rounded-lg bg-lime-300 px-2 py-0.5 font-black text-emerald-950">{FILTER_LABEL[filter]}</span>
            <span className="ml-2 text-emerald-100/80">Chosen by the host</span>
          </p>
        )}
      </div>
      {isHost && (
        <div className="mt-2">
          <ErrorMessage>{setFilter.error !== null && errorText(setFilter.error)}</ErrorMessage>
        </div>
      )}

      <p id={listLabelId} className="sr-only">
        Remaining players: {FILTER_NAME[filter]}
      </p>
      {ids.length === 0 ? (
        <p className="mt-3 rounded-xl bg-emerald-950/60 px-3 py-2 text-emerald-100">{emptyPoolMessage(filter)}</p>
      ) : (
        <ul aria-labelledby={listLabelId} className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
          {ids.map((id) => {
            const player = getPlayerById(id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-xl bg-emerald-950/60 px-3 py-1.5 text-sm">
                <span className="w-11 shrink-0 rounded bg-lime-300 px-1 text-center text-xs font-black text-emerald-950">{player?.primaryPosition ?? "?"}</span>
                <span className="min-w-0 truncate font-bold">{player?.name ?? "Unknown player"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
