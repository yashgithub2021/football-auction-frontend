"use client";

import { useState, type FormEvent } from "react";
import type { GameSettings } from "@domain/types";
import { SettingField } from "@/components/setup/SettingField";
import { SETTING_COPY, SETTING_ORDER } from "@/components/setup/settingCopy";
import { inputsToSettings, settingInputId, settingsToInputs, type EditableSetting } from "@/components/setup/setupDraft";
import { useRequest, useRoomClient } from "@/state/room/RoomClientProvider";
import { errorText } from "./errorText";
import { ActionButton, ErrorMessage } from "./ui";

/**
 * Host edits the room's settings. Values are sent as typed (the timer in
 * seconds → ms); the server validates them and replies with its own message.
 * Keyed by the server's settings, so it resets whenever they change.
 */
export function LobbySettingsForm({ settings, locked }: { settings: GameSettings; locked: boolean }) {
  const client = useRoomClient();
  const [inputs, setInputs] = useState(() => settingsToInputs(settings));
  const save = useRequest(client.updateSettings);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save.run(inputsToSettings(inputs));
  };

  const setField = (field: EditableSetting, value: string) => setInputs((current) => ({ ...current, [field]: value }));

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {SETTING_ORDER.map((field) => (
          <SettingField
            key={field}
            id={`lobby-${settingInputId(field)}`}
            label={SETTING_COPY[field].label}
            hint={SETTING_COPY[field].hint}
            prefix={SETTING_COPY[field].prefix}
            suffix={SETTING_COPY[field].suffix}
            value={inputs[field]}
            errors={[]}
            onChange={(value) => setField(field, value)}
            onBlur={() => undefined}
          />
        ))}
      </div>
      <ErrorMessage>{save.error !== null && errorText(save.error)}</ErrorMessage>
      <ActionButton type="submit" tone="secondary" unavailable={locked} pending={save.pending}>
        Save settings
      </ActionButton>
    </form>
  );
}
