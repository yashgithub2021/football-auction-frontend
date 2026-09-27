import type { Ref } from "react";
import { MANAGER_LIST_ID, managerInputId, type ManagerDraft } from "./setupDraft";

interface ManagerListProps {
  managers: readonly ManagerDraft[];
  /** Errors about the list as a whole (e.g. too few managers). */
  listErrors: readonly string[];
  rowErrors: (index: number) => readonly string[];
  onRename: (key: string, name: string) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
  onBlur: (key: string) => void;
  nameInputRef: (key: string) => Ref<HTMLInputElement>;
  addButtonRef: Ref<HTMLButtonElement>;
}

export function ManagerList({
  managers,
  listErrors,
  rowErrors,
  onRename,
  onRemove,
  onAdd,
  onBlur,
  nameInputRef,
  addButtonRef,
}: ManagerListProps) {
  const count = managers.length;
  const listErrorId = `${MANAGER_LIST_ID}-error`;

  return (
    <section
      id={MANAGER_LIST_ID}
      tabIndex={-1}
      aria-labelledby="managers-heading"
      aria-describedby={listErrors.length > 0 ? listErrorId : undefined}
      className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 outline-none sm:p-7"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="managers-heading" className="text-2xl font-black tracking-tight">
            Managers
          </h2>
          <p className="mt-1 text-sm text-emerald-200/70">Everyone bidding in this auction.</p>
        </div>
        <p className="text-right" aria-live="polite">
          <span className="block text-4xl leading-none font-black text-lime-300 tabular-nums">{count}</span>
          <span className="text-xs font-bold tracking-widest text-emerald-200/70 uppercase">
            {count === 1 ? "manager" : "managers"}
          </span>
        </p>
      </div>

      {listErrors.length > 0 && (
        <ul id={listErrorId} className="mt-4 rounded-xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200">
          {listErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {count === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-white/15 px-4 py-8 text-center text-emerald-200/70">
          No managers yet.
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {managers.map((manager, index) => {
            const number = index + 1;
            const inputId = managerInputId(manager.key);
            const errorId = `${inputId}-error`;
            const errors = rowErrors(index);
            const invalid = errors.length > 0;
            const trimmedName = manager.name.trim();

            return (
              <li key={manager.key}>
                <div
                  className={`flex items-center gap-3 rounded-2xl border-2 bg-emerald-950/60 p-2 pl-3 transition focus-within:ring-2 focus-within:ring-lime-300 ${
                    invalid ? "border-rose-400" : "border-white/10 focus-within:border-lime-300"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-lg font-black text-emerald-950 tabular-nums"
                  >
                    {number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <label htmlFor={inputId} className="block text-xs font-bold tracking-widest text-emerald-200/70 uppercase">
                      Manager {number}
                    </label>
                    <input
                      ref={nameInputRef(manager.key)}
                      id={inputId}
                      type="text"
                      value={manager.name}
                      placeholder="Enter a name"
                      autoComplete="off"
                      onChange={(event) => onRename(manager.key, event.target.value)}
                      onBlur={() => onBlur(manager.key)}
                      aria-invalid={invalid}
                      aria-describedby={invalid ? errorId : undefined}
                      className="w-full truncate bg-transparent text-xl font-bold text-white outline-none placeholder:font-normal placeholder:text-white/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(manager.key)}
                    aria-label={`Remove manager ${number}${trimmedName === "" ? "" : ` (${trimmedName})`}`}
                    className="shrink-0 rounded-xl px-3 py-2 text-sm font-bold text-emerald-200 transition hover:bg-rose-500/20 hover:text-rose-200 focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:outline-none"
                  >
                    Remove
                  </button>
                </div>
                {invalid && (
                  <ul id={errorId} className="mt-1 space-y-1 pl-3 text-sm font-semibold text-rose-300">
                    {errors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <button
        ref={addButtonRef}
        type="button"
        onClick={onAdd}
        className="mt-4 w-full rounded-2xl border-2 border-dashed border-lime-300/50 px-4 py-4 text-lg font-black text-lime-300 transition hover:border-lime-300 hover:bg-lime-300/10 focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:outline-none"
      >
        <span aria-hidden="true">+ </span>Add manager
      </button>
    </section>
  );
}
