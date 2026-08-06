import { routes } from './navigation';

/**
 * Home page copy — lifted verbatim from the prototype (`readout`, `standards`,
 * `compare`, `practices`, `steps`, `industries`, marquee, and the section
 * headings in the `isHome` template). Copy is final and approved; do not edit.
 *
 * EXCEPTION — `homeHero`, rewritten 2026-07-26 at the client's direction. The
 * prototype positioned the studio as website-only, which undersold six of the
 * seven practices the site already sells. The rest of this file is untouched.
 */

export const homeHero = {
  eyebrow: 'IT solutions & creative agency · Noida, India',
  h1a: 'We engineer',
  h1b: 'everything',
  lead: 'Most agencies build pages. We build systems — websites, online stores, industry platforms, brand and the marketing behind them, all measured against real engineering targets for speed, security, search and scale.',
  sub: 'Engineers, designers, editors and marketers under one roof. Every decision on your project is explained in plain English before a single line is written.',
  primaryCta: 'Request a project scope',
  secondaryCta: 'How we engineer',
  readoutTitle: 'Build readout',
  readoutTag: 'live targets',
  readoutNote:
    'Thresholds published by Google for Core Web Vitals — not our marketing numbers. Every build is measured against them before launch.',
} as const;

export const readout: { label: string; value: string }[] = [
  { label: 'Largest Contentful Paint', value: '≤ 2.5s' },
  { label: 'Interaction to Next Paint', value: '≤ 200ms' },
  { label: 'Cumulative Layout Shift', value: '≤ 0.10' },
  { label: 'Transport security', value: 'TLS 1.3' },
  { label: 'Accessibility baseline', value: 'WCAG 2.2 AA' },
];

export const standards: { value: string; name: string; note: string }[] = [
  {
    value: '2.5s',
    name: 'Load',
    note: 'The main content of a page should be visible within two and a half seconds.',
  },
  {
    value: '200ms',
    name: 'Response',
    note: 'A tap or click should produce a visible response in under a fifth of a second.',
  },
  {
    value: '0.10',
    name: 'Stability',
    note: 'Nothing should jump around while the page is loading.',
  },
  {
    value: '100%',
    name: 'Explained',
    note: 'Every technical choice on your site written down in language you can read.',
  },
];

export const difference = {
  kicker: '01 — The difference',
  heading1: 'Development builds it.',
  heading2: 'Engineering makes it hold.',
  body: 'A developer answers “does it work?” An engineer answers “does it work at 3am on a 4G phone, with 40,000 people on it, six months after launch, when Google re-crawls it?” Those are different jobs. We do the second one.',
} as const;

export const compare: { q: string; them: string; us: string }[] = [
  {
    q: 'How is the page built?',
    them: 'Whatever the theme or page builder does by default.',
    us: 'Chosen per page — pre-built, rendered on request, or refreshed on a schedule.',
  },
  {
    q: 'What happens on a slow phone?',
    them: "Tested on the developer's laptop and shipped.",
    us: 'Measured on a throttled 4G connection against a fixed performance budget.',
  },
  {
    q: 'Who can find it?',
    them: 'An SEO plugin is installed.',
    us: 'Structured data, clean URLs and machine-readable content so search engines and AI assistants both understand it.',
  },
  {
    q: 'What if traffic multiplies overnight?',
    them: 'The site goes down and someone upgrades hosting.',
    us: 'Cached at the edge and load-tested before launch — traffic spikes cost nothing extra.',
  },
  {
    q: 'What happens after launch?',
    them: 'Handover, then silence until something breaks.',
    us: 'Monitoring, monthly numbers, and a documented codebase your next developer can read.',
  },
];

export const practicesIntro = {
  kicker: '02 — What we do',
  heading: 'Six practices, one engineering standard.',
} as const;

export const practices: {
  num: string;
  title: string;
  body: string;
  meta: string;
  href: string;
}[] = [
  {
    num: '01',
    title: 'Website Engineering',
    body: 'Custom sites built on Next.js and TypeScript, engineered to performance, security and accessibility targets.',
    meta: 'Next.js · TypeScript · Tailwind',
    href: routes.engineering,
  },
  {
    num: '02',
    title: 'Ecommerce Solutions',
    body: 'Storefronts where the checkout is the fastest part of the site, not the slowest.',
    meta: 'Catalogue · Cart · Payments',
    href: routes.ecommerce,
  },
  {
    num: '03',
    title: 'Medical Technology',
    body: 'Clinic and hospital platforms handling appointments and patient data with care.',
    meta: 'Appointments · Privacy · Local search',
    href: routes.medical,
  },
  {
    num: '04',
    title: 'Real Estate Technology',
    body: 'Listing platforms that stay quick with thousands of properties and heavy imagery.',
    meta: 'Listings · Map search · Leads',
    href: routes.realestate,
  },
  {
    num: '05',
    title: 'Digital Marketing',
    body: 'Search and paid growth built on a site that already converts — measurement first.',
    meta: 'SEO · Ads · Analytics',
    href: routes.marketing,
  },
  {
    num: '06',
    title: 'Creative Design Studio',
    body: 'Identity and interface design, plus the design system that keeps it consistent.',
    meta: 'Brand · UI · Design systems',
    href: routes.creative,
  },
];

export const processIntro = {
  kicker: '03 — Process',
  heading: 'A build you can follow without knowing code.',
  body: 'Five stages. Each one ends in something you can read, click or measure — never a status update that only makes sense to a developer.',
  link: 'Start at stage one',
} as const;

export const steps: { num: string; title: string; body: string; out: string }[] =
  [
    {
      num: '01',
      title: 'Understand the business, not the brief',
      body: 'We start with what the site has to achieve — enquiries, orders, appointments — and what currently stops it. Technology decisions come after that, never before.',
      out: 'A written scope with fixed outcomes',
    },
    {
      num: '02',
      title: 'Architecture on paper first',
      body: 'Which pages exist, where each one is built, what data it needs and how it will be found in search. Agreed before design starts, because changing it later is what makes projects slip.',
      out: 'Sitemap, data model, rendering plan',
    },
    {
      num: '03',
      title: 'Design against real content',
      body: 'Layouts drawn with your actual copy, images and product data — not placeholder text that hides the hard cases.',
      out: 'Clickable design of every key page',
    },
    {
      num: '04',
      title: 'Build, measure, repeat',
      body: 'Typed, modular code with the performance budget enforced on every change. If a feature would break the budget, you hear about the trade-off before it ships.',
      out: 'Staging site you can test weekly',
    },
    {
      num: '05',
      title: 'Launch and keep watch',
      body: 'Monitoring on speed, uptime and search visibility from day one, with a plain-English monthly summary of what moved and why.',
      out: 'Monitoring, documentation, monthly report',
    },
  ];

export const industriesIntro = {
  kicker: '04 — Industries',
  heading:
    'Three sectors where the engineering actually decides the outcome.',
} as const;

export const industries: {
  kicker: string;
  title: string;
  body: string;
  points: string[];
  href: string;
}[] = [
  {
    kicker: 'Ecommerce',
    title: 'Every extra second costs a cart',
    body: 'Product pages carry the heaviest images and the most third-party scripts on the web. Engineering decides whether a shopper reaches payment.',
    points: [
      'Image pipeline and lazy loading',
      'Checkout kept off the critical path',
      'Product schema for search results',
    ],
    href: routes.ecommerce,
  },
  {
    kicker: 'Healthcare',
    title: 'Trust is a technical property',
    body: 'Patients judge a clinic by its website before its waiting room. Privacy, uptime and clarity are engineering work, not copywriting.',
    points: [
      'Consent-aware appointment flows',
      'Encrypted patient data handling',
      'Local search and doctor profiles',
    ],
    href: routes.medical,
  },
  {
    kicker: 'Real estate',
    title: 'Thousands of listings, one fast page',
    body: 'Property portals fail on the database, not the design. Search, filters and maps have to stay instant as inventory grows.',
    points: [
      'Indexed search and filters',
      'Map views without the lag',
      'Individual listings indexed by Google',
    ],
    href: routes.realestate,
  },
];

/** Accent marquee of technology names; dim ones sit at 45% opacity. */
export const marquee: { name: string; dim: boolean }[] = [
  { name: 'Next.js', dim: false },
  { name: 'Node.js', dim: true },
  { name: 'TypeScript', dim: false },
  { name: 'MongoDB', dim: true },
  { name: 'Tailwind CSS', dim: false },
  { name: 'SSR', dim: true },
  { name: 'ISR', dim: false },
  { name: 'Edge caching', dim: true },
  { name: 'Core Web Vitals', dim: false },
  { name: 'Schema.org', dim: true },
];

export const knowledgeTeaser = {
  kicker: '05 — Knowledge Hub',
  heading: 'We publish the answers, not the pitch.',
  body: 'Real questions business owners ask us, answered properly — with the trade-offs left in. Read it, and you can brief any agency better, including us.',
  button: 'Open the Knowledge Hub',
  cardKicker: 'Flagship article · 12 min read',
  cardTitle: 'Why your website is slow — and what actually fixes it',
  cardBody:
    'A plain-English tour of what happens between a click and a visible page, which four decisions cause almost all slowness, and how to tell whether a fix is real or cosmetic.',
  cardLink: 'Read the article',
  href: routes.knowledge,
} as const;
