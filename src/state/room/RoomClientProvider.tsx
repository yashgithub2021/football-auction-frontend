"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createLocalStorageTokenStore } from "@/lib/session/tokenStore";
import { SocketTransport } from "@/lib/socket/socketTransport";
import type { RequestError } from "@/lib/socket/transport";
import { RoomClient, type RequestResult, type RoomClientState } from "./roomClient";

/** How often countdown displays refresh. Purely visual. */
export const DISPLAY_REFRESH_MS = 100;

const BACKEND_PORT = 4000;

/**
 * Where the backend lives. NEXT_PUBLIC_SERVER_URL wins; otherwise the same
 * host as the page on the backend's port, so phones on the LAN reach it too.
 */
export function backendUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL;
  if (configured !== undefined && configured !== "") return configured;
  if (typeof window === "undefined") return `http://localhost:${BACKEND_PORT}`;
  return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
}

export function createBrowserRoomClient(): RoomClient {
  return new RoomClient({
    transport: new SocketTransport({ url: backendUrl }),
    tokens: createLocalStorageTokenStore(),
  });
}

const RoomClientContext = createContext<RoomClient | null>(null);

export function RoomClientProvider({ children, client }: { children: ReactNode; client?: RoomClient }) {
  const [instance] = useState(() => client ?? createBrowserRoomClient());
  useEffect(() => {
    instance.connect();
    return () => instance.disconnect();
  }, [instance]);
  return <RoomClientContext.Provider value={instance}>{children}</RoomClientContext.Provider>;
}

export function useRoomClient(): RoomClient {
  const client = useContext(RoomClientContext);
  if (client === null) throw new Error("useRoomClient must be used inside <RoomClientProvider>.");
  return client;
}

export function useRoomState(): RoomClientState {
  const client = useRoomClient();
  return useSyncExternalStore(client.subscribe, client.getState, client.getState);
}

/**
 * Estimated server time, refreshed every 100ms while `active`. Display only:
 * countdowns are drawn from server timestamps minus this, and each new
 * snapshot corrects them.
 */
export function useServerNow(active: boolean): number {
  const client = useRoomClient();
  const [now, setNow] = useState(() => client.serverNow());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(client.serverNow()), DISPLAY_REFRESH_MS);
    return () => clearInterval(id);
  }, [client, active]);
  return active ? now : client.serverNow();
}

/** Tracks one request's pending state and error for a component. */
export function useRequest<A extends unknown[], T>(fn: (...args: A) => Promise<RequestResult<T>>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<RequestError | null>(null);
  const run = async (...args: A) => {
    setPending(true);
    setError(null);
    const result = await fn(...args);
    setPending(false);
    if (!result.ok) setError(result.error);
    return result;
  };
  return { run, pending, error, clearError: () => setError(null) };
}
