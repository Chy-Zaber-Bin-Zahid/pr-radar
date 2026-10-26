"use client";

import { useState } from "react";
import { Check, Copy, HourglassMedium } from "@phosphor-icons/react";
import type { Activity, PullRequest } from "@/lib/types";
import type { Signal } from "@/lib/signals";
import { timeAgo } from "@/lib/time";
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
    <span className="branch-wrap">
      <button type="button" className="branch" onClick={copy} title={`${head} → ${base}`} aria-label={`Copy branch name ${head}`}>
        {copied ? <Check size={12} weight="bold" aria-hidden /> : <Copy size={12} weight="bold" aria-hidden />}
        <span className="branch-name">{head}</span>
      </button>
      {!DEFAULT_BRANCHES.has(base) && <span className="branch-base">→ {base}</span>}
    </span>
  );
}

/** Repo, author, branch, age and pending reviewers: the second line of every PR. */
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
    <div className="pr-meta">
      {showRepo && <span className="meta-repo">{pr.repo}</span>}
      {!isMine && pr.author && (
        <span className="pr-author">
          <img src={pr.author.avatarUrl} alt="" width={16} height={16} />
          {pr.author.login}
        </span>
      )}
      {!isMine && pr.roles.includes("assignee") && <span className="chip">Assigned to you</span>}
      {pr.roles.includes("reviewed") && <span className="chip">You reviewed</span>}
      <BranchButton head={pr.headRef} base={pr.baseRef} announce={announce} />
      <span>
        Updated <Time iso={pr.updatedAt} now={now} />
      </span>
      {waitingOn.length > 0 && !decided && (
        <span className="pr-waiting">
          <HourglassMedium size={12} weight="bold" aria-hidden />
          Waiting on {waitingOn.join(", ")}
        </span>
      )}
    </div>
  );
}

export function StatusBadges({ signals }: { signals: Signal[] }) {
  if (!signals.length) return null;
  return (
    <ul className="signals" aria-label="Status">
      {signals.map((s) => (
        <li key={s.key} className={`badge tone-${s.tone}`} title={s.title}>
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
    <a className="pr-latest" href={latest.url} target="_blank" rel="noreferrer" onClick={onOpen} onAuxClick={onOpen}>
      <span className="pr-latest-head">
        <strong>{latest.author}</strong> {verb(latest)} · <Time iso={latest.createdAt} now={now} />
      </span>
      {latest.snippet && <span className="pr-latest-body">{latest.snippet}</span>}
    </a>
  );
}
