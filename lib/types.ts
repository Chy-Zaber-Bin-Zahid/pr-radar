// Shapes shared by the API route and the dashboard. No server-only imports here.

export type Role = "author" | "assignee" | "reviewer" | "reviewed";

export type Activity = {
  kind: "comment" | "review" | "review_comment";
  author: string;
  isBot: boolean;
  isViewer: boolean;
  createdAt: string;
  url: string;
  snippet: string;
  reviewState?: string;
};

export type PullRequest = {
  id: string;
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  repo: string;
  repoUrl: string;
  author: { login: string; avatarUrl: string } | null;
  baseRef: string;
  headRef: string;
  roles: Role[];
  mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
  /** BEHIND | BLOCKED | CLEAN | DIRTY | DRAFT | HAS_HOOKS | UNKNOWN | UNSTABLE */
  mergeState: string;
  reviewDecision: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
  checks: "SUCCESS" | "FAILURE" | "ERROR" | "PENDING" | "EXPECTED" | null;
  /** Latest approving / changes-requested review per reviewer. */
  reviews: { login: string; state: string }[];
  requestedReviewers: string[];
  unresolvedThreads: number;
  /** Newest first. */
  activity: Activity[];
  /** Last time you commented or reviewed on this PR. */
  viewerLastActivityAt: string | null;
};

export type DashboardData = {
  viewer: { login: string };
  pullRequests: PullRequest[];
  fetchedAt: string;
  rateLimit: { remaining: number; resetAt: string } | null;
  warnings: string[];
};
