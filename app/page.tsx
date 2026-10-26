import { headers } from "next/headers";
import { GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { Banner, Brand, CountPill } from "@/components/Common";
import { Dashboard } from "@/components/Dashboard";
import { SignalIcon } from "@/components/SignalIcon";
import { TaskFrame } from "@/components/TaskCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SignalKey, Tone } from "@/lib/signals";
import { getSession, missingConfig } from "@/lib/session";
import { META, TASK_TITLE, button, cn, tone } from "@/lib/ui";

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

const LINK = "text-accent hover:underline";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const missing = missingConfig();
  const session = missing.length ? null : await getSession();
  if (session) return <Dashboard viewer={{ login: session.login, name: session.name, avatarUrl: session.avatarUrl }} />;

  const { error } = await searchParams;
  const h = await headers();
  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="grid w-full max-w-[1080px] grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-center gap-16 max-lg:max-w-[560px] max-lg:grid-cols-1 max-lg:gap-12">
        <div className="flex flex-col items-start gap-5">
          <Brand large />
          <h1 className="text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.025em] text-balance">Know which pull requests need you.</h1>
          <p className="max-w-[46ch] text-md leading-[1.6] text-muted text-pretty">
            Stop opening PRs one by one. PR Radar checks every repository you work in and gives you a short to-do
            list: what to do, and on which PR.
          </p>

          <ul className="grid gap-3">
            {FEATURES.map((f) => (
              <li key={f.key} className="flex items-center gap-3 font-medium">
                <span className={cn("grid size-[30px] shrink-0 place-items-center rounded-lg bg-tone-bg text-tone", tone(f.tone))}>
                  <SignalIcon signal={f.key} size={16} />
                </span>
                {f.text}
              </li>
            ))}
          </ul>

          {error && (
            <Banner tone="red" role="alert">
              <span>{ERRORS[error] ?? `GitHub sign-in failed (${error}).`}</span>
            </Banner>
          )}

          {missing.length ? (
            <div className="w-full rounded-xl border border-line bg-surface px-5 py-4">
              <strong>One-time setup needed</strong>
              <ol className="my-2 list-decimal space-y-1 pl-5">
                <li>
                  Create an OAuth App at{" "}
                  <a className={LINK} href="https://github.com/settings/applications/new" target="_blank" rel="noreferrer">
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
              <p className="text-xs text-muted">Missing: {missing.join(", ")}</p>
            </div>
          ) : (
            <a className={button({ variant: "primary", size: "lg" })} href="/api/auth/login">
              <GithubLogo size={20} weight="fill" aria-hidden />
              Sign in with GitHub
            </a>
          )}

          <p className="max-w-[48ch] text-xs leading-[1.6] text-muted">
            Asks for the <code>repo</code> scope, the only way GitHub lets an app read pull requests in private
            repositories. Read-only in practice: PR Radar never changes anything. Your token stays in an encrypted
            cookie on this server.
          </p>
        </div>

        <figure>
          <div className="pointer-events-none flex flex-col gap-3 rounded-2xl border border-line bg-bg p-5 shadow-2" aria-hidden>
            <div className="flex items-center gap-2">
              <span className="text-md font-semibold">Needs you</span>
              <CountPill count={3} accent />
            </div>
            <ul className="flex flex-col gap-3">
              {EXAMPLE_TASKS.map((t) => (
                <TaskFrame key={t.number} tone={t.tone} icon={t.key} action={t.action}>
                  <span className={TASK_TITLE}>
                    {t.title} <span className="font-normal text-muted tabular-nums">#{t.number}</span>
                  </span>
                  <div className={META}>
                    <span className="font-semibold text-fg">{t.repo}</span>
                    <span>Updated {t.age}</span>
                  </div>
                </TaskFrame>
              ))}
            </ul>
          </div>
          <figcaption className="mt-3 text-center text-xs text-muted">Example: your to-do list across every repository.</figcaption>
        </figure>
      </div>
    </main>
  );
}
