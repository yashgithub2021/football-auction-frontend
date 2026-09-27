import type { ConnectionStatus } from "@/lib/socket/transport";

const MESSAGES: Record<Exclude<ConnectionStatus, "CONNECTED">, string> = {
  CONNECTING: "Connecting to the server…",
  RECONNECTING: "Connection lost. Reconnecting…",
  DISCONNECTED: "Disconnected from the server.",
  ERROR: "Can't reach the server. Check that it's running and try reloading.",
};

/** Shows connection problems. Silent while connected and attached. */
export function ConnectionBanner({ status, resuming }: { status: ConnectionStatus; resuming: boolean }) {
  const message = status === "CONNECTED" ? (resuming ? "Reconnecting to the room…" : null) : MESSAGES[status];
  if (message === null) return null;
  const serious = status === "ERROR" || status === "DISCONNECTED";
  return (
    <p
      role="status"
      data-connection={status}
      className={`rounded-2xl px-4 py-3 text-center text-sm font-bold ${
        serious ? "bg-rose-500/20 text-rose-100" : "bg-amber-300/20 text-amber-100"
      }`}
    >
      {message}
    </p>
  );
}
