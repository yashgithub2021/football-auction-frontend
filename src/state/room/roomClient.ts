/**
 * The multiplayer client store: the frontend's single source of room state.
 *
 *   server snapshot ─▶ RoomClient state ─▶ React (useSyncExternalStore)
 *   user intent ─▶ RoomClient request ─▶ Transport ─▶ server
 *
 * It never computes game state. Snapshots from the server replace what it
 * holds; requests carry only intents (e.g. "bid 6") and their outcome shows
 * up as the next snapshot. The only thing persisted is the room's session
 * token (see TokenStore); it is never put in state, logged or rendered.
 */

import {
  ROOM_ID_PATTERN,
  type ClientPayloads,
  type CommandData,
  type CommandEvent,
  type EnteredRoomData,
  type PlayerFilter,
  type PublicRoomSnapshot,
  type ResumedRoomData,
  type SessionMessage,
  type SessionSnapshot,
  type SettingsPatch,
} from "@protocol";
import { ClockSync } from "@/lib/clock/clockSync";
import type { TokenStore } from "@/lib/session/tokenStore";
import type {
  ConnectionStatus,
  RequestError,
  RequestEvent,
  ServerMessage,
  Transport,
  TransportAck,
} from "@/lib/socket/transport";

export type NoticeKind = "REMOVED" | "ROOM_CLOSED" | "SESSION_EXPIRED";

export interface RoomNotice {
  kind: NoticeKind;
  message: string;
}

export interface RoomClientState {
  connection: ConnectionStatus;
  /** The room this client is attached to, or null. */
  roomId: string | null;
  snapshot: PublicRoomSnapshot | null;
  session: SessionSnapshot | null;
  /** True while re-attaching to the room after the connection came back. */
  resuming: boolean;
  /** Why the client was detached from a room, shown until dismissed. */
  notice: RoomNotice | null;
}

export type RequestResult<T> = { ok: true; data: T } | { ok: false; error: RequestError };

export interface RoomClientOptions {
  transport: Transport;
  tokens: TokenStore;
  /** Local clock; injectable for tests. */
  now?: () => number;
  requestTimeoutMs?: number;
  /** How often to re-measure the server clock while connected; 0 disables periodic pings. */
  clockPingIntervalMs?: number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_CLOCK_PING_INTERVAL_MS = 15_000;

const NOTICES: Record<NoticeKind, string> = {
  REMOVED: "The host removed you from the room.",
  ROOM_CLOSED: "This room has closed.",
  SESSION_EXPIRED: "Your session for this room has ended. Join again to take part.",
};

/** Server codes meaning "this token will never work again for this room". */
const DEAD_SESSION_CODES: ReadonlySet<string> = new Set(["SESSION_INVALID", "ROOM_NOT_FOUND"]);

function fail<T>(error: RequestError): RequestResult<T> {
  return { ok: false, error };
}

export class RoomClient {
  readonly clock = new ClockSync();
  private state: RoomClientState;
  private readonly listeners = new Set<() => void>();
  private requestCounter = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private readonly now: () => number;
  private readonly requestTimeoutMs: number;
  private readonly clockPingIntervalMs: number;
  private readonly transport: Transport;
  private readonly tokens: TokenStore;

  constructor(options: RoomClientOptions) {
    this.transport = options.transport;
    this.tokens = options.tokens;
    this.now = options.now ?? (() => Date.now());
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.clockPingIntervalMs = options.clockPingIntervalMs ?? DEFAULT_CLOCK_PING_INTERVAL_MS;
    this.state = {
      connection: this.transport.status,
      roomId: null,
      snapshot: null,
      session: null,
      resuming: false,
      notice: null,
    };
    this.transport.onStatus((status) => this.handleStatus(status));
    this.transport.onMessage((message) => this.handleMessage(message));
  }

  // -------------------------------------------------------------------------
  // Subscription (for useSyncExternalStore)
  // -------------------------------------------------------------------------

  getState = (): RoomClientState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setState(patch: Partial<RoomClientState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  /** Estimated server time, for display only. */
  serverNow(): number {
    return this.clock.serverNow(this.now());
  }

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  connect(): void {
    this.transport.connect();
  }

  disconnect(): void {
    this.stopClockSync();
    this.transport.disconnect();
  }

  private handleStatus(status: ConnectionStatus): void {
    this.setState({ connection: status });
    if (status !== "CONNECTED") {
      this.stopClockSync();
      return;
    }
    this.startClockSync();
    // A (re)connected socket is a brand-new connection on the server: re-attach
    // it to our existing participant. Never join again, which would duplicate us.
    const roomId = this.state.roomId;
    if (roomId !== null && !this.state.resuming) void this.reattach(roomId);
  }

  private async reattach(roomId: string): Promise<void> {
    this.setState({ resuming: true });
    await this.resumeRoom(roomId);
    this.setState({ resuming: false });
  }

  private startClockSync(): void {
    this.sendPing();
    if (this.clockPingIntervalMs > 0 && this.pingTimer === null) {
      this.pingTimer = setInterval(() => this.sendPing(), this.clockPingIntervalMs);
    }
  }

  private stopClockSync(): void {
    if (this.pingTimer !== null) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  /** Measures the server clock once. Exposed so the UI can refresh the estimate on demand. */
  sendPing(): void {
    this.transport.ping({ requestId: this.nextRequestId(), clientSentAt: this.now() });
  }

  // -------------------------------------------------------------------------
  // Server messages
  // -------------------------------------------------------------------------

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case "room:snapshot":
        this.applySnapshot(message.snapshot);
        return;
      case "room:session":
        this.applySession(message.message);
        return;
      case "clock:pong":
        this.clock.addPong(message.message.clientSentAt, message.message.serverNow, this.now());
        return;
    }
  }

  private applySnapshot(snapshot: PublicRoomSnapshot): void {
    if (snapshot.roomId !== this.state.roomId) return; // not (or no longer) our room
    const current = this.state.snapshot;
    if (current !== null && snapshot.version < current.version) return; // stale, arrived late
    this.clock.observeServerTime(snapshot.serverNow, this.now());
    this.setState({ snapshot });
  }

  private applySession(message: SessionMessage): void {
    const roomId = this.state.roomId;
    if (roomId === null) return;
    if (message.session === null) {
      this.detach(roomId, message.reason === "REMOVED" ? "REMOVED" : "ROOM_CLOSED");
      return;
    }
    if (message.session.roomId === roomId) this.setState({ session: message.session });
  }

  /** Forgets the room locally (and its token) so the user can join or create again. */
  private detach(roomId: string, reason: NoticeKind): void {
    this.tokens.clear(roomId);
    this.setState({
      roomId: null,
      snapshot: null,
      session: null,
      resuming: false,
      notice: { kind: reason, message: NOTICES[reason] },
    });
  }

  private enter(roomId: string, snapshot: PublicRoomSnapshot, session: SessionSnapshot): void {
    this.clock.observeServerTime(snapshot.serverNow, this.now());
    this.setState({ roomId, snapshot, session, notice: null });
  }

  dismissNotice(): void {
    if (this.state.notice !== null) this.setState({ notice: null });
  }

  // -------------------------------------------------------------------------
  // Requests
  // -------------------------------------------------------------------------

  private nextRequestId(): string {
    this.requestCounter += 1;
    return `c${this.requestCounter}`;
  }

  private send<E extends RequestEvent>(event: E, fields: Omit<ClientPayloads[E], "requestId">): Promise<TransportAck> {
    const payload = { requestId: this.nextRequestId(), ...fields } as ClientPayloads[E];
    return this.transport.request(event, payload, this.requestTimeoutMs);
  }

  async createRoom(input: { name: string; playing: boolean }): Promise<RequestResult<{ roomId: string }>> {
    const ack = await this.send("room:create", { name: input.name, playing: input.playing });
    if (!ack.ok) return fail(ack.error);
    const data = ack.data as EnteredRoomData;
    this.tokens.set(data.roomId, data.token);
    this.enter(data.roomId, data.snapshot, data.session);
    return { ok: true, data: { roomId: data.roomId } };
  }

  async joinRoom(input: { roomId: string; name: string }): Promise<RequestResult<{ roomId: string }>> {
    const ack = await this.send("room:join", { roomId: input.roomId, name: input.name });
    if (!ack.ok) return fail(ack.error);
    const data = ack.data as EnteredRoomData;
    this.tokens.set(data.roomId, data.token);
    this.enter(data.roomId, data.snapshot, data.session);
    return { ok: true, data: { roomId: data.roomId } };
  }

  /** Re-attaches to a room with the stored token. A dead token is cleared. */
  async resumeRoom(roomId: string): Promise<RequestResult<{ roomId: string }>> {
    const token = this.tokens.get(roomId);
    if (token === null) return fail({ code: "NO_SESSION", message: "No saved session for this room." });

    const ack = await this.send("room:resume", { roomId, token });
    if (!ack.ok) {
      if (DEAD_SESSION_CODES.has(ack.error.code)) this.detach(roomId, "SESSION_EXPIRED");
      return fail(ack.error);
    }
    const data = ack.data as ResumedRoomData;
    this.enter(data.roomId, data.snapshot, data.session);
    return { ok: true, data: { roomId: data.roomId } };
  }

  /**
   * Opens a room page: already attached → nothing to do; saved token →
   * resume; otherwise the caller should offer the join form (NO_SESSION).
   */
  async enterRoom(roomId: string): Promise<RequestResult<{ roomId: string }>> {
    if (!ROOM_ID_PATTERN.test(roomId)) {
      return fail({ code: "ROOM_NOT_FOUND", message: "That invite link isn't valid." });
    }
    if (this.state.roomId === roomId && this.state.session !== null) return { ok: true, data: { roomId } };
    return this.resumeRoom(roomId);
  }

  private async command<E extends CommandEvent>(
    event: E,
    fields: Omit<ClientPayloads[E], "requestId">,
  ): Promise<RequestResult<CommandData>> {
    if (this.state.roomId === null) return fail({ code: "NOT_IN_ROOM", message: "You aren't in a room." });
    const ack = await this.send(event, fields);
    return ack.ok ? { ok: true, data: ack.data as CommandData } : fail(ack.error);
  }

  setReady = (ready: boolean) => this.command("lobby:setReady", { ready });
  setPlaying = (playing: boolean) => this.command("lobby:setPlaying", { playing });
  updateSettings = (settings: SettingsPatch) => this.command("lobby:updateSettings", { settings });
  removeParticipant = (participantId: string) => this.command("lobby:remove", { participantId });
  startCountdown = () => this.command("lobby:start", {});
  cancelCountdown = () => this.command("lobby:cancel", {});
  /** "I bid this much." Who is bidding, and whether it's legal, is the server's decision. */
  bid = (amount: number) => this.command("game:bid", { amount });
  pause = () => this.command("game:pause", {});
  resumeAuction = () => this.command("game:resume", {});
  endGame = () => this.command("game:end", {});
  skipPlayer = () => this.command("game:skip", {});
  /** Host, after the game: back to the lobby with the same people. The server decides if that's allowed. */
  newAuction = () => this.command("game:newAuction", {});
  /** Host, while paused: which positions the remaining-players list shows. The server authorizes and broadcasts it. */
  setPlayerFilter = (filter: PlayerFilter) => this.command("game:setPlayerFilter", { filter });
}
