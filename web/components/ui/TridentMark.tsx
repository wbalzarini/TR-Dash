/**
 * The Trident Island mark.
 *
 * Drawn inline rather than shipped as an asset: it stays sharp at any size,
 * costs no extra request, and picks up whatever colour it's placed in. Sizing
 * comes from the className (the viewBox is 32×44, so it's taller than wide —
 * give it a height, not a width).
 *
 * The geometry is deliberately simple. Three straight tines and a crescent
 * yoke survive being drawn at 16px in a browser tab, which barbs and tapered
 * curves do not.
 */

type Props = {
  className?: string;
  /** Decorative by default; pass a title where it stands in for the name. */
  title?: string;
};

export function TridentMark({ className = "h-10", title }: Props) {
  return (
    <svg
      viewBox="0 0 32 44"
      className={className}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {/* Centre spear */}
      <path d="M16 1.4 L17.9 8 L17.9 18 L14.1 18 L14.1 8 Z" />
      {/* Outer tines */}
      <path d="M6.0 2.6 L8.6 15.8 L4.2 15.8 Z" />
      <path d="M26.0 2.6 L27.8 15.8 L23.4 15.8 Z" />
      {/* Yoke joining the tines to the shaft */}
      <path d="M4.2 13.0 C6.6 19.8 25.4 19.8 27.8 13.0 L27.8 16.6 C25.4 22.2 6.6 22.2 4.2 16.6 Z" />
      {/* Shaft and collar */}
      <rect x="14.5" y="18" width="3" height="24" rx="1.4" />
      <rect x="11.2" y="23.2" width="9.6" height="2.4" rx="1.2" />
    </svg>
  );
}
