import type { ReactNode } from "react";
import type { Tone } from "@/lib/signals";
import { cn, tone } from "@/lib/ui";
import { Logo } from "./Logo";

export function Brand({ href, large, className }: { href?: string; large?: boolean; className?: string }) {
  const classes = cn("inline-flex items-center gap-2 font-semibold tracking-[-0.01em] text-fg", large ? "text-lg" : "text-md", className);
  const content = (
    <>
      <Logo />
      <span>PR Radar</span>
    </>
  );
  return href ? (
    <a href={href} className={classes}>
      {content}
    </a>
  ) : (
    <div className={classes}>{content}</div>
  );
}

/** A full-width message strip: errors, warnings. */
export function Banner({ tone: t, icon, role, children }: { tone: Tone; icon?: ReactNode; role?: "alert"; children: ReactNode }) {
  return (
    <div role={role} className={cn("flex w-full items-center gap-3 rounded-xl border border-tone/30 bg-tone-bg px-4 py-3 text-fg [&>svg]:shrink-0 [&>svg]:text-tone", tone(t))}>
      {icon}
      {children}
    </div>
  );
}

/** A small rounded count next to a heading; blue when it's asking for attention. */
export function CountPill({ count, accent }: { count: number; accent?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 font-mono text-xs leading-5",
        accent ? "border-transparent bg-accent font-semibold text-bg" : "border-line bg-surface-2 text-muted",
      )}
    >
      {count}
    </span>
  );
}
