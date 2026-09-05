import { CloudOff } from "lucide-react";

type Props = {
  /** What we couldn't reach, e.g. "River level". */
  label: string;
  /** The upstream error, shown small — useful when something is misconfigured. */
  detail?: string;
};

/**
 * Shown in place of a card's contents when its data source failed and we have
 * no previous reading to fall back on. Deliberately says nothing numeric.
 */
export function Unavailable({ label, detail }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-foam/12 bg-foam/[0.02] px-4 py-8 text-center">
      <CloudOff className="size-5 text-fathom" aria-hidden />
      <p className="text-sm font-medium text-mist">{label} temporarily unavailable</p>
      {detail ? (
        <p className="max-w-xs text-xs leading-relaxed text-fathom">{detail}</p>
      ) : null}
    </div>
  );
}
