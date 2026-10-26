"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise, CheckCircle, FolderSimple, Funnel, SignOut, Warning, XCircle } from "@phosphor-icons/react";
import type { Activity, DashboardData, PullRequest, Role } from "@/lib/types";
import { TASK_ORDER, signalsFor, tasksFor, unseenActivity, type Signal, type SignalKey, type Task, type Tone } from "@/lib/signals";
import { timeAgo } from "@/lib/time";
import { useStoredState } from "@/lib/useStoredState";
import { SearchField, Select } from "./Fields";
import { Logo } from "./Logo";
import { PrRow } from "./PrRow";
import { SignalIcon } from "./SignalIcon";
import { TaskCard } from "./TaskCard";
import { ThemeToggle } from "./ThemeToggle";

const REFRESH_MS = 2 * 60_000;
const UNKNOWN_RETRY_MS = 10_000;
const MAX_UNKNOWN_RETRIES = 3;
// GitHub allows 5,000 GraphQL points per hour; a refresh costs a handful.
const LOW_RATE_LIMIT = 300;

type Viewer = { login: string; name: string | null; avatarUrl: string };
type RoleFilter = "all" | Role;
type Focus = "all" | SignalKey;
type Row = { pr: PullRequest; fresh: Activity[]; signals: Signal[]; tasks: Task[]; keys: Set<SignalKey> };

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "All my PRs" },
  { key: "author", label: "Authored by me" },
  { key: "assignee", label: "Assigned to me" },
  { key: "reviewer", label: "Waiting for my review" },
  { key: "reviewed", label: "Reviewed by me" },
];

const STATUS_FILTERS: { key: SignalKey; label: string; tone: Tone }[] = [
  { key: "conflict", label: "Merge conflicts", tone: "red" },
  { key: "review_requested", label: "Review requested", tone: "purple" },
  { key: "new_comments", label: "New comments", tone: "blue" },
  { key: "changes_requested", label: "Changes requested", tone: "orange" },
  { key: "checks_failing", label: "Checks failing", tone: "red" },
  { key: "ready", label: "Ready to merge", tone: "green" },
];

// The selected project lives in the URL (#/owner/repo) so it survives reloads and works with Back.
const readRepoHash = (hash: string): string | null | undefined => {
  if (!hash || hash === "#") return null;
  if (!hash.startsWith("#/")) return undefined; // e.g. the skip link's #main: not a project change
  return decodeURIComponent(hash.slice(2)) || null;
};

export function Dashboard({ viewer }: { viewer: Viewer }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState("Loading pull requests…");

  const [seen, setSeen, seenLoaded] = useStoredState<Record<string, string>>(`prradar:seen:${viewer.login}`, {});
  const [prefs, setPrefs] = useStoredState("prradar:prefs", { includeBots: false, hideDrafts: false });
  const [repo, setRepo] = useState<string | null>(null);
  const [role, setRole] = useState<RoleFilter>("all");
  const [focus, setFocus] = useState<Focus>("all");
  const [query, setQuery] = useState("");

  const inFlight = useRef(false);
  const unknownRetries = useRef(0);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/prs", { cache: "no-store" });
      if (res.status === 401) {
        setSignedOut(true);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
      setData(json as DashboardData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      inFlight.current = false;
      setLoading(false);
      setNow(Date.now());
    }
  }, []);

  // Initial load, periodic refresh, and refresh when you come back to the tab.
  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // GitHub computes merge conflicts lazily, so the first fetch often says UNKNOWN.
  useEffect(() => {
    if (!data?.pullRequests.some((pr) => pr.mergeable === "UNKNOWN")) {
      unknownRetries.current = 0;
      return;
    }
    if (unknownRetries.current >= MAX_UNKNOWN_RETRIES) return;
    unknownRetries.current++;
    const t = setTimeout(load, UNKNOWN_RETRY_MS);
    return () => clearTimeout(t);
  }, [data, load]);

  useEffect(() => {
    const sync = () => {
      const next = readRepoHash(location.hash);
      if (next === undefined) return;
      setRepo(next);
      window.scrollTo(0, 0);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const markSeen = useCallback(
    (ids: string[]) => {
      const at = new Date().toISOString();
      setSeen((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, at])) }));
    },
    [setSeen],
  );

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    return data.pullRequests.map((pr) => {
      const fresh = unseenActivity(pr, seen[pr.id], prefs.includeBots);
      const signals = signalsFor(pr, fresh);
      return { pr, fresh, signals, tasks: tasksFor(pr, fresh), keys: new Set(signals.map((s) => s.key)) };
    });
  }, [data, seen, prefs.includeBots]);

  const base = useMemo(() => rows.filter((r) => !(prefs.hideDrafts && r.pr.isDraft)), [rows, prefs.hideDrafts]);

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter(
      (r) =>
        (role === "all" || r.pr.roles.includes(role)) &&
        (!q || `${r.pr.title} ${r.pr.repo} #${r.pr.number} ${r.pr.headRef} ${r.pr.author?.login ?? ""}`.toLowerCase().includes(q)),
    );
  }, [base, role, query]);

  // Sidebar: every project you have open PRs in, grouped by owner. Order follows the
  // unfiltered list so the sidebar doesn't jump around while you filter.
  const projects = useMemo(() => {
    const byRepo = new Map<string, { repo: string; name: string; total: number; needs: number }>();
    const ownerSize = new Map<string, number>();
    for (const r of base) {
      const [owner, name] = r.pr.repo.split("/");
      if (!byRepo.has(r.pr.repo)) byRepo.set(r.pr.repo, { repo: r.pr.repo, name, total: 0, needs: 0 });
      ownerSize.set(owner, (ownerSize.get(owner) ?? 0) + 1);
    }
    for (const r of scoped) {
      const p = byRepo.get(r.pr.repo)!;
      p.total++;
      if (r.tasks.length) p.needs++;
    }
    return [...ownerSize.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([owner]) => ({
        owner,
        repos: [...byRepo.values()].filter((p) => p.repo.startsWith(`${owner}/`)).sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [base, scoped]);

  const projectOrder = useMemo(() => projects.flatMap((o) => o.repos.map((p) => p.repo)), [projects]);

  const inProject = useMemo(() => (repo ? scoped.filter((r) => r.pr.repo === repo) : scoped), [scoped, repo]);
  const visible = useMemo(() => (focus === "all" ? inProject : inProject.filter((r) => r.keys.has(focus))), [inProject, focus]);

  const needsYou = useMemo(
    () =>
      visible
        .filter((r) => r.tasks.length)
        .sort((a, b) => TASK_ORDER[a.tasks[0].key] - TASK_ORDER[b.tasks[0].key] || b.pr.updatedAt.localeCompare(a.pr.updatedAt)),
    [visible],
  );

  const restGroups = useMemo(() => {
    const byRepo = new Map<string, Row[]>();
    for (const r of visible) if (!r.tasks.length) byRepo.set(r.pr.repo, [...(byRepo.get(r.pr.repo) ?? []), r]);
    return [...byRepo.entries()]
      .sort((a, b) => projectOrder.indexOf(a[0]) - projectOrder.indexOf(b[0]))
      .map(([name, items]) => ({ repo: name, items: items.sort((a, b) => b.pr.updatedAt.localeCompare(a.pr.updatedAt)) }));
  }, [visible, projectOrder]);
  const restCount = restGroups.reduce((n, g) => n + g.items.length, 0);

  const needsTotal = base.filter((r) => r.tasks.length).length;
  const needsHere = inProject.filter((r) => r.tasks.length).length;
  const ready = data && seenLoaded;
  const unknownRepo = ready && repo && !base.some((r) => r.pr.repo === repo);
  const filtered = focus !== "all" || role !== "all" || query.trim() !== "";

  useEffect(() => {
    document.title = needsTotal ? `(${needsTotal}) PR Radar` : "PR Radar";
  }, [needsTotal]);

  // One status message for screen readers. It only changes when the counts do.
  useEffect(() => {
    if (ready) setAnnouncement(`${base.length} open pull requests, ${needsTotal} need you.`);
  }, [ready, base.length, needsTotal]);

  const clearFilters = () => {
    setFocus("all");
    setRole("all");
    setQuery("");
  };

  const signOut = (
    <form action="/api/auth/logout" method="post">
      <button type="submit" className="button button-ghost button-icon" aria-label="Sign out" title="Sign out">
        <SignOut size={18} weight="bold" aria-hidden />
      </button>
    </form>
  );

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to pull requests
      </a>

      <aside className="sidebar">
        <a href="#/" className="brand sidebar-brand">
          <Logo />
          <span>PR Radar</span>
        </a>

        <nav className="nav" aria-label="Projects">
          {!ready ? (
            <div className="nav-skeleton" aria-hidden>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i} />
              ))}
            </div>
          ) : (
            <>
              <NavItem href="#/" label="All projects" total={scoped.length} needs={scoped.filter((r) => r.tasks.length).length} current={!repo} />
              {projects.map((org) => (
                <div key={org.owner} className="nav-group">
                  <p className="nav-group-label">{org.owner}</p>
                  {org.repos.map((p) => (
                    <NavItem key={p.repo} href={`#/${p.repo}`} label={p.name} title={p.repo} total={p.total} needs={p.needs} current={repo === p.repo} />
                  ))}
                </div>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <img src={viewer.avatarUrl} alt="" width={28} height={28} />
          <span className="sidebar-user">{viewer.login}</span>
          <ThemeToggle />
          {signOut}
        </div>
      </aside>

      <header className="mobile-bar">
        <a href="#/" className="brand">
          <Logo />
          <span>PR Radar</span>
        </a>
        <div className="mobile-bar-right">
          <img src={viewer.avatarUrl} alt={viewer.login} width={28} height={28} />
          <ThemeToggle />
          {signOut}
        </div>
      </header>

      <main id="main" className="main" tabIndex={-1}>
        <p className="sr-only" role="status">
          {announcement}
        </p>

        {ready && (
          <label className="mobile-project">
            <span className="sr-only">Project</span>
            <Select icon={FolderSimple} wrapClassName="select-block" value={repo ?? ""} onChange={(e) => (location.hash = `/${e.target.value}`)}>
              <option value="">All projects ({scoped.length})</option>
              {projects.map((org) => (
                <optgroup key={org.owner} label={org.owner}>
                  {org.repos.map((p) => (
                    <option key={p.repo} value={p.repo}>
                      {p.name} ({p.total}
                      {p.needs ? `, ${p.needs} need you` : ""})
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </label>
        )}

        <header className="main-header">
          <div className="main-title">
            <h1>{repo ?? "All projects"}</h1>
            {ready && !unknownRepo && (
              <p className="subtitle">
                {inProject.length} open · <strong>{needsHere} need you</strong>
              </p>
            )}
          </div>
          <div className="header-actions">
            <span className="updated">{loading ? "Refreshing…" : data ? `Updated ${timeAgo(data.fetchedAt, now)}` : ""}</span>
            <button type="button" className="button" onClick={load} disabled={loading} aria-label="Refresh">
              <ArrowClockwise size={16} weight="bold" className={loading ? "spin" : undefined} aria-hidden />
              <span className="hide-sm">Refresh</span>
            </button>
          </div>
        </header>

        {signedOut && (
          <div className="banner tone-red" role="alert">
            <XCircle size={18} weight="fill" aria-hidden />
            <span>Your GitHub session has expired or was revoked.</span>
            <a className="button button-sm" href="/api/auth/login">
              Sign in again
            </a>
          </div>
        )}
        {error && (
          <div className="banner tone-red" role="alert">
            <XCircle size={18} weight="fill" aria-hidden />
            <span>Couldn&apos;t load pull requests: {error}</span>
            <button type="button" className="button button-sm" onClick={load} disabled={loading}>
              Try again
            </button>
          </div>
        )}
        {data?.rateLimit && data.rateLimit.remaining < LOW_RATE_LIMIT && (
          <div className="banner tone-yellow">
            <Warning size={18} weight="fill" aria-hidden />
            <span>
              You&apos;ve nearly used up GitHub&apos;s free hourly limit ({data.rateLimit.remaining.toLocaleString()} left),
              often because other tools share it. Updates may pause until it resets at{" "}
              {new Date(data.rateLimit.resetAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
            </span>
          </div>
        )}
        {data?.warnings.length ? (
          <details className="banner tone-yellow">
            <summary>
              <Warning size={18} weight="fill" aria-hidden />
              <span>
                Some repositories couldn&apos;t be read. If an organization restricts OAuth apps or uses SSO, grant this
                app access in{" "}
                <a href="https://github.com/settings/applications" target="_blank" rel="noreferrer">
                  GitHub settings
                </a>
                .
              </span>
            </summary>
            <ul>
              {data.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </details>
        ) : null}

        {!ready && !error && !signedOut && <Skeleton />}

        {ready && unknownRepo && (
          <div className="empty-state">
            <strong>No open pull requests in {repo}.</strong>
            <span>They may have been merged or closed.</span>
            <a className="button" href="#/">
              Show all projects
            </a>
          </div>
        )}

        {ready && !unknownRepo && (
          <>
            <div className="controls">
              <div className="status-chips" role="group" aria-label="Filter by status">
                {STATUS_FILTERS.map((s) => {
                  const count = inProject.filter((r) => r.keys.has(s.key)).length;
                  const active = focus === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      className={`status-chip tone-${s.tone}`}
                      aria-pressed={active}
                      disabled={!count && !active}
                      onClick={() => setFocus(active ? "all" : s.key)}
                    >
                      <SignalIcon signal={s.key} size={14} />
                      {s.label}
                      <span className="chip-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="view-options">
                <SearchField
                  id="pr-search"
                  label="Search pull requests"
                  placeholder="Search title, branch, author…"
                  value={query}
                  onChange={setQuery}
                />
                <label className="field-inline">
                  Show
                  <Select icon={Funnel} value={role} onChange={(e) => setRole(e.target.value as RoleFilter)}>
                    {ROLE_FILTERS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={prefs.hideDrafts}
                    onChange={(e) => setPrefs({ ...prefs, hideDrafts: e.target.checked })}
                  />
                  Hide drafts
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={prefs.includeBots}
                    onChange={(e) => setPrefs({ ...prefs, includeBots: e.target.checked })}
                  />
                  Count bot comments
                </label>
              </div>

              {filtered && (
                <p className="filter-note">
                  Filters are on.
                  <button type="button" className="text-button" onClick={clearFilters}>
                    Clear filters
                  </button>
                </p>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="empty-state">
                <strong>No open pull requests involve you.</strong>
                <span>PRs you author, are assigned to, or are asked to review will show up here.</span>
              </div>
            ) : visible.length === 0 ? (
              <div className="empty-state">
                <strong>Nothing matches these filters.</strong>
                <button type="button" className="button" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <section className="section section-needs" aria-labelledby="needs-title">
                  <div className="section-head">
                    <h2 id="needs-title">Needs you</h2>
                    <span className={`section-count${needsYou.length ? " section-count-accent" : ""}`}>{needsYou.length}</span>
                    {needsYou.some((r) => r.fresh.length) && (
                      <button
                        type="button"
                        className="button button-sm"
                        onClick={() => markSeen(needsYou.filter((r) => r.fresh.length).map((r) => r.pr.id))}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {needsYou.length ? (
                    <ul className="task-list">
                      {needsYou.map((r) => (
                        <TaskCard
                          key={r.pr.id}
                          pr={r.pr}
                          tasks={r.tasks}
                          fresh={r.fresh}
                          signals={r.signals}
                          viewer={viewer.login}
                          now={now}
                          onSeen={() => markSeen([r.pr.id])}
                          announce={setAnnouncement}
                        />
                      ))}
                    </ul>
                  ) : (
                    <div className="caught-up">
                      <CheckCircle size={28} weight="fill" aria-hidden />
                      <div>
                        <strong>You&apos;re all caught up</strong>
                        <span>No merge conflicts, review requests or new comments{repo ? ` in ${repo}` : ""}.</span>
                      </div>
                    </div>
                  )}
                </section>

                {restCount > 0 && (
                  <section className="section" aria-labelledby="rest-title">
                    <div className="section-head">
                      <h2 id="rest-title">Everything else</h2>
                      <span className="section-count">{restCount}</span>
                    </div>
                    <div className="rest-groups">
                      {restGroups.map((g) => (
                        <div key={g.repo} className="row-group">
                          {!repo && (
                            <h3 className="row-group-title">
                              <a href={`#/${g.repo}`}>{g.repo}</a>
                              <span>{g.items.length}</span>
                            </h3>
                          )}
                          <ul className="row-list card">
                            {g.items.map((r) => (
                              <PrRow
                                key={r.pr.id}
                                pr={r.pr}
                                signals={r.signals}
                                viewer={viewer.login}
                                now={now}
                                showRepo={false}
                                onOpen={() => markSeen([r.pr.id])}
                                announce={setAnnouncement}
                              />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            <p className="footnote">Refreshes every {REFRESH_MS / 60_000} minutes and whenever you return to this tab.</p>
          </>
        )}
      </main>
    </div>
  );
}

function NavItem({ href, label, title, total, needs, current }: { href: string; label: string; title?: string; total: number; needs: number; current: boolean }) {
  return (
    <a href={href} className={`nav-item${total ? "" : " dim"}`} aria-current={current ? "page" : undefined} title={title}>
      <span className="nav-label">{label}</span>
      {needs > 0 && (
        <span className="nav-needs" aria-hidden>
          {needs}
        </span>
      )}
      <span className="nav-total" aria-hidden>
        {total}
      </span>
      <span className="sr-only">
        , {total} open{needs ? `, ${needs} need you` : ""}
      </span>
    </a>
  );
}

function Skeleton() {
  return (
    <div className="skeleton" aria-hidden>
      <div className="skeleton-bar" />
      <div className="skeleton-block" />
      <div className="skeleton-block" />
    </div>
  );
}
