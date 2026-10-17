import data from '../data/page-faqs.json';

/**
 * Extra FAQs keyed by route (with trailing slash) so every indexable page has
 * at least ten. Answers may hold one authored <a href="/path/">anchor</a>.
 */
export type Faq = { q: string; a: string };
type Entry = { h2: string; faqs: Faq[] };
const DATA = data as Record<string, Entry>;
const norm = (p: string) => (p.endsWith('/') ? p : p + '/');

export const extraFaqs = (route: string): Faq[] => DATA[norm(route)]?.faqs ?? [];
export const extraHeading = (route: string) => DATA[norm(route)]?.h2 ?? 'Frequently Asked Questions';
export const plainText = (s: string) => s.replace(/<[^>]+>/g, '');
export function withExtras(route: string, faqs: Faq[]): Faq[] {
  const seen = new Set(faqs.map((f) => f.q.trim().toLowerCase()));
  return [...faqs, ...extraFaqs(route).filter((f) => !seen.has(f.q.trim().toLowerCase()))];
}
export const faqPageSchema = (faqs: Faq[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: plainText(f.a) } })),
});
