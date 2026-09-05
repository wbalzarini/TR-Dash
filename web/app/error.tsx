"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";

/**
 * The last line of defence. Individual data sources degrade into their own cards
 * without reaching here — this only fires if rendering itself fails.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[trident] dashboard render failed", error);
  }, [error]);

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <TriangleAlert className="size-8 text-caution" aria-hidden />
      <h1 className="mt-5 text-2xl font-semibold tracking-[0.16em] uppercase">
        Trident Island
      </h1>
      <p className="mt-3 text-sm text-mist">
        The dashboard failed to render. The data sources are checked again on every
        reload.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-fathom">Reference {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-foam/15 bg-foam/8 px-5 py-2.5 text-sm font-medium text-foam transition-colors hover:bg-foam/12"
      >
        <RotateCw className="size-4" aria-hidden />
        Try again
      </button>
    </main>
  );
}
