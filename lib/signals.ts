import type { Activity, PullRequest } from "./types";

export type Tone = "red" | "orange" | "yellow" | "blue" | "purple" | "green" | "gray";

export type SignalKey =
  | "conflict"
  | "review_requested"
  | "new_comments"
  | "changes_requested"
  | "checks_failing"
  | "unresolved"
  | "behind"
  | "checks_pending"
  | "checking"
  | "approved"
  | "ready"
  | "draft";

/** A status badge shown on a PR. */
export type Signal = { key: SignalKey; label: string; tone: Tone; title?: string };

/** Something only you can move forward. Tasks make up the "Needs you" list. */
export type TaskKey = "conflict" | "review_requested" | "changes_requested" | "new_comments";
export type Task = { key: TaskKey; tone: Tone; label: string };

export const TASK_KEYS: ReadonlySet<SignalKey> = new Set<TaskKey>(["conflict", "review_requested", "changes_requested", "new_comments"]);
export const TASK_ORDER: Record<TaskKey, number> = { conflict: 0, review_requested: 1, changes_requested: 2, new_comments: 3 };

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : 0);

/**
 * Comments and reviews by other people that arrived after the later of:
 * when you last marked the PR as read here, or your own last comment/review on it.
 */
export function unseenActivity(pr: PullRequest, seenAt: string | undefined, includeBots: boolean): Activity[] {
  const baseline = Math.max(time(seenAt), time(pr.viewerLastActivityAt));
  return pr.activity.filter((a) => !a.isViewer && (includeBots || !a.isBot) && time(a.createdAt) > baseline);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const names = (list: string[]) =>
  list.length <= 2 ? list.join(" and ") : `${list.slice(0, 2).join(", ")} and ${list.length - 2} more`;

const hasConflict = (pr: PullRequest) => pr.mergeable === "CONFLICTING" || pr.mergeState === "DIRTY";
const changeRequesters = (pr: PullRequest) => pr.reviews.filter((r) => r.state === "CHANGES_REQUESTED").map((r) => r.login);

export function tasksFor(pr: PullRequest, fresh: Activity[]): Task[] {
  // Conflicts and requested changes are the author's job, not a reviewer's.
  const owns = pr.roles.includes("author") || pr.roles.includes("assignee");
  const requesters = changeRequesters(pr);
  const tasks: Task[] = [];

  if (owns && hasConflict(pr))
    tasks.push({ key: "conflict", tone: "red", label: `Resolve merge conflict with ${pr.baseRef}` });
  if (pr.roles.includes("reviewer"))
    tasks.push({ key: "review_requested", tone: "purple", label: pr.author ? `${pr.author.login} asked for your review` : "Your review was requested" });
  if (owns && (requesters.length || pr.reviewDecision === "CHANGES_REQUESTED"))
    tasks.push({ key: "changes_requested", tone: "orange", label: requesters.length ? `Address changes requested by ${names(requesters)}` : "Address requested changes" });
  if (fresh.length)
    tasks.push({ key: "new_comments", tone: "blue", label: `${plural(fresh.length, "new comment")} from ${names([...new Set(fresh.map((a) => a.author))])}` });

  return tasks;
}

export function signalsFor(pr: PullRequest, fresh: Activity[]): Signal[] {
  const out: Signal[] = [];
  const requesters = changeRequesters(pr);
  const changesRequested = pr.reviewDecision === "CHANGES_REQUESTED" || requesters.length > 0;
  const approvers = pr.reviews.filter((r) => r.state === "APPROVED").map((r) => r.login);
  const approved = !changesRequested && (pr.reviewDecision === "APPROVED" || (!pr.reviewDecision && approvers.length > 0));

  if (hasConflict(pr))
    out.push({ key: "conflict", label: "Merge conflict", tone: "red", title: `Conflicts with ${pr.baseRef}` });
  if (pr.roles.includes("reviewer"))
    out.push({ key: "review_requested", label: "Your review requested", tone: "purple" });
  if (fresh.length)
    out.push({ key: "new_comments", label: plural(fresh.length, "new comment"), tone: "blue" });
  if (changesRequested)
    out.push({ key: "changes_requested", label: "Changes requested", tone: "orange", title: requesters.length ? `By ${requesters.join(", ")}` : undefined });
  if (pr.checks === "FAILURE" || pr.checks === "ERROR")
    out.push({ key: "checks_failing", label: "Checks failing", tone: "red" });
  if (pr.unresolvedThreads)
    out.push({ key: "unresolved", label: plural(pr.unresolvedThreads, "unresolved thread"), tone: "yellow" });
  if (pr.mergeState === "BEHIND")
    out.push({ key: "behind", label: `Behind ${pr.baseRef}`, tone: "yellow" });
  if (pr.checks === "PENDING" || pr.checks === "EXPECTED")
    out.push({ key: "checks_pending", label: "Checks running", tone: "yellow" });
  if (pr.mergeable === "UNKNOWN")
    out.push({ key: "checking", label: "Checking for conflicts…", tone: "gray", title: "GitHub is still computing mergeability; this refreshes on its own." });
  if (approved)
    out.push({ key: "approved", label: "Approved", tone: "green", title: approvers.length ? `By ${approvers.join(", ")}` : undefined });
  if (!pr.isDraft && (pr.mergeState === "CLEAN" || pr.mergeState === "HAS_HOOKS"))
    out.push({ key: "ready", label: "Ready to merge", tone: "green" });
  if (pr.isDraft)
    out.push({ key: "draft", label: "Draft", tone: "gray" });

  return out;
}
