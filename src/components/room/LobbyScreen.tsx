"use client";

import { useEffect, useState } from "react";
import { MS_PER_SECOND } from "@domain/constants";
import type { PublicRoomSnapshot, SessionSnapshot } from "@protocol";
import { useRequest, useRoomClient } from "@/state/room/RoomClientProvider";
import { CountdownOverlay } from "./CountdownOverlay";
import { errorText } from "./errorText";
import { LobbySettingsForm } from "./LobbySettingsForm";
import { ActionButton, Card, ErrorMessage } from "./ui";

interface LobbyScreenProps {
  snapshot: PublicRoomSnapshot;
  session: SessionSnapshot;
  serverNow: number;
  /** Connected and attached; actions are unavailable otherwise. */
  live: boolean;
}

function InviteCard({ roomId }: { roomId: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    // window is only available after mounting.
    const id = setTimeout(() => setOrigin(window.location.origin), 0);
    return () => clearTimeout(id);
  }, []);
  const link = `${origin}/room/${roomId}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Card labelledBy="invite-heading" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 id="invite-heading" className="text-xs font-bold tracking-widest text-emerald-200/80 uppercase">
          Invite your friends
        </h2>
        <p className="mt-1 font-mono text-3xl font-black tracking-wider text-lime-300" aria-label={`Room code ${roomId.split("").join(" ")}`}>
          {roomId}
        </p>
        <p className="truncate text-sm text-emerald-100/70">{link}</p>
      </div>
      <ActionButton tone="secondary" onClick={copy} className="min-h-12 shrink-0">
        {copied ? "Link copied" : "Copy invite link"}
      </ActionButton>
    </Card>
  );
}

/**
 * Lobby, phone-first: invite, participants and rules stack on small screens
 * (two columns from `lg`), and the main action (Start for the host, Ready for
 * managers) sits in a bar pinned to the bottom of the screen until `lg`.
 * Every rule (who may start, valid settings) is the server's; the lobby shows
 * the server's start blockers and error messages as-is.
 */
export function LobbyScreen({ snapshot, session, serverNow, live }: LobbyScreenProps) {
  const client = useRoomClient();
  const ready = useRequest(client.setReady);
  const playing = useRequest(client.setPlaying);
  const remove = useRequest(client.removeParticipant);
  const start = useRequest(client.startCountdown);
  const cancel = useRequest(client.cancelCountdown);

  const me = snapshot.participants.find((p) => p.participantId === session.participantId);
  const isHost = session.isHost;
  const counting = snapshot.status === "COUNTDOWN";
  const { settings } = snapshot;
  const actionError = [ready, playing, remove, start].find((request) => request.error !== null)?.error ?? null;
  const playingCount = snapshot.participants.filter((p) => p.playing).length;
  const readyCount = snapshot.participants.filter((p) => p.playing && (p.ready || p.participantId === snapshot.hostParticipantId)).length;
  const showActionBar = isHost || (me !== undefined && me.playing);

  return (
    <div className={`space-y-4 sm:space-y-6 ${showActionBar ? "pb-44 lg:pb-0" : ""}`}>
      {counting && snapshot.countdown !== null && (
        <CountdownOverlay
          countdown={snapshot.countdown}
          serverNow={serverNow}
          {...(isHost
            ? { onCancel: () => void cancel.run(), cancelPending: cancel.pending, cancelError: cancel.error !== null ? errorText(cancel.error) : null }
            : {})}
        />
      )}

      <InviteCard roomId={snapshot.roomId} />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card labelledBy="participants-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="participants-heading" className="text-2xl font-black">
              In the room <span className="text-lime-300">{snapshot.participants.length}</span>
            </h2>
            <p className="text-sm text-emerald-100/80">
              {readyCount}/{playingCount} ready
            </p>
          </div>
          <ul className="mt-4 space-y-2">
            {snapshot.participants.map((participant) => {
              const isMe = participant.participantId === session.participantId;
              const participantIsHost = participant.participantId === snapshot.hostParticipantId;
              return (
                <li
                  key={participant.participantId}
                  aria-label={participant.name}
                  className="flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-emerald-950/60 px-4 py-2"
                >
                  <span
                    aria-label={participant.connected ? "online" : "offline"}
                    className={`size-3 shrink-0 rounded-full ${participant.connected ? "bg-lime-300" : "bg-white/20"}`}
                  />
                  <span className="min-w-0 truncate text-lg font-bold">{participant.name}</span>
                  {!participant.connected && <span className="text-xs font-bold text-emerald-100/70 uppercase">offline</span>}
                  {isMe && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold uppercase">You</span>}
                  {participantIsHost && <span className="rounded-full bg-amber-300 px-2 py-0.5 text-xs font-black text-amber-950 uppercase">Host</span>}
                  {!participant.playing && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold uppercase">Watching</span>}
                  {participant.playing && !participantIsHost && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-black uppercase ${participant.ready ? "bg-lime-300 text-emerald-950" : "border border-white/30"}`}
                    >
                      {participant.ready ? "Ready" : "Not ready"}
                    </span>
                  )}
                  {isHost && !participantIsHost && !counting && (
                    <ActionButton
                      tone="danger"
                      className="ml-auto min-h-11 px-4 py-1 text-sm"
                      pending={remove.pending}
                      unavailable={!live}
                      aria-label={`Remove ${participant.name}`}
                      onClick={() => live && void remove.run(participant.participantId)}
                    >
                      Remove
                    </ActionButton>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card labelledBy="rules-heading">
          <h2 id="rules-heading" className="text-2xl font-black">
            Rules
          </h2>
          {isHost ? (
            <div className="mt-4 space-y-5">
              <label className="flex min-h-12 items-center gap-3 text-lg font-semibold">
                <input
                  type="checkbox"
                  checked={session.playing}
                  disabled={counting || !live}
                  onChange={(event) => void playing.run(event.target.checked)}
                  className="size-6 accent-lime-300"
                />
                I&apos;m playing too
              </label>
              <LobbySettingsForm key={JSON.stringify(settings)} settings={settings} locked={counting || !live} />
            </div>
          ) : (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
              {[
                ["Budget", `$${settings.startingBudget}`],
                ["Team size", String(settings.teamSize)],
                ["Minimum bid", `$${settings.minimumBid}`],
                ["Bid increment", `$${settings.bidIncrement}`],
                ["Timer", `${settings.auctionTimerMs / MS_PER_SECOND}s`],
                ["Order", settings.auctionOrder === "POSITION" ? "Positions" : "Random"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-emerald-950/60 px-2 py-3">
                  <dt className="text-xs font-bold tracking-widest text-emerald-200/80 uppercase">{label}</dt>
                  <dd className="text-2xl font-black tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>

      <ErrorMessage>{actionError !== null && errorText(actionError)}</ErrorMessage>

      {showActionBar && (
        <div
          data-testid="lobby-actions"
          className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-emerald-950/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
        >
          <div className="mx-auto max-w-3xl space-y-2">
            {isHost ? (
              <>
                {snapshot.startBlockers.length > 0 && !counting && (
                  <ul aria-label="Why you can't start yet" className="list-disc space-y-0.5 pl-5 text-sm text-emerald-100/90">
                    {snapshot.startBlockers.map((blocker) => (
                      <li key={`${blocker.code}-${blocker.message}`}>{blocker.message}</li>
                    ))}
                  </ul>
                )}
                <ActionButton
                  className="min-h-14 w-full text-xl uppercase sm:text-2xl"
                  unavailable={snapshot.startBlockers.length > 0 || !live || counting}
                  pending={start.pending}
                  onClick={() => live && void start.run()}
                >
                  Start auction
                </ActionButton>
              </>
            ) : (
              me !== undefined && (
                <ActionButton
                  className="min-h-14 w-full text-xl uppercase"
                  tone={me.ready ? "secondary" : "primary"}
                  pending={ready.pending}
                  unavailable={counting || !live}
                  onClick={() => live && void ready.run(!me.ready)}
                >
                  {me.ready ? "I'm not ready" : "I'm ready"}
                </ActionButton>
              )
            )}
            {!isHost && <p className="text-center text-sm text-emerald-100/70">Waiting for the host to start the auction.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
