"use client";

import type { ReactNode } from "react";
import { ArrowSquareOut, Check } from "@phosphor-icons/react";
import type { Activity, PullRequest } from "@/lib/types";
import { TASK_KEYS, type Signal, type SignalKey, type Task, type Tone } from "@/lib/signals";
import { TASK_TITLE, button, cn, tone } from "@/lib/ui";
import { CommentPreview, PrMeta, StatusBadges } from "./PrParts";
import { SignalIcon } from "./SignalIcon";

/** The card layout shared by real "Needs you" items and the landing page example. */
export function TaskFrame({ tone: t, icon, action, children, side }: { tone: Tone; icon: SignalKey; action: string; children: ReactNode; side?: ReactNode }) {
  return (
    <li
      className={cn(
        "relative flex gap-4 overflow-hidden rounded-xl border border-line bg-surface py-4 pr-4 pl-[19px] shadow-1 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-tone max-lg:flex-wrap",
        tone(t),
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-tone-bg text-tone">
        <SignalIcon signal={icon} size={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-sm font-semibold text-tone">{action}</p>
        {children}
      </div>
      {side && (
        <div className="flex max-w-[240px] shrink-0 flex-col items-end justify-between gap-3 max-lg:w-full max-lg:max-w-none max-lg:flex-row max-lg:flex-wrap max-lg:items-center max-lg:pl-[52px] max-md:pl-0">
          {side}
        </div>
      )}
    </li>
  );
}

type Props = {
  pr: PullRequest;
  tasks: Task[];
  fresh: Activity[];
  signals: Signal[];
  viewer: string;
  now: number;
  onSeen: () => void;
  announce: (message: string) => void;
};

/** A "Needs you" card: leads with what to do, then which PR it's on. */
export function TaskCard({ pr, tasks, fresh, signals, viewer, now, onSeen, announce }: Props) {
  const [primary, ...others] = tasks;
  // Task states are already spelled out above, so only show the remaining status badges.
  const status = signals.filter((s) => !TASK_KEYS.has(s.key));

  return (
    <TaskFrame
      tone={primary.tone}
      icon={primary.key}
      action={primary.label}
      side={
        <>
          <StatusBadges signals={status} className="max-lg:mr-auto max-lg:justify-start" />
          <div className="flex gap-2">
            {fresh.length > 0 && (
              <button type="button" className={button({ size: "sm" })} onClick={onSeen}>
                <Check size={14} weight="bold" aria-hidden />
                Mark read
              </button>
            )}
            <a className={button({ variant: "primary", size: "sm" })} href={pr.url} target="_blank" rel="noreferrer" onClick={onSeen} onAuxClick={onSeen}>
              Open
              <ArrowSquareOut size={14} weight="bold" aria-hidden />
            </a>
          </div>
        </>
      }
    >
      <a className={cn(TASK_TITLE, "hover:text-accent")} href={pr.url} target="_blank" rel="noreferrer" onClick={onSeen} onAuxClick={onSeen}>
        {pr.title} <span className="font-normal text-muted tabular-nums">#{pr.number}</span>
      </a>
      <PrMeta pr={pr} viewer={viewer} now={now} showRepo announce={announce} />
      {others.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold" aria-label="Also">
          {others.map((t) => (
            <li key={t.key} className={cn("inline-flex items-center gap-1 text-tone", tone(t.tone))}>
              <SignalIcon signal={t.key} size={12} />
              {t.label}
            </li>
          ))}
        </ul>
      )}
      {fresh[0] && <CommentPreview latest={fresh[0]} now={now} onOpen={onSeen} />}
    </TaskFrame>
  );
}
