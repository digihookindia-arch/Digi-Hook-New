import type { RouteKey } from './navigation';

/**
 * Search-result snippets.
 *
 * These are not page copy — they are the ~155 characters Google renders under
 * the title, and nothing here appears on the site itself. Pages previously
 * reused their on-page `lead`, which reads well in a hero and gets cut off
 * mid-sentence in a SERP; every one of them ran past 160 characters.
 *
 * Keep each under 160 and unique. `npm run seo` fails the build-adjacent check
 * if either stops being true.
 */
export const metaDescriptions: Record<RouteKey, string> = {
  home: 'IT solutions and creative agency in Noida. Websites, online stores, industry platforms, design and digital marketing — engineered to measurable targets.',

  engineering:
    'Custom websites built on Next.js and TypeScript in Noida, engineered against real targets for speed, security, search and accessibility.',

  seo: 'SEO and answer-engine optimisation from a Noida studio — structured data, clean URLs and content that search engines and AI assistants can both read.',

  ecommerce:
    'Ecommerce websites built in Noida where checkout is the fastest part of the site, with an admin panel your team actually runs the store from.',

  medical:
    'Websites and platforms for clinics and hospitals in India — appointments, patient privacy and local search, engineered rather than assembled.',

  realestate:
    'Property listing platforms that stay fast with thousands of listings — indexed search, map views and leads that reach you without the lag.',

  marketing:
    'Search and paid growth built on a site that already converts. SEO, ads and analytics from a Noida agency — measurement before spend.',

  creative:
    'Brand identity, interface design and the design system that keeps them consistent, from a creative studio in Noida.',

  technology:
    'The stack we build on and why — Next.js, TypeScript, MongoDB, edge hosting — each explained in language a non-developer can follow.',

  knowledge:
    'Straight answers to the questions business owners actually ask about websites, with the trade-offs left in rather than edited out.',

  article:
    'Why websites are slow, in plain English: the four decisions behind almost all slowness, how to measure honestly, and which fixes actually work.',

  articleStack:
    'Next.js or WordPress? Decide by who edits the site, how custom it is and what it connects to — including when WordPress is the right answer.',

  articleCost:
    'Why website quotes in India differ tenfold, what actually moves the price, what the cheap quote leaves out, and our own prices published in full.',

  pricing:
    'Fixed website prices published in full: ₹20,000 for a business site, ₹35,000 for ecommerce, every add-on listed with its price. Excludes GST.',

  about:
    'Digi Hook is an IT solutions and creative agency in Noida — engineers, designers and marketers who explain every decision in plain English.',

  contact:
    'Tell us what your project needs. You get a written scope with pages, technology choices, timeline and stage costs before any commitment.',
};

/**
 * Shorter titles for the three long-form articles. The <h1> keeps the full
 * headline; this is only what fits in a result before Google truncates it.
 */
export const metaTitles = {
  article: 'Why your website is slow — and how to fix it',
  articleStack: 'Next.js or WordPress: how to decide',
  articleCost: 'What a website should cost in India',
} as const;
