/**
 * Shared chart styling, so the pressure sparkline, the 24-hour weather chart and
 * the river chart read as one system rather than three libraries' defaults.
 */

export const CHART_COLORS = {
  beacon: "oklch(0.815 0.132 196)",
  beaconDeep: "oklch(0.62 0.115 202)",
  brass: "oklch(0.815 0.108 78)",
  calm: "oklch(0.775 0.155 158)",
  caution: "oklch(0.855 0.145 92)",
  heavy: "oklch(0.735 0.165 55)",
  severe: "oklch(0.665 0.205 24)",
  grid: "oklch(0.972 0.008 240 / 0.07)",
  axis: "oklch(0.605 0.024 245)",
} as const;

export const AXIS_PROPS = {
  stroke: CHART_COLORS.axis,
  tick: { fill: CHART_COLORS.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

/** The dark glass panel used for every tooltip. */
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "oklch(0.185 0.036 250 / 0.94)",
    border: "1px solid oklch(0.972 0.008 240 / 0.12)",
    borderRadius: "0.75rem",
    padding: "0.5rem 0.75rem",
    boxShadow: "0 18px 40px -24px oklch(0.08 0.03 250 / 0.9)",
    fontSize: "12px",
  },
  labelStyle: { color: "oklch(0.755 0.021 242)", marginBottom: "0.25rem" },
  itemStyle: { color: "oklch(0.972 0.008 240)", padding: 0 },
  cursor: { stroke: CHART_COLORS.axis, strokeDasharray: "3 3" },
} as const;

/**
 * Recharts needs the y-axis gutter as a fixed pixel width, and clips anything
 * wider. River levels on the upper St. Lawrence are ~245 ft (IGLD datum), so a
 * label can be six characters — a fixed width sized for "72" silently truncates
 * it to "5.48". Size the gutter from the labels we're actually going to draw.
 */
export function axisWidth(labels: string[]): number {
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 1);
  return Math.min(Math.max(longest * 7.5 + 12, 34), 76);
}
