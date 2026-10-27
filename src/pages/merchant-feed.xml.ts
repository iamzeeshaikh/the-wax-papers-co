// Google Merchant feed, built from the same catalog and the same src/lib/order.mjs
// constants as the product pages, their JSON-LD, the checkout and api/order.js:
// one item per product, 1,000 sheets for $40.00, free US shipping.
import type { APIRoute } from 'astro';
import { products } from '../data/products';
import { PACK_QTY, PACK_PRICE_TEXT, SHIP_COUNTRIES, HANDLING_DAYS, TRANSIT_DAYS } from '../lib/order.mjs';

const SITE = 'https://thewaxpapers.co';
const x = (s: unknown) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
const abs = (p: string) => encodeURI(`${SITE}${p}`);

export const GET: APIRoute = () => {
  const items = products.map((p) => {
    const imgs = [p.heroImage, ...p.images].filter((img, i, arr) => img && arr.indexOf(img) === i).slice(0, 6).map(abs);
    return `  <item>
    <g:id>TWP-${x(p.slug)}</g:id>
    <title>${x(`${p.title} - ${PACK_QTY.toLocaleString('en-US')} Custom Printed Sheets`)}</title>
    <description>${x(`${p.metaDescription} Sold in runs of ${PACK_QTY.toLocaleString('en-US')} sheets on our standard printed build, after a free digital proof.`)}</description>
    <link>${SITE}/products/${x(p.slug)}/</link>
    <g:image_link>${x(imgs[0])}</g:image_link>${imgs.slice(1).map((u) => `\n    <g:additional_image_link>${x(u)}</g:additional_image_link>`).join('')}
    <g:availability>in_stock</g:availability>
    <g:condition>new</g:condition>
    <g:price>${PACK_PRICE_TEXT} USD</g:price>
    <g:multipack>${PACK_QTY}</g:multipack>
    <g:brand>The Wax Papers</g:brand>
    <g:identifier_exists>no</g:identifier_exists>
    <g:mpn>${x(p.slug)}</g:mpn>
    <g:product_type>${x(p.category)}</g:product_type>
${SHIP_COUNTRIES.map((c) => `    <g:shipping><g:country>${c.code}</g:country><g:service>Free shipping</g:service><g:price>0.00 USD</g:price><g:min_transit_time>${TRANSIT_DAYS[0]}</g:min_transit_time><g:max_transit_time>${TRANSIT_DAYS[1]}</g:max_transit_time></g:shipping>`).join('\n')}
    <g:min_handling_time>${HANDLING_DAYS[0]}</g:min_handling_time>
    <g:max_handling_time>${HANDLING_DAYS[1]}</g:max_handling_time>
  </item>`;
  }).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>The Wax Papers</title>
  <link>${SITE}/</link>
  <description>Custom printed food papers.</description>
${items}
</channel>
</rss>
`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
