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
    <li className="row">
      <div className="row-main">
        <a className="row-title" href={pr.url} target="_blank" rel="noreferrer" onClick={onOpen} onAuxClick={onOpen}>
          {pr.title} <span className="pr-number">#{pr.number}</span>
        </a>
        <PrMeta pr={pr} viewer={viewer} now={now} showRepo={showRepo} announce={announce} />
      </div>
      <StatusBadges signals={signals} />
    </li>
  );
}
