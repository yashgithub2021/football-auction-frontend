/** In-memory Transport for tests: records what the client sends and lets the test play the server. */

import type { AckResponse, ClientPayloads, PongMessage, PublicRoomSnapshot, SessionMessage } from "@protocol";
import type { ConnectionStatus, RequestEvent, ServerMessage, Transport, TransportAck } from "@/lib/socket/transport";

export interface SentRequest {
  event: string;
  payload: Record<string, unknown>;
}

type Handler = (event: RequestEvent, payload: Record<string, unknown>) => TransportAck | Promise<TransportAck>;

export class FakeTransport implements Transport {
  status: ConnectionStatus = "DISCONNECTED";
  readonly sent: SentRequest[] = [];
  readonly pings: Array<ClientPayloads["clock:ping"]> = [];
  /** How the fake server answers requests. Defaults to a generic success. */
  handler: Handler = (_event, payload) => ok(payload, { version: 1 });
  private readonly messageListeners = new Set<(message: ServerMessage) => void>();
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>();

  setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }

  connect(): void {
    this.setStatus("CONNECTED");
  }

  disconnect(): void {
    this.setStatus("DISCONNECTED");
  }

  request<E extends RequestEvent>(event: E, payload: ClientPayloads[E]): Promise<TransportAck> {
    const record = payload as unknown as Record<string, unknown>;
    this.sent.push({ event, payload: record });
    return Promise.resolve(this.handler(event, record));
  }

  ping(payload: ClientPayloads["clock:ping"]): void {
    this.pings.push(payload);
  }

  onMessage(listener: (message: ServerMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatus(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private deliver(message: ServerMessage): void {
    for (const listener of this.messageListeners) listener(message);
  }

  pushSnapshot(snapshot: PublicRoomSnapshot): void {
    this.deliver({ type: "room:snapshot", snapshot });
  }

  pushSession(message: SessionMessage): void {
    this.deliver({ type: "room:session", message });
  }

  pushPong(message: PongMessage): void {
    this.deliver({ type: "clock:pong", message });
  }

  eventsSent(): string[] {
    return this.sent.map((request) => request.event);
  }

  lastSent(event: string): SentRequest | undefined {
    return [...this.sent].reverse().find((request) => request.event === event);
  }
}

export function ok<T>(payload: Record<string, unknown>, data: T): AckResponse<T> {
  return { ok: true, requestId: String(payload.requestId), data };
}

export function rejected(payload: Record<string, unknown>, code: string, message: string): TransportAck {
  return { ok: false, requestId: String(payload.requestId), error: { code: code as never, message } };
}

/** A promise the test resolves later, to observe "waiting for the server" states. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
