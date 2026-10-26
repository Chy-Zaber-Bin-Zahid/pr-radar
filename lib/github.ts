import type { Activity, DashboardData, PullRequest, Role } from "./types";

const ENDPOINT = "https://api.github.com/graphql";
const PAGE_SIZE = 100;
const MAX_PAGES = 3;
// GitHub's latency grows with PRs per request, so details go out as several small parallel batches.
const MIN_BATCH = 5;
const MAX_PARALLEL = 8;
const SNIPPET_LENGTH = 180;

// One search per way you can be involved in a PR. A PR that matches several
// searches ends up with several roles.
const SEARCHES: { role: Role; query: string }[] = [
  { role: "author", query: "is:pr is:open archived:false author:@me" },
  { role: "assignee", query: "is:pr is:open archived:false assignee:@me" },
  { role: "reviewer", query: "is:pr is:open archived:false review-requested:@me" },
  { role: "reviewed", query: "is:pr is:open archived:false reviewed-by:@me -author:@me" },
];

// Searches only return IDs, which costs ~1 rate-limit point each. Details are then
// fetched once per unique PR, since the same PR often matches several searches.
const SEARCH_QUERY = /* GraphQL */ `
  query ($q: String!, $first: Int!, $after: String) {
    viewer { login }
    search(type: ISSUE, query: $q, first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { ... on PullRequest { id } }
    }
  }
`;

const DETAILS_QUERY = /* GraphQL */ `
  query ($ids: [ID!]!) {
    rateLimit { remaining resetAt }
    nodes(ids: $ids) { ...PR }
  }

  fragment PR on PullRequest {
    id number title url isDraft createdAt updatedAt
    mergeable mergeStateStatus reviewDecision
    baseRefName headRefName
    author { login avatarUrl(size: 32) }
    repository { nameWithOwner url }
    reviewRequests(first: 20) {
      nodes { requestedReviewer { __typename ... on User { login } ... on Team { name } ... on Bot { login } } }
    }
    latestOpinionatedReviews(first: 20) { nodes { state author { login } } }
    commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
    comments(last: 30) {
      nodes { createdAt url bodyText author { __typename login } }
    }
    reviews(last: 30) {
      nodes { state submittedAt url bodyText author { __typename login } }
    }
    reviewThreads(last: 30) {
      nodes {
        isResolved
        comments(last: 5) { nodes { createdAt url bodyText author { __typename login } } }
      }
    }
  }
`;

type RawAuthor = { __typename?: string; login: string } | null;
type RawComment = { createdAt: string; url: string; bodyText: string; author: RawAuthor };
type RawPR = {
  id: string;
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  mergeable: PullRequest["mergeable"];
  mergeStateStatus: string;
  reviewDecision: PullRequest["reviewDecision"];
  baseRefName: string;
  headRefName: string;
  author: { login: string; avatarUrl: string } | null;
  repository: { nameWithOwner: string; url: string };
  reviewRequests: { nodes: { requestedReviewer: { __typename: string; login?: string; name?: string } | null }[] };
  latestOpinionatedReviews: { nodes: { state: string; author: RawAuthor }[] };
  commits: { nodes: { commit: { statusCheckRollup: { state: PullRequest["checks"] } | null } }[] };
  comments: { nodes: RawComment[] };
  reviews: { nodes: (Omit<RawComment, "createdAt"> & { state: string; submittedAt: string | null })[] };
  reviewThreads: { nodes: { isResolved: boolean; comments: { nodes: RawComment[] } }[] };
};
type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] };
type SearchData = {
  viewer: { login: string };
  search: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: ({ id?: string } | null)[] };
};
type DetailsData = {
  rateLimit: { remaining: number; resetAt: string };
  nodes: (RawPR | null)[];
};

export class GitHubAuthError extends Error {}

async function graphql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<GraphQLResponse<T>> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "pr-radar" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (res.status === 401) throw new GitHubAuthError("GitHub rejected the token");
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const isBot = (author: RawAuthor) => !!author && (author.__typename === "Bot" || author.login.endsWith("[bot]"));

const snippet = (text: string) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > SNIPPET_LENGTH ? `${flat.slice(0, SNIPPET_LENGTH - 1)}…` : flat;
};

function toPullRequest(raw: RawPR, viewer: string): PullRequest {
  const activity: Activity[] = [];
  const add = (kind: Activity["kind"], c: RawComment, reviewState?: string) =>
    activity.push({
      kind,
      author: c.author?.login ?? "ghost",
      isBot: isBot(c.author),
      isViewer: c.author?.login === viewer,
      createdAt: c.createdAt,
      url: c.url,
      snippet: snippet(c.bodyText),
      reviewState,
    });

  for (const c of raw.comments.nodes) add("comment", c);
  for (const r of raw.reviews.nodes) {
    // Inline comments of a plain "commented" review are counted via review threads.
    if (!r.submittedAt || r.state === "PENDING") continue;
    if (r.state === "COMMENTED" && !r.bodyText.trim()) continue;
    add("review", { ...r, createdAt: r.submittedAt }, r.state);
  }
  for (const t of raw.reviewThreads.nodes) for (const c of t.comments.nodes) add("review_comment", c);
  activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    id: raw.id,
    number: raw.number,
    title: raw.title,
    url: raw.url,
    isDraft: raw.isDraft,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    repo: raw.repository.nameWithOwner,
    repoUrl: raw.repository.url,
    author: raw.author,
    baseRef: raw.baseRefName,
    headRef: raw.headRefName,
    roles: [],
    mergeable: raw.mergeable,
    mergeState: raw.mergeStateStatus,
    reviewDecision: raw.reviewDecision,
    checks: raw.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
    reviews: raw.latestOpinionatedReviews.nodes
      .filter((r) => r.author)
      .map((r) => ({ login: r.author!.login, state: r.state })),
    requestedReviewers: raw.reviewRequests.nodes
      .map((n) => n.requestedReviewer?.login ?? n.requestedReviewer?.name)
      .filter((x): x is string => !!x),
    unresolvedThreads: raw.reviewThreads.nodes.filter((t) => !t.isResolved).length,
    activity,
    viewerLastActivityAt: activity.find((a) => a.isViewer)?.createdAt ?? null,
  };
}

export async function fetchDashboard(token: string): Promise<DashboardData> {
  const roles = new Map<string, Role[]>();
  // Orgs with SSO or OAuth app restrictions come back as partial errors, not failures.
  const warnings = new Set<string>();
  let viewer = "";

  await Promise.all(
    SEARCHES.map(async ({ role, query }) => {
      let after: string | null = null;
      for (let page = 0; page < MAX_PAGES; page++) {
        const json: GraphQLResponse<SearchData> = await graphql(token, SEARCH_QUERY, { q: `${query} sort:updated-desc`, first: PAGE_SIZE, after });
        json.errors?.forEach((e) => warnings.add(e.message));
        if (!json.data) break;

        viewer = json.data.viewer.login;
        for (const node of json.data.search.nodes) {
          if (node?.id) roles.set(node.id, [...(roles.get(node.id) ?? []), role]);
        }

        const { hasNextPage, endCursor } = json.data.search.pageInfo;
        if (!hasNextPage) break;
        after = endCursor;
      }
    }),
  );

  if (!viewer && warnings.size) throw new Error([...warnings].join("; "));

  const ids = [...roles.keys()];
  const size = Math.max(MIN_BATCH, Math.ceil(ids.length / MAX_PARALLEL));
  const batches = Array.from({ length: Math.ceil(ids.length / size) }, (_, i) => ids.slice(i * size, (i + 1) * size));
  let rateLimit: DashboardData["rateLimit"] = null;
  const pullRequests: PullRequest[] = [];

  await Promise.all(
    batches.map(async (batch) => {
      const json = await graphql<DetailsData>(token, DETAILS_QUERY, { ids: batch });
      json.errors?.forEach((e) => warnings.add(e.message));
      if (!json.data) return;
      if (!rateLimit || json.data.rateLimit.remaining < rateLimit.remaining) rateLimit = json.data.rateLimit;
      for (const node of json.data.nodes) {
        if (node?.id) pullRequests.push({ ...toPullRequest(node, viewer), roles: roles.get(node.id) ?? [] });
      }
    }),
  );

  return {
    viewer: { login: viewer },
    pullRequests: pullRequests.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    fetchedAt: new Date().toISOString(),
    rateLimit,
    warnings: [...warnings],
  };
}
