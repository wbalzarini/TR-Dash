"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/time";

type Props = {
  epochMs: number | null;
  /** How often to re-render the phrase, in ms. */
  tickMs?: number;
};

/**
 * "6 minutes ago", kept current without re-fetching.
 *
 * Renders nothing on the server and on the first client pass so the markup
 * matches; the phrase appears on mount. Without that, a page rendered a minute
 * before hydration produces a mismatch.
 */
export function RelativeTime({ epochMs, tickMs = 30_000 }: Props) {
  const [phrase, setPhrase] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setPhrase(relativeTime(epochMs));
    update();
    const timer = setInterval(update, tickMs);
    return () => clearInterval(timer);
  }, [epochMs, tickMs]);

  if (phrase == null) return null;
  return <time suppressHydrationWarning>{phrase}</time>;
}
