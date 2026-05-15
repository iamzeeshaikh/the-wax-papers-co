import type { APIRoute } from 'astro';
import { products } from '../data/products';
import { blogPosts } from '../data/blog';

const site = 'https://thewaxpapers.co';

const staticPages = [
  { url: '/',                    priority: '1.0', changefreq: 'weekly',  lastmod: '2026-01-22' },
  { url: '/products/',           priority: '0.9', changefreq: 'weekly',  lastmod: '2026-01-22' },
  { url: '/get-quote/',          priority: '0.9', changefreq: 'monthly', lastmod: '2026-01-22' },
  { url: '/blog/',               priority: '0.8', changefreq: 'weekly',  lastmod: '2026-01-22' },
  { url: '/about/',              priority: '0.7', changefreq: 'monthly', lastmod: '2025-11-01' },
  { url: '/contact/',            priority: '0.7', changefreq: 'monthly', lastmod: '2025-11-01' },
  { url: '/sitemap/',            priority: '0.3', changefreq: 'monthly', lastmod: '2025-11-01' },
  { url: '/privacy-policy/',     priority: '0.2', changefreq: 'yearly',  lastmod: '2025-01-01' },
  { url: '/terms-and-conditions/', priority: '0.2', changefreq: 'yearly', lastmod: '2025-01-01' },
];

export const GET: APIRoute = () => {
  const urls = [
    ...staticPages.map(p => `  <url>
    <loc>${site}${p.url}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`),

    ...products.map(p => `  <url>
    <loc>${site}/products/${p.slug}/</loc>
    <lastmod>2026-01-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
    <image:image>
      <image:loc>${site}${p.heroImage}</image:loc>
      <image:title>${p.title} — Custom Printed Food Paper</image:title>
      <image:caption>${p.intro.slice(0, 100)}</image:caption>
    </image:image>
  </url>`),

    ...blogPosts.map(p => `  <url>
    <loc>${site}/blog/${p.slug}/</loc>
    <lastmod>${p.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.65</priority>
  </url>`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
};
