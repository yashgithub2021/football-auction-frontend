/**
 * The one boundary between the app and the network. Components never touch
 * Socket.IO; they talk to RoomClient, which talks to a Transport. Tests
 * swap in a fake Transport.
 */

import type {
  AckResponse,
  ClientEvent,
  ClientPayloads,
  ErrorCode,
  ErrorDetails,
  PongMessage,
  PublicRoomSnapshot,
  SessionMessage,
} from "@protocol";

export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "RECONNECTING" | "DISCONNECTED" | "ERROR";

/** Failures produced on the client side, before or instead of a server reply. */
export type ClientErrorCode = "TIMEOUT" | "NOT_CONNECTED" | "NOT_IN_ROOM" | "NO_SESSION";

export interface RequestError {
  code: ErrorCode | ClientErrorCode;
  message: string;
  details?: ErrorDetails;
}

export type ServerMessage =
  | { type: "room:snapshot"; snapshot: PublicRoomSnapshot }
  | { type: "room:session"; message: SessionMessage }
  | { type: "clock:pong"; message: PongMessage };

/** Events sent with an acknowledgement (everything except the clock ping). */
export type RequestEvent = Exclude<ClientEvent, "clock:ping">;

export type TransportAck = AckResponse | { ok: false; requestId: string | null; error: RequestError };

export interface Transport {
  readonly status: ConnectionStatus;
  connect(): void;
  /** Deliberate disconnect (not a network drop). */
  disconnect(): void;
  /** Sends an event and resolves with the server's acknowledgement, or a client-side error. */
  request<E extends RequestEvent>(event: E, payload: ClientPayloads[E], timeoutMs: number): Promise<TransportAck>;
  /** Fire-and-forget; only used for clock pings. */
  ping(payload: ClientPayloads["clock:ping"]): void;
  onMessage(listener: (message: ServerMessage) => void): () => void;
  onStatus(listener: (status: ConnectionStatus) => void): () => void;
}
