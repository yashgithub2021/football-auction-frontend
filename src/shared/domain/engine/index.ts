// GENERATED from backend/src/domain/engine/index.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/** Public auction engine API. UI and future transport layers import from here. */

export { applyAction } from "./reducer";
export { createGame, validateSettings, type CreateGameInput } from "./setup";
export {
  calculateMaximumSafeBid,
  getAmountSpent,
  getManagerById,
  getMinimumNextBid,
  getOpenSlots,
  getQuickBidOptions,
  hasBids,
  isManagerActive,
  validateBid,
} from "./bidding";
export { finalizeAuction, pauseAuction, placeBid, resumeAuction, startAuction } from "./auction";
export {
  advanceGame,
  areAllSquadsFull,
  canEndGame,
  completeGame,
  endGame,
  isAuctionFinished,
  isGameOver,
  isPoolExhausted,
  startGame,
  tick,
} from "./game";
export { selectRandomPlayer } from "./selection";
export { createSeededRandom } from "./random";
