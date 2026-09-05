import type { ReactNode } from "react";

export type PillTone = "neutral" | "calm" | "caution" | "heavy" | "severe" | "beacon";

const TONES: Record<PillTone, string> = {
  neutral: "border-foam/12 bg-foam/6 text-mist",
  calm: "border-calm/30 bg-calm/12 text-calm",
  caution: "border-caution/30 bg-caution/12 text-caution",
  heavy: "border-heavy/30 bg-heavy/12 text-heavy",
  severe: "border-severe/35 bg-severe/15 text-severe",
  beacon: "border-beacon/30 bg-beacon/12 text-beacon",
};

type Props = {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
};

export function StatusPill({ tone = "neutral", children, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
