/**
 * Product photography is stored as WebP with two smaller renditions generated
 * alongside it by `scripts/optimize-images.mjs`:
 *   <name>.webp       up to 1000px  — hero and detail views
 *   <name>-700.webp   700px         — 2x card size on phones
 *   <name>-400.webp   400px         — thumbnails and cards
 */

function isLocal(src: string): boolean {
  return src.startsWith('/images/') && src.endsWith('.webp');
}

/**
 * Most filenames under /images contain spaces. A raw space is legal in a `src`
 * attribute but not in `srcset`: the parser ends the URL at the first space and
 * reads the rest as a descriptor, which is invalid, so the candidate is dropped
 * and the browser silently falls back to `src` — meaning the 400w/700w
 * renditions never get used. Encoding keeps the URLs byte-identical to what is
 * already indexed while making srcset parse.
 *
 * Space is the only character in these filenames that needs escaping, so a
 * plain replace is enough and cannot double-encode an existing %xx.
 */
function encodePath(src: string): string {
  return src.replace(/ /g, '%20');
}

/** Full-size rendition, encoded so it is safe in both src and srcset. */
export function imgFull(src?: string): string {
  if (!src || !isLocal(src)) return src ?? '';
  return encodePath(src);
}

/** 400px rendition for thumbnails and cards. */
export function imgThumb(src?: string): string {
  if (!src || !isLocal(src)) return src ?? '';
  return encodePath(src.replace(/\.webp$/, '-400.webp'));
}

/** srcset across the three renditions. */
export function imgSrcset(src?: string): string | undefined {
  if (!src || !isLocal(src)) return undefined;
  const base = encodePath(src.replace(/\.webp$/, ''));
  return `${base}-400.webp 400w, ${base}-700.webp 700w, ${base}.webp 1000w`;
}
