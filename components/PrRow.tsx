"use client";

import type { PullRequest } from "@/lib/types";
import type { Signal } from "@/lib/signals";
import { PrMeta, StatusBadges } from "./PrParts";

type Props = {
  pr: PullRequest;
  signals: Signal[];
  viewer: string;
  now: number;
  showRepo: boolean;
  onOpen: () => void;
  announce: (message: string) => void;
};

/** A compact row for PRs that don't need anything from you right now. */
export function PrRow({ pr, signals, viewer, now, showRepo, onOpen, announce }: Props) {
  return (
    <li className="flex items-start gap-4 border-t border-line px-4 py-3 transition-colors first:border-t-0 hover:bg-surface-hover max-md:flex-col max-md:gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <a
          className="font-medium leading-[1.4] text-fg wrap-anywhere hover:text-accent max-md:text-md"
          href={pr.url}
          target="_blank"
          rel="noreferrer"
          onClick={onOpen}
          onAuxClick={onOpen}
        >
          {pr.title} <span className="font-normal text-muted tabular-nums">#{pr.number}</span>
        </a>
        <PrMeta pr={pr} viewer={viewer} now={now} showRepo={showRepo} announce={announce} />
      </div>
      <StatusBadges signals={signals} className="max-w-[260px] shrink-0 max-md:max-w-none max-md:justify-start" />
    </li>
  );
}
