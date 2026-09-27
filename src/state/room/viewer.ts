/**
 * Who is looking at the room, derived ONLY from the server's private session
 * snapshot. There is no way to pick a role in the UI.
 */

import type { PublicRoomSnapshot, SessionSnapshot } from "@protocol";

export type ViewerKind = "HOST_PLAYING" | "HOST" | "MANAGER" | "SPECTATOR";

export function viewerKind(session: SessionSnapshot): ViewerKind {
  if (session.isHost) return session.playing ? "HOST_PLAYING" : "HOST";
  return session.role === "SPECTATOR" ? "SPECTATOR" : "MANAGER";
}

export const VIEWER_LABEL: Record<ViewerKind, string> = {
  HOST_PLAYING: "Host · playing",
  HOST: "Host",
  MANAGER: "Manager",
  SPECTATOR: "Watching",
};

/** Whether each domain manager is connected, from the snapshot's participants. */
export function managerPresence(snapshot: PublicRoomSnapshot): ReadonlyMap<string, boolean> {
  const presence = new Map<string, boolean>();
  for (const participant of snapshot.participants) {
    if (participant.managerId !== null) presence.set(participant.managerId, participant.connected);
  }
  return presence;
}

/** Playing viewers get the mobile-first bidding view; everyone else the board view. */
export function usesManagerView(session: SessionSnapshot): boolean {
  const kind = viewerKind(session);
  return (kind === "HOST_PLAYING" || kind === "MANAGER") && session.managerId !== null;
}
