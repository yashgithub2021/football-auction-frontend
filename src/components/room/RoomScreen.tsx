"use client";

import { useEffect, useState } from "react";
import { ROOM_ID_PATTERN } from "@protocol";
import { AuctionComplete } from "@/components/auction/AuctionComplete";
import { ResultsScreen } from "@/components/results/ResultsScreen";
import { useRoomClient, useRoomState, useServerNow } from "@/state/room/RoomClientProvider";
import { AuctionRoom } from "./AuctionRoom";
import { ConnectionBanner } from "./ConnectionBanner";
import { errorText } from "./errorText";
import { JoinRoomForm } from "./JoinRoomForm";
import { LobbyScreen } from "./LobbyScreen";
import { RoomHeader } from "./RoomHeader";
import { PAGE_BACKGROUND } from "./ui";

/**
 * /room/:roomId. Attaches to the room (resuming a saved session if there is
 * one, otherwise offering to join), then renders whatever the server's
 * snapshot says the room is doing. While disconnected the last snapshot is
 * shown, clearly marked as not live, and actions are unavailable.
 */
/** Answers meaning "you need to join (again)". Anything else is temporary and retried. */
const JOIN_NEEDED: ReadonlySet<string> = new Set(["NO_SESSION", "SESSION_INVALID", "ROOM_NOT_FOUND"]);

type Entry = { kind: "pending" } | { kind: "join" } | { kind: "retrying"; message: string };

export function RoomScreen({ roomId }: { roomId: string }) {
  const client = useRoomClient();
  const state = useRoomState();
  const validId = ROOM_ID_PATTERN.test(roomId);
  const attached = state.roomId === roomId && state.snapshot !== null && state.session !== null;
  const [entry, setEntry] = useState<Entry>({ kind: "pending" });
  const connection = state.connection;

  useEffect(() => {
    // Try once per connected period: a temporary failure is retried when the connection comes back.
    if (!validId || attached || connection !== "CONNECTED") return undefined;
    let cancelled = false;
    void client.enterRoom(roomId).then((result) => {
      if (cancelled || result.ok) return;
      setEntry(JOIN_NEEDED.has(result.error.code) ? { kind: "join" } : { kind: "retrying", message: errorText(result.error) });
    });
    return () => {
      cancelled = true;
    };
  }, [client, roomId, validId, attached, connection]);

  const status = state.snapshot?.status;
  const live = state.connection === "CONNECTED" && !state.resuming;
  const clockRunning = attached && (status === "COUNTDOWN" || status === "IN_GAME");
  const serverNow = useServerNow(clockRunning);
  const myName = state.snapshot?.participants.find((p) => p.participantId === state.session?.participantId)?.name ?? null;

  let body;
  if (!validId) {
    body = <p className="text-lg">That invite link isn&apos;t valid. Check the room code.</p>;
  } else if (!attached || state.snapshot === null || state.session === null) {
    body =
      entry.kind === "join" ? (
        <JoinRoomForm roomId={roomId} />
      ) : entry.kind === "retrying" ? (
        <p role="status" className="text-lg text-emerald-100/80">
          Can&apos;t reach the room yet: {entry.message} Retrying when the connection is back…
        </p>
      ) : (
        <p className="text-lg text-emerald-100/80">Opening room…</p>
      );
  } else if (state.snapshot.status === "LOBBY" || state.snapshot.status === "COUNTDOWN") {
    body = <LobbyScreen snapshot={state.snapshot} session={state.session} serverNow={serverNow} live={live} />;
  } else if (state.snapshot.status === "IN_GAME") {
    body = <AuctionRoom snapshot={state.snapshot} session={state.session} serverNow={serverNow} live={live} />;
  } else if (state.snapshot.status === "FINISHED" && state.snapshot.results !== null) {
    body = <ResultsScreen session={state.session} results={state.snapshot.results} live={live} />;
  } else if (state.snapshot.status === "FINISHED" && state.snapshot.game !== null) {
    // Only if a server sent a finished room without results: say how it ended.
    return <AuctionComplete game={state.snapshot.game} />;
  } else {
    body = <p className="text-lg">This room has closed.</p>;
  }

  return (
    <main className={`${PAGE_BACKGROUND} px-3 py-3 sm:px-6 sm:py-6`}>
      <div className="mx-auto max-w-[110rem] space-y-3 sm:space-y-4">
        <RoomHeader
          roomId={roomId}
          name={attached ? myName : null}
          session={attached ? state.session : null}
          connection={state.connection}
          resuming={state.resuming}
        />
        <ConnectionBanner status={state.connection} resuming={state.resuming} />
        {state.notice !== null && !attached && (
          <p role="status" className="rounded-2xl bg-white/10 px-4 py-3 font-semibold">
            {state.notice.message}
          </p>
        )}
        {body}
      </div>
    </main>
  );
}
