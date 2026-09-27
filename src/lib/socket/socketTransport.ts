import { io, type Socket } from "socket.io-client";
import { SERVER_EVENTS, type ClientPayloads, type PongMessage, type PublicRoomSnapshot, type SessionMessage } from "@protocol";
import type { ConnectionStatus, RequestEvent, ServerMessage, Transport, TransportAck } from "./transport";

export interface SocketTransportOptions {
  /** Resolved lazily at connect time, so the transport can be created during server rendering. */
  url: () => string;
  /** Defaults to Socket.IO's own choice (polling, then upgrade to WebSocket). */
  transports?: ("websocket" | "polling")[];
}

/** Socket.IO's reason when *we* called disconnect(). Anything else is a drop it will retry. */
const CLIENT_DISCONNECT = "io client disconnect";
const SERVER_DISCONNECT = "io server disconnect";

export class SocketTransport implements Transport {
  status: ConnectionStatus = "DISCONNECTED";
  /** Exposed for tests that simulate network drops. */
  socket: Socket | null = null;
  private everConnected = false;
  private readonly messageListeners = new Set<(message: ServerMessage) => void>();
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>();

  constructor(private readonly options: SocketTransportOptions) {}

  private setStatus(status: ConnectionStatus): void {
    if (status === this.status) return;
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }

  private emitMessage(message: ServerMessage): void {
    for (const listener of this.messageListeners) listener(message);
  }

  private createSocket(): Socket {
    const socket = io(this.options.url(), {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      ...(this.options.transports === undefined ? {} : { transports: this.options.transports }),
    });
    socket.on("connect", () => {
      this.everConnected = true;
      this.setStatus("CONNECTED");
    });
    socket.on("disconnect", (reason) => {
      if (reason === CLIENT_DISCONNECT) this.setStatus("DISCONNECTED");
      else if (reason === SERVER_DISCONNECT) {
        // The server closed us on purpose; Socket.IO won't retry by itself.
        this.setStatus("RECONNECTING");
        socket.connect();
      } else this.setStatus("RECONNECTING");
    });
    socket.on("connect_error", () => {
      if (!socket.active) this.setStatus("ERROR");
      else this.setStatus(this.everConnected ? "RECONNECTING" : "CONNECTING");
    });
    socket.io.on("reconnect_failed", () => this.setStatus("ERROR"));
    socket.on(SERVER_EVENTS.snapshot, (snapshot: PublicRoomSnapshot) => this.emitMessage({ type: "room:snapshot", snapshot }));
    socket.on(SERVER_EVENTS.session, (message: SessionMessage) => this.emitMessage({ type: "room:session", message }));
    socket.on(SERVER_EVENTS.pong, (message: PongMessage) => this.emitMessage({ type: "clock:pong", message }));
    return socket;
  }

  connect(): void {
    this.socket ??= this.createSocket();
    if (this.socket.connected) return;
    this.setStatus(this.everConnected ? "RECONNECTING" : "CONNECTING");
    this.socket.connect();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.setStatus("DISCONNECTED");
  }

  async request<E extends RequestEvent>(event: E, payload: ClientPayloads[E], timeoutMs: number): Promise<TransportAck> {
    // Created on first use: a page can ask to resume before the provider's
    // effect has called connect() (child effects run first). Socket.IO queues
    // the emit and sends it as soon as the connection is up.
    const socket = (this.socket ??= this.createSocket());
    try {
      // Emits made while reconnecting are buffered by Socket.IO and sent once connected.
      return (await socket.timeout(timeoutMs).emitWithAck(event, payload)) as TransportAck;
    } catch {
      return { ok: false, requestId: payload.requestId, error: { code: "TIMEOUT", message: "The server didn't respond." } };
    }
  }

  ping(payload: ClientPayloads["clock:ping"]): void {
    if (this.socket?.connected) this.socket.emit("clock:ping", payload);
  }

  onMessage(listener: (message: ServerMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatus(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }
}
