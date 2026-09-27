interface SettingFieldProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  /** Visual unit shown before the value, e.g. "$". Hidden from screen readers; the hint names the unit. */
  prefix?: string;
  /** Visual unit shown after the value, e.g. "sec". Hidden from screen readers like prefix. */
  suffix?: string;
  errors: readonly string[];
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function SettingField({ id, label, hint, value, prefix, suffix, errors, onChange, onBlur }: SettingFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = errors.length > 0;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold tracking-wide text-emerald-100 uppercase">
        {label}
      </label>
      <div
        className={`mt-2 flex items-center rounded-2xl border-2 bg-emerald-950/60 transition focus-within:ring-2 focus-within:ring-lime-300 ${
          invalid ? "border-rose-400" : "border-white/10 focus-within:border-lime-300"
        }`}
      >
        {prefix !== undefined && (
          <span aria-hidden="true" className="pl-4 text-2xl font-black text-emerald-400">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          step={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
          className="w-full min-w-0 bg-transparent px-3 py-3 text-3xl font-black text-white tabular-nums outline-none"
        />
        {suffix !== undefined && (
          <span aria-hidden="true" className="pr-4 text-lg font-bold text-emerald-400">
            {suffix}
          </span>
        )}
      </div>
      <p id={hintId} className="mt-2 text-sm text-emerald-200/70">
        {hint}
      </p>
      {invalid && (
        <ul id={errorId} className="mt-1 space-y-1 text-sm font-semibold text-rose-300">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
