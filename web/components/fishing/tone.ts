import type { PillTone } from "../ui/StatusPill";
import type { Rating } from "@/lib/fishing/types";

/**
 * Rating → palette. Green/yellow/orange/red as specified, mapped onto the
 * dashboard's existing status colours rather than new ones.
 */
export const RATING_TONE: Record<Rating, PillTone> = {
  Excellent: "calm",
  Good: "caution",
  Fair: "heavy",
  Poor: "severe",
};

export const RATING_TEXT: Record<Rating, string> = {
  Excellent: "text-calm",
  Good: "text-caution",
  Fair: "text-heavy",
  Poor: "text-severe",
};

export const RATING_BAR: Record<Rating, string> = {
  Excellent: "bg-calm",
  Good: "bg-caution",
  Fair: "bg-heavy",
  Poor: "bg-severe",
};

export const RATING_RING: Record<Rating, string> = {
  Excellent: "border-calm/35 bg-calm/8",
  Good: "border-caution/35 bg-caution/8",
  Fair: "border-heavy/35 bg-heavy/8",
  Poor: "border-severe/40 bg-severe/8",
};
