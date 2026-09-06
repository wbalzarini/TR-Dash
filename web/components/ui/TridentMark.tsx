/**
 * The Trident Island mark, after the trident on the island's own artwork:
 * three slender spikes with swept-back arrowhead barbs, rising from a deep
 * bowl, on a shaft that tapers to a point.
 *
 * Drawn inline rather than shipped as an asset so it stays sharp at any size,
 * costs no extra request, and takes its colour from wherever it's placed.
 * Sizing comes from the className — the viewBox is 34×54, taller than wide, so
 * give it a height rather than a width.
 *
 * The bowl is a stroke rather than part of the outline. As a filled path its
 * inner curve left a small notch where it met the shaft; a stroke overlaps
 * both cleanly and keeps its weight when the mark is scaled.
 *
 * This is the detailed mark, for anywhere it renders at ~32px or larger. The
 * browser tab icon (app/icon.svg) stays a heavier, simpler trident, because
 * these spikes go to mush at 16px.
 */

type Props = {
  className?: string;
  /** Decorative by default; pass a title where it stands in for the name. */
  title?: string;
};

export function TridentMark({ className = "h-10", title }: Props) {
  return (
    <svg
      viewBox="0 0 34 54"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <g fill="currentColor">
        {/* Centre spike and shaft */}
        <path d="M17 1 L19.5 7.4 L17.9 5.9 L17.9 46 L16.1 46 L16.1 5.9 L14.5 7.4 Z" />
        {/* Tapered point */}
        <path d="M16.1 44 L17.9 44 L17 53.4 Z" />
        {/* Outer spikes */}
        <path d="M7 6.6 L9.1 12.6 L7.78 11.1 L7.78 31 L6.22 31 L6.22 11.1 L4.9 12.6 Z" />
        <path d="M27 6.6 L29.1 12.6 L27.78 11.1 L27.78 31 L26.22 31 L26.22 11.1 L24.9 12.6 Z" />
        {/* Collar */}
        <path d="M13.4 42.4 L20.6 42.4 L20.6 43.9 L13.4 43.9 Z" />
      </g>
      {/* Bowl sweeping the outer spikes into the shaft */}
      <path
        d="M7 30 C7 36.4, 10.8 39.5, 17 39.5 C23.2 39.5, 27 36.4, 27 30"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.56"
      />
    </svg>
  );
}
