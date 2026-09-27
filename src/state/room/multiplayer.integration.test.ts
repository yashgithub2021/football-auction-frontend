// @vitest-environment node
/**
 * Real end-to-end check: starts the actual backend as a separate process
 * (`backend/src/server/index.ts` via tsx, on a random port) and drives three
 * real RoomClients over real Socket.IO, exactly as three browsers would.
 * Nothing is mocked. Requires `npm install` in backend/ (npm run install:all).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMemoryTokenStore, type TokenStore } from "@/lib/session/tokenStore";
import { SocketTransport } from "@/lib/socket/socketTransport";
import { RoomClient, type RoomClientState } from "./roomClient";

const BACKEND_DIR = fileURLToPath(new URL("../../../../backend", import.meta.url));
const TSX_CLI = fileURLToPath(new URL("../../../../backend/node_modules/tsx/dist/cli.mjs", import.meta.url));
const STARTUP_TIMEOUT_MS = 20_000;
const WAIT_TIMEOUT_MS = 10_000;

let backend: ChildProcess | null = null;
let url = "";
const clients: RoomClient[] = [];

beforeAll(async () => {
  backend = spawn(process.execPath, [TSX_CLI, "src/server/index.ts"], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: "0", HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  url = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("backend did not start")), STARTUP_TIMEOUT_MS);
    let output = "";
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const match = /listening on port (\d+)/.exec(output);
      if (match !== null) {
        clearTimeout(timer);
        resolve(`http://127.0.0.1:${match[1]}`);
      }
    };
    backend?.stdout?.on("data", onData);
    backend?.stderr?.on("data", onData);
    backend?.once("exit", (code) => reject(new Error(`backend exited early (${code}): ${output}`)));
  });
}, STARTUP_TIMEOUT_MS + 5_000);

afterAll(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  if (backend !== null && backend.exitCode === null) {
    const exited = new Promise((resolve) => backend?.once("exit", resolve));
    backend.kill("SIGTERM");
    await exited;
  }
});

interface Device {
  client: RoomClient;
  transport: SocketTransport;
  tokens: TokenStore;
}

async function device(): Promise<Device> {
  const transport = new SocketTransport({ url: () => url, transports: ["websocket"] });
  const tokens = createMemoryTokenStore();
  const client = new RoomClient({ transport, tokens, clockPingIntervalMs: 0 });
  clients.push(client);
  client.connect();
  await until(client, (state) => state.connection === "CONNECTED");
  return { client, transport, tokens };
}

/** Resolves once the client's state satisfies the predicate. */
function until(client: RoomClient, predicate: (state: RoomClientState) => boolean): Promise<RoomClientState> {
  return new Promise((resolve, reject) => {
    if (predicate(client.getState())) {
      resolve(client.getState());
      return;
    }
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`timed out; last state: ${JSON.stringify({ ...client.getState(), snapshot: client.getState().snapshot?.status })}`));
    }, WAIT_TIMEOUT_MS);
    const unsubscribe = client.subscribe(() => {
      if (!predicate(client.getState())) return;
      clearTimeout(timer);
      unsubscribe();
      resolve(client.getState());
    });
  });
}

function must<T>(result: { ok: true; data: T } | { ok: false; error: { code: string; message: string } }): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

describe("three devices against the real backend", () => {
  it("share one authoritative room: join, settings, start, bid, reconnect", async () => {
    const [a, b, c] = [await device(), await device(), await device()];

    // A hosts; B and C join from the invite.
    const { roomId } = must(await a.client.createRoom({ name: "Yash", playing: true }));
    must(await b.client.joinRoom({ roomId, name: "Viraj" }));
    must(await c.client.joinRoom({ roomId, name: "Vineet" }));
    const everyone = [a, b, c];
    await Promise.all(everyone.map((d) => until(d.client, (s) => s.snapshot?.participants.length === 3)));
    const versions = everyone.map((d) => d.client.getState().snapshot?.version);
    expect(new Set(versions).size).toBe(1);

    // Identity came from the server, not from anything the clients chose.
    expect(a.client.getState().session).toMatchObject({ role: "HOST", isHost: true });
    expect(b.client.getState().session).toMatchObject({ role: "MANAGER", isHost: false });
    for (const d of everyone) {
      expect(JSON.stringify(d.client.getState())).not.toContain(d.tokens.get(roomId) ?? "missing-token");
    }

    // A changes a setting; B and C see it.
    must(await a.client.updateSettings({ startingBudget: 25 }));
    await Promise.all([b, c].map((d) => until(d.client, (s) => s.snapshot?.settings.startingBudget === 25)));

    // A non-host can't change settings: the server says so.
    const denied = await b.client.updateSettings({ startingBudget: 99 });
    expect(!denied.ok && denied.error.code).toBe("NOT_HOST");

    // Ready up and start; the server runs the synchronized countdown.
    must(await b.client.setReady(true));
    must(await c.client.setReady(true));
    must(await a.client.startCountdown());
    const counting = await until(c.client, (s) => s.snapshot?.status === "COUNTDOWN");
    expect(counting.snapshot?.countdown?.endsAt).toBeGreaterThan(counting.snapshot?.countdown?.startedAt ?? 0);
    await Promise.all(everyone.map((d) => until(d.client, (s) => s.snapshot?.status === "IN_GAME")));

    // B bids; A and C receive the server's result, with B's server-assigned manager id.
    const bManagerId = b.client.getState().session?.managerId;
    expect(bManagerId).toBe("manager-2");
    must(await b.client.bid(1));
    for (const d of [a, c]) {
      const seen = await until(d.client, (s) => s.snapshot?.game?.currentAuction?.highestBidderId === bManagerId);
      expect(seen.snapshot?.game?.currentAuction?.currentBid).toBe(1);
    }

    // An illegal bid reaches the domain on the server and is rejected there.
    const illegal = await c.client.bid(999);
    expect(!illegal.ok && illegal.error.code).toBe("BID_REJECTED");

    // B's network drops. The client reconnects and resumes the same participant.
    const bParticipant = b.client.getState().session?.participantId;
    b.transport.socket?.io.engine.close();
    await until(b.client, (s) => s.connection === "RECONNECTING");
    const presence = await until(a.client, (s) => s.snapshot?.participants.find((p) => p.name === "Viraj")?.connected === false);
    expect(presence.snapshot?.game?.status).not.toBe("PAUSED"); // a drop never pauses the auction
    const back = await until(b.client, (s) => s.connection === "CONNECTED" && !s.resuming && s.session !== null);
    expect(back.session?.participantId).toBe(bParticipant);
    const restored = await until(a.client, (s) => s.snapshot?.participants.find((p) => p.name === "Viraj")?.connected === true);
    expect(restored.snapshot?.participants).toHaveLength(3);
  }, 30_000);
});
