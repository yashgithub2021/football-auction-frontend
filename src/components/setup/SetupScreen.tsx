"use client";

import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import { createGame } from "@domain/engine";
import type { Game, SetupError } from "@domain/types";
import { createGameId } from "@/lib/gameId";
import { ManagerList } from "./ManagerList";
import { PlayerPoolCheck } from "./PlayerPoolCheck";
import { SettingField } from "./SettingField";
import { SETTING_COPY, SETTING_ORDER } from "./settingCopy";
import {
  PLAYER_POOL_SIZE,
  addManager,
  createInitialDraft,
  draftManagerNames,
  draftToSettings,
  inputIdForError,
  isImmediateError,
  isManagerListError,
  isPoolError,
  managerNameField,
  removeManager,
  renameManager,
  settingInputId,
  updateSetting,
  validateDraft,
  type EditableSetting,
  type SetupDraft,
} from "./setupDraft";



const SUMMARY_HEADING_ID = "setup-errors-heading";

export interface SetupScreenProps {
  /** Pre-filled draft, e.g. when returning from the ready screen. */
  initialDraft?: SetupDraft;
  onGameCreated: (game: Game) => void;
  /** Injected for tests; defaults to a random id. */
  createId?: () => string;
  /** Injected for tests; defaults to the real clock. */
  now?: () => number;
}

export function SetupScreen({
  initialDraft,
  onGameCreated,
  createId = createGameId,
  now = Date.now,
}: SetupScreenProps) {
  const [draft, setDraft] = useState<SetupDraft>(() => initialDraft ?? createInitialDraft());
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [attempts, setAttempts] = useState(0);
  const [submitErrors, setSubmitErrors] = useState<readonly SetupError[] | null>(null);

  const focusOnMountKey = useRef<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const errors = useMemo(() => validateDraft(draft), [draft]);
  const canStart = errors.length === 0;
  const attempted = attempts > 0;

  const change = (next: SetupDraft) => {
    setDraft(next);
    // A stale summary would describe a form that no longer exists.
    setSubmitErrors(null);
  };

  const touch = (key: string) => {
    setTouched((previous) => (previous.has(key) ? previous : new Set(previous).add(key)));
  };

  const isVisible = (error: SetupError, touchKey: string) =>
    isImmediateError(error) || attempted || touched.has(touchKey);

  const settingErrors = (field: EditableSetting) =>
    errors.filter((error) => error.field === field && isVisible(error, field)).map((error) => error.message);

  const rowErrors = (index: number) => {
    const row = draft.managers[index];
    if (row === undefined) return [];
    return errors
      .filter((error) => error.field === managerNameField(index) && isVisible(error, row.key))
      .map((error) => error.message);
  };

  const listErrors = errors.filter(isManagerListError).map((error) => error.message);
  const poolError = errors.find(isPoolError)?.message ?? null;
  const settings = draftToSettings(draft);
  const teamSizeValid = !errors.some((error) => error.field === "teamSize");

  const handleAdd = () => {
    const next = addManager(draft);
    focusOnMountKey.current = next.managers.at(-1)?.key ?? null;
    change(next);
  };

  const handleRemove = (key: string) => {
    change(removeManager(draft, key));
    // The removed row took focus with it; land somewhere predictable.
    addButtonRef.current?.focus();
  };

  const nameInputRef = (key: string) => (element: HTMLInputElement | null) => {
    if (element !== null && focusOnMountKey.current === key) {
      focusOnMountKey.current = null;
      element.focus();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Always go through the domain: it is the only authority on validity,
    // even if the live check above says the form looks fine.
    const result = createGame({
      id: createId(),
      managerNames: draftManagerNames(draft),
      settings: draftToSettings(draft),
      now: now(),
    });
    if (result.ok) {
      onGameCreated(result.game);
      return;
    }
    setSubmitErrors(result.errors);
    setAttempts((count) => count + 1);
  };

  // Ref callbacks must be stable: React re-runs a new callback on every render,
  // which would keep dragging focus away from whatever the host is editing.
  // The summary is remounted per attempt (key), so it still gets focus each time.
  const focusSummary = useCallback((element: HTMLElement | null) => {
    element?.focus();
  }, []);

  const returning = initialDraft !== undefined;
  const focusHeading = useCallback(
    (element: HTMLHeadingElement | null) => {
      // Returning from another screen: move focus to the top of this one.
      if (returning) element?.focus();
    },
    [returning],
  );

  const issueCount = errors.length;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,var(--color-emerald-800),var(--color-emerald-950)_60%)] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-black tracking-[0.3em] text-lime-300 uppercase">Football Auction</p>
          <h1 ref={focusHeading} tabIndex={-1} className="mt-2 text-4xl font-black tracking-tight outline-none sm:text-6xl">
            Set up your auction
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-emerald-100/80">
            Add your managers and set the rules. Players are drawn at random, so nobody gets to cherry-pick.
          </p>
        </header>

        <form noValidate onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <ManagerList
            managers={draft.managers}
            listErrors={listErrors}
            rowErrors={rowErrors}
            onRename={(key, name) => change(renameManager(draft, key, name))}
            onRemove={handleRemove}
            onAdd={handleAdd}
            onBlur={touch}
            nameInputRef={nameInputRef}
            addButtonRef={addButtonRef}
          />

          <div className="space-y-6">
            <section
              aria-labelledby="rules-heading"
              className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 sm:p-7"
            >
              <h2 id="rules-heading" className="text-2xl font-black tracking-tight">
                Auction rules
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {SETTING_ORDER.map((field) => (
                  <SettingField
                    key={field}
                    id={settingInputId(field)}
                    label={SETTING_COPY[field].label}
                    hint={SETTING_COPY[field].hint}
                    prefix={SETTING_COPY[field].prefix}
                    suffix={SETTING_COPY[field].suffix}
                    value={draft.settings[field]}
                    errors={settingErrors(field)}
                    onChange={(value) => {
                      touch(field);
                      change(updateSetting(draft, field, value));
                    }}
                    onBlur={() => touch(field)}
                  />
                ))}
              </div>
            </section>

            <PlayerPoolCheck
              poolSize={PLAYER_POOL_SIZE}
              managerCount={draft.managers.length}
              teamSize={teamSizeValid ? settings.teamSize : null}
              poolError={poolError}
            />

            {submitErrors !== null && submitErrors.length > 0 && (
              <section
                key={attempts}
                ref={focusSummary}
                tabIndex={-1}
                aria-labelledby={SUMMARY_HEADING_ID}
                className="rounded-3xl border-2 border-rose-400 bg-rose-500/15 p-5 outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                <h2 id={SUMMARY_HEADING_ID} className="text-lg font-black">
                  Fix these to start
                </h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-rose-100">
                  {submitErrors.map((error, index) => {
                    const target = inputIdForError(error, draft);
                    return (
                      <li key={`${error.code}-${error.field ?? "game"}-${index}`}>
                        {target === null ? (
                          error.message
                        ) : (
                          <a href={`#${target}`} className="underline underline-offset-2 hover:text-white">
                            {error.message}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <div>
              <button
                type="submit"
                aria-disabled={!canStart}
                aria-describedby="start-status"
                className={`w-full rounded-3xl px-6 py-6 text-2xl font-black tracking-wide uppercase transition focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none sm:text-3xl ${
                  canStart
                    ? "bg-lime-300 text-emerald-950 shadow-xl shadow-lime-300/20 hover:-translate-y-0.5 hover:bg-lime-200"
                    : "cursor-not-allowed bg-white/10 text-white/50"
                }`}
              >
                Start game
              </button>
              <p id="start-status" className="mt-3 text-center text-sm text-emerald-100/80">
                {canStart
                  ? `${draft.managers.length} managers, ${settings.teamSize} players each. Ready to go.`
                  : `${issueCount} ${issueCount === 1 ? "problem" : "problems"} to fix before you can start.`}
              </p>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
