/**
 * Estimates the server's clock for DISPLAY ONLY (countdowns, timers).
 * Nothing in the client decides game outcomes from this: whether bidding is
 * open, a lot is sold or the countdown has ended is always the server's call,
 * delivered in snapshots.
 *
 * Each clock:ping/pong gives one sample:
 *   rtt    = receivedAt − clientSentAt
 *   offset = serverNow + rtt/2 − receivedAt
 * The lowest-latency recent sample is the most trustworthy. Before any ping
 * returns, snapshot `serverNow` values give a rough fallback.
 */

export interface ClockSample {
  offset: number;
  rtt: number;
}

export const MAX_CLOCK_SAMPLES = 8;

export class ClockSync {
  private samples: ClockSample[] = [];
  private fallbackOffset: number | null = null;

  addPong(clientSentAt: number, serverNow: number, receivedAt: number): ClockSample | null {
    const rtt = receivedAt - clientSentAt;
    if (rtt < 0) return null; // clock jumped backwards mid-flight; ignore
    const sample = { offset: serverNow + rtt / 2 - receivedAt, rtt };
    this.samples = [...this.samples, sample].slice(-MAX_CLOCK_SAMPLES);
    return sample;
  }

  /** A server timestamp seen at `receivedAt` (latency unknown), used until a ping sample exists. */
  observeServerTime(serverNow: number, receivedAt: number): void {
    this.fallbackOffset = serverNow - receivedAt;
  }

  /** Milliseconds to add to the local clock to estimate the server's. */
  get offset(): number {
    if (this.samples.length > 0) {
      return this.samples.reduce((best, sample) => (sample.rtt < best.rtt ? sample : best)).offset;
    }
    return this.fallbackOffset ?? 0;
  }

  get sampleCount(): number {
    return this.samples.length;
  }

  serverNow(clientNow: number): number {
    return clientNow + this.offset;
  }
}
