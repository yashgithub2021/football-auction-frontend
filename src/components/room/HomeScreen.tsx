"use client";

import { useId, useState, type FormEvent } from "react";
import { MAX_NAME_LENGTH, ROOM_ID_PATTERN } from "@protocol";
import { useRequest, useRoomClient, useRoomState } from "@/state/room/RoomClientProvider";
import { ConnectionBanner } from "./ConnectionBanner";
import { errorText } from "./errorText";
import { ActionButton, Card, ErrorMessage, Kicker, PAGE_BACKGROUND } from "./ui";

/** Accepts a bare room code or a full invite link and returns the room id, if any. */
export function parseInvite(input: string): string | null {
  const trimmed = input.trim();
  const candidate = trimmed.split(/[/?#]/).filter((part) => part.length > 0).reverse().find((part) => ROOM_ID_PATTERN.test(part));
  return candidate ?? null;
}

const INPUT =
  "mt-2 w-full rounded-2xl border-2 border-white/10 bg-emerald-950/60 px-4 py-3 text-xl font-bold text-white outline-none placeholder:font-normal placeholder:text-white/30 focus:border-lime-300 focus:ring-2 focus:ring-lime-300";
const LABEL = "text-sm font-bold tracking-wide text-emerald-100 uppercase";

export function HomeScreen({ onEntered }: { onEntered: (roomId: string) => void }) {
  const client = useRoomClient();
  const state = useRoomState();
  const ids = useId();
  const [hostName, setHostName] = useState("");
  const [playing, setPlaying] = useState(true);
  const [invite, setInvite] = useState("");
  const [joinName, setJoinName] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const create = useRequest(client.createRoom.bind(client));
  const join = useRequest(client.joinRoom.bind(client));

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const result = await create.run({ name: hostName, playing });
    if (result.ok) onEntered(result.data.roomId);
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    const roomId = parseInvite(invite);
    setInviteError(roomId === null ? "Enter the room code or paste the invite link." : null);
    if (roomId === null) return;
    const result = await join.run({ roomId, name: joinName });
    if (result.ok) onEntered(result.data.roomId);
  };

  return (
    <main className={`${PAGE_BACKGROUND} px-4 py-8 sm:px-8 sm:py-12`}>
      <div className="mx-auto max-w-5xl">
        <header>
          <Kicker />
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">Auction night</h1>
          <p className="mt-3 max-w-2xl text-lg text-emerald-100/80">
            Create a room and share the link. Everyone bids from their own phone.
          </p>
        </header>

        <div className="mt-6">
          <ConnectionBanner status={state.connection} resuming={false} />
        </div>
        {state.notice !== null && (
          <p role="status" className="mt-4 rounded-2xl bg-white/10 px-4 py-3 font-semibold">
            {state.notice.message}
          </p>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card labelledBy={`${ids}-create`}>
            <h2 id={`${ids}-create`} className="text-2xl font-black">
              Host a room
            </h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-4" noValidate>
              <div>
                <label htmlFor={`${ids}-host-name`} className={LABEL}>
                  Your name
                </label>
                <input
                  id={`${ids}-host-name`}
                  value={hostName}
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="off"
                  onChange={(event) => setHostName(event.target.value)}
                  placeholder="e.g. Yash"
                  className={INPUT}
                />
              </div>
              <label className="flex items-center gap-3 text-lg font-semibold">
                <input
                  type="checkbox"
                  checked={playing}
                  onChange={(event) => setPlaying(event.target.checked)}
                  className="size-5 accent-lime-300"
                />
                I&apos;m playing too
              </label>
              <ErrorMessage>{create.error !== null && errorText(create.error)}</ErrorMessage>
              <ActionButton type="submit" pending={create.pending} className="w-full py-4 text-xl uppercase">
                Create room
              </ActionButton>
            </form>
          </Card>

          <Card labelledBy={`${ids}-join`}>
            <h2 id={`${ids}-join`} className="text-2xl font-black">
              Join a room
            </h2>
            <form onSubmit={handleJoin} className="mt-4 space-y-4" noValidate>
              <div>
                <label htmlFor={`${ids}-invite`} className={LABEL}>
                  Room code or invite link
                </label>
                <input
                  id={`${ids}-invite`}
                  value={invite}
                  autoComplete="off"
                  onChange={(event) => setInvite(event.target.value)}
                  placeholder="e.g. tafd9jxcgj"
                  className={INPUT}
                />
              </div>
              <div>
                <label htmlFor={`${ids}-join-name`} className={LABEL}>
                  Your name
                </label>
                <input
                  id={`${ids}-join-name`}
                  value={joinName}
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="off"
                  onChange={(event) => setJoinName(event.target.value)}
                  placeholder="e.g. Viraj"
                  className={INPUT}
                />
              </div>
              <ErrorMessage>{inviteError ?? (join.error !== null && errorText(join.error))}</ErrorMessage>
              <ActionButton type="submit" tone="secondary" pending={join.pending} className="w-full py-4 text-xl uppercase">
                Join room
              </ActionButton>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
