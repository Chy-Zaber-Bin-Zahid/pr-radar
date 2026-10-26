"use client";

import { ArrowSquareOut, Check } from "@phosphor-icons/react";
import type { Activity, PullRequest } from "@/lib/types";
import { TASK_KEYS, type Signal, type Task } from "@/lib/signals";
import { CommentPreview, PrMeta, StatusBadges } from "./PrParts";
import { SignalIcon } from "./SignalIcon";

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
    <li className={`task tone-${primary.tone}`}>
      <span className="task-icon">
        <SignalIcon signal={primary.key} size={18} />
      </span>

      <div className="task-body">
        <p className="task-action">{primary.label}</p>
        <a className="task-title" href={pr.url} target="_blank" rel="noreferrer" onClick={onSeen} onAuxClick={onSeen}>
          {pr.title} <span className="pr-number">#{pr.number}</span>
        </a>
        <PrMeta pr={pr} viewer={viewer} now={now} showRepo announce={announce} />
        {others.length > 0 && (
          <ul className="task-also" aria-label="Also">
            {others.map((t) => (
              <li key={t.key} className={`tone-${t.tone}`}>
                <SignalIcon signal={t.key} size={12} />
                {t.label}
              </li>
            ))}
          </ul>
        )}
        {fresh[0] && <CommentPreview latest={fresh[0]} now={now} onOpen={onSeen} />}
      </div>

      <div className="task-side">
        <StatusBadges signals={status} />
        <div className="task-actions">
          {fresh.length > 0 && (
            <button type="button" className="button button-sm" onClick={onSeen}>
              <Check size={14} weight="bold" aria-hidden />
              Mark read
            </button>
          )}
          <a className="button button-sm button-primary" href={pr.url} target="_blank" rel="noreferrer" onClick={onSeen} onAuxClick={onSeen}>
            Open
            <ArrowSquareOut size={14} weight="bold" aria-hidden />
          </a>
        </div>
      </div>
    </li>
  );
}
