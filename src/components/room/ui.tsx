/** Small shared building blocks for the room screens. */

import type { ButtonHTMLAttributes, ReactNode } from "react";

export const PAGE_BACKGROUND =
  "min-h-screen bg-[radial-gradient(ellipse_at_top,var(--color-emerald-800),var(--color-emerald-950)_60%)]";

type Tone = "primary" | "secondary" | "danger";

const TONES: Record<Tone, string> = {
  primary: "bg-lime-300 text-emerald-950 hover:bg-lime-200",
  secondary: "border-2 border-white/25 text-white hover:border-white/60 hover:bg-white/10",
  danger: "border-2 border-rose-400/60 text-rose-100 hover:bg-rose-500/20",
};

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  /** Looks and announces as unavailable, but stays focusable and clickable (the server explains why). */
  unavailable?: boolean;
  pending?: boolean;
}

export function ActionButton({ tone = "primary", unavailable = false, pending = false, className = "", children, ...rest }: ActionButtonProps) {
  return (
    <button
      type="button"
      aria-disabled={unavailable || pending}
      aria-busy={pending}
      className={`rounded-2xl px-5 py-3 text-lg font-black transition focus-visible:ring-4 focus-visible:ring-white focus-visible:outline-none ${
        unavailable ? "cursor-not-allowed bg-white/10 text-white/40" : TONES[tone]
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  if (children === null || children === undefined || children === false) return null;
  return (
    <p role="alert" className="rounded-xl bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-100">
      {children}
    </p>
  );
}

export function Card({ children, className = "", labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function Kicker() {
  return <p className="text-sm font-black tracking-[0.3em] text-lime-300 uppercase">Football Auction</p>;
}
