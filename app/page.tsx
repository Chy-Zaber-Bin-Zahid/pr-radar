import { headers } from "next/headers";
import { GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { Dashboard } from "@/components/Dashboard";
import { Logo } from "@/components/Logo";
import { SignalIcon } from "@/components/SignalIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SignalKey, Tone } from "@/lib/signals";
import { getSession, missingConfig } from "@/lib/session";

const ERRORS: Record<string, string> = {
  access_denied: "You cancelled the GitHub sign-in.",
  state_mismatch: "That sign-in link expired. Please try again.",
};

const FEATURES: { key: SignalKey; tone: Tone; text: string }[] = [
  { key: "conflict", tone: "red", text: "Merge conflicts on your PRs" },
  { key: "review_requested", tone: "purple", text: "Reviews people are waiting on you for" },
  { key: "new_comments", tone: "blue", text: "New comments since you last looked" },
];

// Illustrative only: shows what the dashboard looks like before signing in.
const EXAMPLE_TASKS: { key: SignalKey; tone: Tone; action: string; title: string; number: number; repo: string; age: string }[] = [
  { key: "conflict", tone: "red", action: "Resolve merge conflict with main", title: "Fix rounding in checkout totals", number: 412, repo: "acme/storefront", age: "2h ago" },
  { key: "review_requested", tone: "purple", action: "sam asked for your review", title: "Upgrade the date picker", number: 377, repo: "acme/web", age: "5h ago" },
  { key: "new_comments", tone: "blue", action: "2 new comments from priya", title: "Add dark mode to settings", number: 398, repo: "acme/web", age: "1d ago" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const missing = missingConfig();
  const session = missing.length ? null : await getSession();
  if (session) return <Dashboard viewer={{ login: session.login, name: session.name, avatarUrl: session.avatarUrl }} />;

  const { error } = await searchParams;
  const h = await headers();
  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <main className="landing">
      <div className="landing-theme">
        <ThemeToggle />
      </div>
      <div className="landing-grid">
        <div className="landing-copy">
          <div className="brand brand-lg">
            <Logo />
            <span>PR Radar</span>
          </div>
          <h1>Know which pull requests need you.</h1>
          <p className="lead">
            Stop opening PRs one by one. PR Radar checks every repository you work in and gives you a short to-do
            list: what to do, and on which PR.
          </p>

          <ul className="features">
            {FEATURES.map((f) => (
              <li key={f.key}>
                <span className={`feature-icon tone-${f.tone}`}>
                  <SignalIcon signal={f.key} size={16} />
                </span>
                {f.text}
              </li>
            ))}
          </ul>

          {error && (
            <div className="banner tone-red" role="alert">
              <span>{ERRORS[error] ?? `GitHub sign-in failed (${error}).`}</span>
            </div>
          )}

          {missing.length ? (
            <div className="setup">
              <strong>One-time setup needed</strong>
              <ol>
                <li>
                  Create an OAuth App at{" "}
                  <a href="https://github.com/settings/applications/new" target="_blank" rel="noreferrer">
                    github.com/settings/applications/new
                  </a>{" "}
                  with callback URL <code>{origin}/api/auth/callback</code>.
                </li>
                <li>
                  Set the values below. Locally, copy <code>.env.example</code> to <code>.env.local</code>. On a host
                  like Vercel, add them as environment variables in its dashboard.
                </li>
                <li>Restart the server.</li>
              </ol>
              <p className="muted small">Missing: {missing.join(", ")}</p>
            </div>
          ) : (
            <a className="button button-primary button-lg" href="/api/auth/login">
              <GithubLogo size={20} weight="fill" aria-hidden />
              Sign in with GitHub
            </a>
          )}

          <p className="muted small fineprint">
            Asks for the <code>repo</code> scope, the only way GitHub lets an app read pull requests in private
            repositories. Read-only in practice: PR Radar never changes anything. Your token stays in an encrypted
            cookie on this server.
          </p>
        </div>

        <figure className="preview">
          <div className="preview-frame" aria-hidden>
            <div className="section-head">
              <span className="preview-heading">Needs you</span>
              <span className="section-count section-count-accent">3</span>
            </div>
            <ul className="task-list">
              {EXAMPLE_TASKS.map((t) => (
                <li key={t.number} className={`task tone-${t.tone}`}>
                  <span className="task-icon">
                    <SignalIcon signal={t.key} size={18} />
                  </span>
                  <div className="task-body">
                    <p className="task-action">{t.action}</p>
                    <span className="task-title">
                      {t.title} <span className="pr-number">#{t.number}</span>
                    </span>
                    <div className="pr-meta">
                      <span className="meta-repo">{t.repo}</span>
                      <span>Updated {t.age}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <figcaption>Example: your to-do list across every repository.</figcaption>
        </figure>
      </div>
    </main>
  );
}
