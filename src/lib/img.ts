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

/** 400px rendition for thumbnails and cards. */
export function imgThumb(src?: string): string {
  if (!src || !isLocal(src)) return src ?? '';
  return src.replace(/\.webp$/, '-400.webp');
}

/** srcset across the three renditions. */
export function imgSrcset(src?: string): string | undefined {
  if (!src || !isLocal(src)) return undefined;
  const base = src.replace(/\.webp$/, '');
  return `${base}-400.webp 400w, ${base}-700.webp 700w, ${src} 1000w`;
}
