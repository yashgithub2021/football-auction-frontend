import { getMinimumNextBid, hasBids } from "@domain/engine";
import type { Game } from "@domain/types";
import { AuctionTimer } from "./AuctionTimer";
import { formatMoney, managerName, remainingBidMs } from "./auctionView";

interface BidStatusProps {
  game: Game;
  now: number;
}

/** Current bid, leader and countdown, all read from the domain Game. */
export function BidStatus({ game, now }: BidStatusProps) {
  const auction = game.currentAuction;
  if (auction === null) return null;

  const bidding = hasBids(auction);
  const closed = game.status === "PLAYER_SOLD";
  const leader = managerName(game, auction.highestBidderId);

  return (
    <section
      aria-labelledby="bid-status-heading"
      className="flex h-full flex-col justify-between gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 sm:p-8"
    >
      <h2 id="bid-status-heading" className="sr-only">
        Bidding
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-bold tracking-widest text-emerald-200/80 uppercase">
            {closed ? "Final bid" : "Current bid"}
          </p>
          {bidding ? (
            <p key={auction.currentBid} className="mt-1 text-6xl leading-none font-black text-lime-300 tabular-nums motion-safe:animate-pop sm:text-7xl">
              {formatMoney(auction.currentBid)}
            </p>
          ) : (
            <>
              <p className="mt-1 text-4xl leading-none font-black text-white/40">No bids</p>
              {!closed && (
                <p className="mt-2 text-sm font-semibold text-emerald-100">
                  Opening bid {formatMoney(getMinimumNextBid(auction, game.settings))}
                </p>
              )}
            </>
          )}
        </div>
        <div>
          <p className="text-sm font-bold tracking-widest text-emerald-200/80 uppercase">
            {closed ? "Winner" : "Highest bidder"}
          </p>
          <p className="mt-1 text-4xl leading-tight font-black break-words">{leader ?? "–"}</p>
        </div>
      </div>

      <AuctionTimer
        remainingMs={remainingBidMs(game, now)}
        totalMs={game.settings.auctionTimerMs}
        paused={game.status === "PAUSED"}
      />
    </section>
  );
}
