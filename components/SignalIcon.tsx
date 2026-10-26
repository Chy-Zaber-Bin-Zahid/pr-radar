"use client";

import {
  ChatCircleDots,
  ChatsCircle,
  CheckCircle,
  Clock,
  Eye,
  GitBranch,
  GitMerge,
  HourglassMedium,
  NotePencil,
  PencilSimpleLine,
  Warning,
  XCircle,
  type Icon,
} from "@phosphor-icons/react";
import type { SignalKey } from "@/lib/signals";

const ICONS: Record<SignalKey, Icon> = {
  conflict: Warning,
  review_requested: Eye,
  new_comments: ChatCircleDots,
  changes_requested: NotePencil,
  checks_failing: XCircle,
  unresolved: ChatsCircle,
  behind: GitBranch,
  checks_pending: Clock,
  checking: HourglassMedium,
  approved: CheckCircle,
  ready: GitMerge,
  draft: PencilSimpleLine,
};

/** Decorative: always rendered next to a visible text label. */
export function SignalIcon({ signal, size = 14 }: { signal: SignalKey; size?: number }) {
  const Glyph = ICONS[signal];
  return <Glyph size={size} weight="bold" aria-hidden />;
}
