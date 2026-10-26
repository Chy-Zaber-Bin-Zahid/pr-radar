"use client";

import { useState } from "react";
import { Check, Copy, HourglassMedium } from "@phosphor-icons/react";
import type { Activity, PullRequest } from "@/lib/types";
import type { Signal } from "@/lib/signals";
import { timeAgo } from "@/lib/time";
import { META, cn, tone } from "@/lib/ui";
import { SignalIcon } from "./SignalIcon";

const DEFAULT_BRANCHES = new Set(["main", "master"]);

export function Time({ iso, now }: { iso: string; now: number }) {
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()}>
      {timeAgo(iso, now)}
    </time>
  );
}

function BranchButton({ head, base, announce }: { head: string; base: string; announce: (message: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(head);
      setCopied(true);
      announce(`Copied branch name ${head}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1">
      <button
        type="button"
        className="inline-flex min-h-6 min-w-0 max-w-[300px] items-center gap-[5px] rounded-md border border-line bg-surface px-1.5 font-mono text-xs text-muted transition hover:border-line-strong hover:text-fg max-md:max-w-[220px] pointer-coarse:min-h-11"
        onClick={copy}
        title={`${head} → ${base}`}
        aria-label={`Copy branch name ${head}`}
      >
        {copied ? <Check className="shrink-0" size={12} weight="bold" aria-hidden /> : <Copy className="shrink-0" size={12} weight="bold" aria-hidden />}
        <span className="min-w-0 truncate">{head}</span>
      </button>
      {!DEFAULT_BRANCHES.has(base) && <span className="font-mono">→ {base}</span>}
    </span>
  );
}

/** Repo, author, branch, age and pending reviewers. */
export function PrMeta({
  pr,
  viewer,
  now,
  showRepo,
  announce,
}: {
  pr: PullRequest;
  viewer: string;
  now: number;
  showRepo: boolean;
  announce: (message: string) => void;
}) {
  const isMine = pr.author?.login === viewer;
  const waitingOn = pr.requestedReviewers.filter((r) => r !== viewer);
  const decided = pr.reviewDecision === "APPROVED" || pr.reviewDecision === "CHANGES_REQUESTED";

  return (
    <div className={META}>
      {showRepo && <span className="font-semibold text-fg">{pr.repo}</span>}
      {!isMine && pr.author && (
        <span className="inline-flex items-center gap-1">
          <img className="rounded-full" src={pr.author.avatarUrl} alt="" width={16} height={16} />
          {pr.author.login}
        </span>
      )}
      {!isMine && pr.roles.includes("assignee") && <span className="rounded bg-gray-bg px-1.5 font-medium leading-5 text-gray">Assigned to you</span>}
      {pr.roles.includes("reviewed") && <span className="rounded bg-gray-bg px-1.5 font-medium leading-5 text-gray">You reviewed</span>}
      <BranchButton head={pr.headRef} base={pr.baseRef} announce={announce} />
      <span>
        Updated <Time iso={pr.updatedAt} now={now} />
      </span>
      {waitingOn.length > 0 && !decided && (
        <span className="inline-flex items-center gap-1">
          <HourglassMedium size={12} weight="bold" aria-hidden />
          Waiting on {waitingOn.join(", ")}
        </span>
      )}
    </div>
  );
}

export function StatusBadges({ signals, className }: { signals: Signal[]; className?: string }) {
  if (!signals.length) return null;
  return (
    <ul className={cn("flex flex-wrap justify-end gap-1.5", className)} aria-label="Status">
      {signals.map((s) => (
        <li
          key={s.key}
          className={cn(
            "inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border border-tone/20 bg-tone-bg px-2 py-0.5 text-xs font-medium leading-[18px] text-tone",
            tone(s.tone),
          )}
          title={s.title}
        >
          <SignalIcon signal={s.key} size={12} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function verb(a: Activity): string {
  if (a.kind === "comment") return "commented";
  if (a.kind === "review_comment") return "commented on the code";
  if (a.reviewState === "APPROVED") return "approved";
  if (a.reviewState === "CHANGES_REQUESTED") return "requested changes";
  if (a.reviewState === "DISMISSED") return "had a review dismissed";
  return "reviewed";
}

/** The newest unread comment, linking straight to it on GitHub. */
export function CommentPreview({ latest, now, onOpen }: { latest: Activity; now: number; onOpen: () => void }) {
  return (
    <a
      className="mt-0.5 flex flex-col gap-0.5 rounded-lg border border-blue/20 bg-blue-bg px-3 py-2 text-sm text-fg transition hover:border-blue/50"
      href={latest.url}
      target="_blank"
      rel="noreferrer"
      onClick={onOpen}
      onAuxClick={onOpen}
    >
      <span className="text-muted">
        <strong className="font-semibold text-fg">{latest.author}</strong> {verb(latest)} · <Time iso={latest.createdAt} now={now} />
      </span>
      {latest.snippet && <span className="line-clamp-2 wrap-anywhere">{latest.snippet}</span>}
    </a>
  );
}
