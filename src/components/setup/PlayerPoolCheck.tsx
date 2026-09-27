import { PLAYER_POOL_ID } from "./setupDraft";

interface PlayerPoolCheckProps {
  poolSize: number;
  managerCount: number;
  /** Players per squad, or null while the team size input is invalid. */
  teamSize: number | null;
  /** The domain's PLAYER_POOL_TOO_SMALL message, if any. */
  poolError: string | null;
}

/**
 * Shows how many players the auction needs versus how many exist. Pass/fail
 * comes from the domain error; the numbers here are display only.
 */
export function PlayerPoolCheck({ poolSize, managerCount, teamSize, poolError }: PlayerPoolCheckProps) {
  const slotsNeeded = teamSize === null ? null : managerCount * teamSize;
  const ok = poolError === null;

  return (
    <section
      id={PLAYER_POOL_ID}
      tabIndex={-1}
      aria-labelledby="pool-heading"
      className={`rounded-3xl border-2 p-5 outline-none sm:p-6 ${
        ok ? "border-white/10 bg-white/5" : "border-rose-400 bg-rose-500/10"
      }`}
    >
      <h2 id="pool-heading" className="text-sm font-bold tracking-widest text-emerald-200/80 uppercase">
        Player pool
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-emerald-200/70">Players available</dt>
          <dd className="text-3xl font-black tabular-nums">{poolSize}</dd>
        </div>
        <div>
          <dt className="text-sm text-emerald-200/70">Squad places to fill</dt>
          <dd className="text-3xl font-black tabular-nums">{slotsNeeded ?? "–"}</dd>
        </div>
      </dl>
      <p role="status" className={`mt-3 text-sm font-semibold ${ok ? "text-lime-300" : "text-rose-200"}`}>
        {ok ? "Enough players for every squad." : poolError}
      </p>
    </section>
  );
}
