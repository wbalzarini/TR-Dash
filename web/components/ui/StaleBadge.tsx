"use client";

import { AlertTriangle } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { RelativeTime } from "./RelativeTime";

type Props = {
  /** Epoch ms of the reading itself, not of our fetch. */
  observedAt: number | null;
  stale: boolean;
};

/**
 * The "Updated 6 minutes ago" line that sits on every card, and the warning
 * that replaces it once the reading is older than that source should be.
 *
 * A card is never allowed to show a value without one of these.
 */
export function StaleBadge({ observedAt, stale }: Props) {
  if (stale) {
    return (
      <StatusPill tone="caution">
        <AlertTriangle className="size-3" aria-hidden />
        Data may be stale
        {observedAt ? (
          <>
            {" · "}
            <RelativeTime epochMs={observedAt} />
          </>
        ) : null}
      </StatusPill>
    );
  }

  if (observedAt == null) {
    return <span className="text-[11px] text-fathom">Update time not reported</span>;
  }

  return (
    <span className="text-[11px] text-fathom whitespace-nowrap">
      Updated <RelativeTime epochMs={observedAt} />
    </span>
  );
}
