import Image from "next/image";

/**
 * The photograph of the island, sitting behind the masthead.
 *
 * A photo under a dashboard fights the content unless it's handled carefully,
 * so the treatment does three things:
 *
 *  - It occupies a band at the top and nothing else. The cards begin below it,
 *    with only their top edge crossing into the picture.
 *  - A vertical scrim fades it into the page. The final stop is the body colour
 *    exactly, so there is no seam between photograph and background.
 *  - It stays darkest at the very top and at the left, which is where the
 *    controls and the wordmark sit. The middle band is left comparatively
 *    open, because the island is the reason the picture is here at all.
 *
 * `priority` because this is the largest element above the fold; without it
 * Next defers the fetch and the masthead visibly pops in on a phone.
 */
export function IslandHero() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[290px] overflow-hidden sm:h-[380px]"
      aria-hidden
    >
      <Image
        src="/island.jpg"
        alt=""
        width={1672}
        height={941}
        priority
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/2wBDABIMDRANCxIQDhAUExIVGywdGxgYGzYnKSAsQDlEQz85Pj1HUGZXR0thTT0+WXlaYWltcnNyRVV9hnxvhWZwcm7/2wBDARMUFBsXGzQdHTRuST5Jbm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm7/wAARCAAJABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAABAX/xAAeEAABBAEFAAAAAAAAAAAAAAABAAIDBBESMkFRYf/EABQBAQAAAAAAAAAAAAAAAAAAAAP/xAAXEQADAQAAAAAAAAAAAAAAAAAAAQNh/9oADAMBAAIRAxEAPwCC2wGDS0Y9TKk0cuWyNye1Kk4SaO8o6LRZs//Z"
        sizes="100vw"
        className="h-full w-full object-cover object-[50%_58%]"
        style={{ filter: "saturate(1.12) contrast(1.04)" }}
      />

      {/* Vertical fade into the page background. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg," +
            " oklch(0.145 0.032 250 / 0.66) 0%," +
            " oklch(0.145 0.032 250 / 0.22) 26%," +
            " oklch(0.145 0.032 250 / 0.32) 48%," +
            " oklch(0.145 0.032 250 / 0.82) 76%," +
            " oklch(0.145 0.032 250) 94%)",
        }}
      />

      {/* Backing for the wordmark, which sits over open sky. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(96deg, oklch(0.145 0.032 250 / 0.52) 0%," +
            " oklch(0.145 0.032 250 / 0.12) 46%, transparent 72%)",
        }}
      />
    </div>
  );
}
