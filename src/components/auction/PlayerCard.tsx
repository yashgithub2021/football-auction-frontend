import { POSITION_LABEL } from "@domain/players/positions";
import type { Player } from "@domain/types";

const MAX_INITIALS = 2;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, MAX_INITIALS)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

interface PlayerCardProps {
  player: Player;
  lotNumber: number;
}

/**
 * The player on the block. The dataset has no images yet (the optional
 * `image` field is unused), so the card shows a monogram instead of adding
 * an image dependency.
 */
export function PlayerCard({ player, lotNumber }: PlayerCardProps) {
  return (
    <article
      aria-labelledby="player-name"
      className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border-2 border-lime-300/40 bg-[linear-gradient(160deg,var(--color-emerald-700),var(--color-emerald-900)_55%,var(--color-emerald-950))] p-4 shadow-2xl shadow-black/40 sm:p-8"
    >
      {/* Pitch markings, purely decorative. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full border-4 border-white/5" />
      <div aria-hidden="true" className="pointer-events-none absolute top-0 right-1/3 h-full w-1 bg-white/5" />

      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-black tracking-[0.3em] text-lime-300 uppercase">Lot {lotNumber}</p>
        <p className="rounded-xl bg-lime-300 px-3 py-1 text-2xl font-black text-emerald-950" aria-label={`Position ${player.primaryPosition}`}>
          {player.primaryPosition}
        </p>
      </div>

      <div className="mt-3 flex flex-1 flex-row items-center gap-4 sm:mt-6 sm:gap-6">
        <div
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-lime-300/60 bg-emerald-950/70 text-2xl font-black text-lime-200 sm:size-28 sm:text-4xl lg:size-36 lg:text-5xl"
        >
          {initials(player.name)}
        </div>
        <div className="min-w-0">
          <h2 id="player-name" className="text-3xl leading-none font-black tracking-tight break-words sm:text-5xl lg:text-6xl">
            {player.name}
          </h2>
          <p className="mt-2 text-base font-semibold text-emerald-100 sm:mt-3 sm:text-xl">
            {player.nationality}
            {player.era !== undefined && <span className="text-emerald-200/60"> · {player.era}</span>}
          </p>
        </div>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm sm:mt-6">
        <div>
          <dt className="font-bold tracking-widest text-emerald-200/60 uppercase">Primary</dt>
          <dd className="text-base font-bold sm:text-lg">{POSITION_LABEL[player.primaryPosition]}</dd>
        </div>
        <div>
          <dt className="font-bold tracking-widest text-emerald-200/60 uppercase">Also plays</dt>
          <dd className="text-base font-bold sm:text-lg">
            {player.secondaryPositions.length === 0 ? "None listed" : player.secondaryPositions.join(", ")}
          </dd>
        </div>
      </dl>
    </article>
  );
}
