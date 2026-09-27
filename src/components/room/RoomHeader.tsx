import type { ReactNode } from "react";
import type { SessionSnapshot } from "@protocol";
import type { ConnectionStatus } from "@/lib/socket/transport";
import { VIEWER_LABEL, viewerKind } from "@/state/room/viewer";
import { Kicker } from "./ui";

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  CONNECTED: "Live",
  CONNECTING: "Connecting",
  RECONNECTING: "Reconnecting",
  DISCONNECTED: "Offline",
  ERROR: "No connection",
};

/** Always-visible connection state: a dot plus a word, never colour alone. */
export function ConnectionIndicator({ status, resuming }: { status: ConnectionStatus; resuming: boolean }) {
  const live = status === "CONNECTED" && !resuming;
  const label = status === "CONNECTED" && resuming ? "Rejoining" : CONNECTION_LABEL[status];
  return (
    <span
      data-testid="connection-indicator"
      data-connection={live ? "live" : status.toLowerCase()}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-black tracking-widest uppercase"
    >
      <span
        aria-hidden="true"
        className={`size-2.5 rounded-full ${live ? "bg-lime-300" : status === "ERROR" || status === "DISCONNECTED" ? "bg-rose-400" : "bg-amber-300 motion-safe:animate-pulse"}`}
      />
      {label}
    </span>
  );
}

interface RoomHeaderProps {
  roomId: string;
  name: string | null;
  session: SessionSnapshot | null;
  connection: ConnectionStatus;
  resuming: boolean;
  /** Host-only controls shown right after the connection indicator (during the game). */
  hostControls?: ReactNode;
}

export function RoomHeader({ roomId, name, session, connection, resuming, hostControls = null }: RoomHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-baseline gap-3">
        <Kicker />
        <span className="font-mono text-sm text-emerald-100/70">{roomId}</span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {session !== null && name !== null && (
          <span className="truncate text-sm font-bold">
            {name}
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-black tracking-wide uppercase">
              {VIEWER_LABEL[viewerKind(session)]}
            </span>
          </span>
        )}
        <ConnectionIndicator status={connection} resuming={resuming} />
        {hostControls}
      </div>
    </header>
  );
}
