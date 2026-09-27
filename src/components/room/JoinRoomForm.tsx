"use client";

import { useId, useState, type FormEvent } from "react";
import { MAX_NAME_LENGTH } from "@protocol";
import { useRequest, useRoomClient } from "@/state/room/RoomClientProvider";
import { errorText } from "./errorText";
import { ActionButton, Card, ErrorMessage } from "./ui";

/** Joining a room from its invite link. Identity and role are assigned by the server. */
export function JoinRoomForm({ roomId }: { roomId: string }) {
  const client = useRoomClient();
  const id = useId();
  const [name, setName] = useState("");
  const join = useRequest(client.joinRoom.bind(client));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await join.run({ roomId, name });
  };

  return (
    <Card labelledBy={`${id}-heading`} className="mx-auto max-w-lg">
      <h2 id={`${id}-heading`} className="text-2xl font-black">
        Join room <span className="font-mono text-lime-300">{roomId}</span>
      </h2>
      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <div>
          <label htmlFor={`${id}-name`} className="text-sm font-bold tracking-wide text-emerald-100 uppercase">
            Your name
          </label>
          <input
            id={`${id}-name`}
            value={name}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-2xl border-2 border-white/10 bg-emerald-950/60 px-4 py-3 text-xl font-bold text-white outline-none focus:border-lime-300 focus:ring-2 focus:ring-lime-300"
          />
        </div>
        <ErrorMessage>{join.error !== null && errorText(join.error)}</ErrorMessage>
        <ActionButton type="submit" pending={join.pending} className="w-full py-4 text-xl uppercase">
          Join
        </ActionButton>
      </form>
    </Card>
  );
}
