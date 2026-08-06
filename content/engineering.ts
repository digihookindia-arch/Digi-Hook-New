// Generated from the design prototype — copy is final and approved, carried
// across verbatim. Website Engineering page.

import type { Faq } from './types';

export const pillars: { num: string; title: string; body: string }[] = [
  {
    "num": "01",
    "title": "Performance",
    "body": "A budget in kilobytes and milliseconds, agreed up front and checked on every change."
  },
  {
    "num": "02",
    "title": "Security",
    "body": "Encrypted transport, hardened headers, validated inputs and dependencies kept current."
  },
  {
    "num": "03",
    "title": "Findability",
    "body": "Structured data and clean semantics so search engines and AI assistants can quote you correctly."
  },
  {
    "num": "04",
    "title": "Scalability",
    "body": "Cached at the edge and modular in code, so growth in traffic or pages is boring."
  }
];

export const rendering: { name: string; plain: string; best: string; cost: string }[] = [
  {
    "name": "SSG",
    "plain": "The page is built once, in advance, and served as a finished file.",
    "best": "About pages, service pages, articles — anything that rarely changes.",
    "cost": "Needs a rebuild to update."
  },
  {
    "name": "SSR",
    "plain": "The page is built on our server the moment a visitor asks for it.",
    "best": "Dashboards, search results, anything personal or live.",
    "cost": "Slightly slower first byte."
  },
  {
    "name": "ISR",
    "plain": "Pre-built like SSG, but quietly rebuilt on a schedule in the background.",
    "best": "Product catalogues, property listings, blogs — large and changing.",
    "cost": "Updates appear within the refresh window."
  },
  {
    "name": "CSR",
    "plain": "The browser assembles the page after loading a small shell.",
    "best": "Highly interactive tools behind a login.",
    "cost": "Poor for search visibility — used sparingly."
  }
];

export const disciplines: { num: string; title: string; body: string; items: string[] }[] = [
  {
    "num": "01",
    "title": "Performance engineering",
    "body": "Speed is not an optimisation pass at the end. It is a budget the build is held to, the same way a building is held to a load limit.",
    "items": [
      "Images converted, resized and served in modern formats",
      "JavaScript split so a page only loads what it uses",
      "Fonts self-hosted and preloaded to stop text flashing",
      "Third-party scripts deferred or removed — they are the usual culprit",
      "Every release measured on a throttled mobile connection"
    ]
  },
  {
    "num": "02",
    "title": "Security engineering",
    "body": "Most breaches are not clever. They exploit an old dependency, an unvalidated form, or a missing header — all preventable in a day of disciplined work.",
    "items": [
      "TLS 1.3 everywhere, with strict transport security",
      "Content Security Policy and hardened response headers",
      "Every form input validated on the server, not just the browser",
      "Secrets held in environment variables, never in code",
      "Dependencies audited and patched on a schedule"
    ]
  },
  {
    "num": "03",
    "title": "Search and AI findability",
    "body": "Search engines and AI assistants both read your site as text and structure. If the structure is missing, they guess — and guesses do not send customers.",
    "items": [
      "Server-rendered content, so nothing depends on JavaScript to be read",
      "Schema.org markup for services, articles, products and locations",
      "One clear question answered per page, in plain language",
      "Clean URLs, correct canonicals and a real sitemap",
      "Headings that describe content instead of decorating it"
    ]
  },
  {
    "num": "04",
    "title": "Scalability and maintenance",
    "body": "The measure of an engineered site is what it costs to change in year two — not what it looked like in week one.",
    "items": [
      "Typed, modular components reused across pages",
      "Content editable without touching code",
      "Cached at the edge so traffic spikes cost nothing",
      "Documented codebase any competent developer can pick up",
      "Monitoring and alerts on speed, uptime and errors"
    ]
  }
];

export const engineeringFaqs: Faq[] = [
  {
    "id": "f1",
    "q": "Why Next.js instead of WordPress?",
    "a": "WordPress is a good publishing tool, but a typical themed WordPress site loads a large amount of code that your visitors did not ask for, and every plugin adds risk. Next.js lets us send only what a page needs, render it on the server for search engines, and keep the whole thing typed and testable. If your site is mostly articles and a small team edits it daily, we will tell you WordPress is fine — we do not sell complexity you do not need."
  },
  {
    "id": "f2",
    "q": "How long does a project take?",
    "a": "A focused marketing site with clear content is usually four to six weeks. Ecommerce or a listing platform runs eight to fourteen, mostly depending on how ready your data is. The scope document we send names the dates, and the weekly staging link means you never have to ask how it is going."
  },
  {
    "id": "f3",
    "q": "Do I own the code?",
    "a": "Yes, entirely. The repository is yours, documented, with the deployment set up in your own accounts. Nothing is locked to us — an engineered handover means another developer can continue without a rewrite."
  },
  {
    "id": "f4",
    "q": "Can you fix our existing site instead of rebuilding it?",
    "a": "Often, yes, and it is usually cheaper. We start with an audit that separates problems worth fixing in place — images, scripts, hosting, headers — from problems that are structural. You get the list either way, with an honest note on which route makes financial sense."
  },
  {
    "id": "f5",
    "q": "What happens after launch?",
    "a": "Monitoring stays on and you get a monthly summary in plain English: how fast the site was, what search visibility did, what we patched. Retainers are optional and stop whenever you want; the documentation does not disappear with them."
  }
];
