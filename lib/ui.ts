import { clsx } from "clsx";
import type { Tone } from "./signals";

export { clsx as cn };

const BUTTON_VARIANTS = {
  default: "border-line-strong bg-surface text-fg hover:bg-surface-2",
  primary: "border-fg bg-fg text-bg hover:opacity-90",
  ghost: "border-transparent bg-transparent text-muted hover:text-fg",
};

// Each size owns its gap, radius, weight and touch height, so no two classes ever fight.
const BUTTON_SIZES = {
  sm: "min-h-[30px] gap-1.5 rounded-lg px-2.5 text-xs font-medium pointer-coarse:min-h-11",
  md: "min-h-[34px] gap-1.5 rounded-lg px-3 text-sm font-medium pointer-coarse:min-h-11",
  lg: "min-h-12 gap-2 rounded-[10px] px-6 text-md font-semibold",
  icon: "size-[34px] rounded-lg pointer-coarse:size-11",
};

/** Button styles, for <button> and for links that look like buttons. */
export function button({ variant = "default", size = "md" }: { variant?: keyof typeof BUTTON_VARIANTS; size?: keyof typeof BUTTON_SIZES } = {}) {
  return clsx(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap border transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
  );
}

/** The second line of every PR: small muted details separated by gaps. */
export const META = "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted";

/** PR title on a "Needs you" card. */
export const TASK_TITLE = "text-md font-semibold leading-[1.35] text-pretty text-fg wrap-anywhere";

/** Sets --tone/--tone-bg for the element, so `text-tone`, `bg-tone-bg` and `border-tone` pick it up. */
export const tone = (t: Tone) => `tone-${t}`;

/** Static list so Tailwind generates every tone-* class used through `tone()`. */
export const TONE_CLASSES = "tone-red tone-orange tone-yellow tone-blue tone-purple tone-green tone-gray";
