// Generated from the design prototype — copy is final and approved, carried
// across verbatim. Technology page — 11 topics.

import type { Topic } from './types';

export const topics: Topic[] = [
  {
    "id": "t1",
    "num": "01",
    "name": "Next.js",
    "tag": "Framework",
    "what": "The framework we build sites in. It decides where each page is assembled — on our server, in advance, or in the browser.",
    "why": "It gives you the speed of a pre-built page with the flexibility of a live one, and search engines receive finished HTML rather than an empty shell.",
    "how": "App Router with server components by default, so pages arrive ready to read and only interactive parts ship JavaScript."
  },
  {
    "id": "t2",
    "num": "02",
    "name": "Node.js",
    "tag": "Runtime",
    "what": "The engine that runs our server-side code — handling forms, payments, integrations and anything that must not happen in the browser.",
    "why": "One language across the whole stack means fewer translation errors, faster fixes, and a wider pool of developers who can maintain your site.",
    "how": "Thin, well-tested API routes for the work that needs a server; nothing on it that could safely be pre-built."
  },
  {
    "id": "t3",
    "num": "03",
    "name": "MongoDB",
    "tag": "Database",
    "what": "A document database. Instead of rigid tables it stores flexible records — a property, a product, a patient enquiry — each with the fields it actually needs.",
    "why": "Your catalogue can gain a new attribute without a painful migration, which is why listing and catalogue businesses outgrow rigid schemas.",
    "how": "Indexed queries designed around the searches your users perform, with backups and access rules in place from day one."
  },
  {
    "id": "t4",
    "num": "04",
    "name": "TypeScript",
    "tag": "Language",
    "what": "JavaScript with a type checker. It verifies that the data moving through your site is the shape the code expects.",
    "why": "Whole categories of bugs are caught while we are writing, not by your customer at checkout. It also makes the codebase readable years later.",
    "how": "Strict mode across the project, with shared types for content and API responses so front-end and back-end cannot drift apart."
  },
  {
    "id": "t5",
    "num": "05",
    "name": "Tailwind CSS",
    "tag": "Styling",
    "what": "A styling system built from small, fixed utilities instead of ever-growing custom stylesheets.",
    "why": "Design stays consistent across hundreds of pages, and the CSS your visitors download stays small because unused styles are stripped out.",
    "how": "Design tokens for colour, type and spacing defined once, then composed — so a brand change is one file, not a hunt."
  },
  {
    "id": "t6",
    "num": "06",
    "name": "SSR",
    "tag": "Rendering",
    "what": "Server-Side Rendering: the page is built on the server at the moment it is requested.",
    "why": "Visitors and search engines both receive complete content immediately — essential for anything personalised, live or logged-in.",
    "how": "Used where freshness genuinely matters: search results, dashboards, availability. Never as a blanket default."
  },
  {
    "id": "t7",
    "num": "07",
    "name": "ISR",
    "tag": "Rendering",
    "what": "Incremental Static Regeneration: pages are served pre-built, then quietly rebuilt in the background on a schedule.",
    "why": "You get static-file speed on a catalogue of thousands of pages that still changes daily — without paying to render every visit.",
    "how": "Revalidation windows set per content type: minutes for prices and availability, hours for articles and service pages."
  },
  {
    "id": "t8",
    "num": "08",
    "name": "Performance",
    "tag": "Discipline",
    "what": "The measurable experience of your site: how quickly the main content appears, how fast it responds, how still it stays while loading.",
    "why": "Slow pages lose customers before they see anything, and speed is a confirmed ranking factor. It is the cheapest conversion work available.",
    "how": "A performance budget enforced in the build, measured on throttled mobile, with images, fonts and scripts treated as the main suspects."
  },
  {
    "id": "t9",
    "num": "09",
    "name": "Security",
    "tag": "Discipline",
    "what": "Keeping data in transit encrypted, inputs untrusted, dependencies current and the server saying only what it should.",
    "why": "One breach costs more than the site did — in downtime, in reputation, and in the questions customers stop asking your competitors.",
    "how": "TLS 1.3, strict headers and a content security policy, server-side validation on every form, and scheduled dependency audits."
  },
  {
    "id": "t10",
    "num": "10",
    "name": "Hosting",
    "tag": "Infrastructure",
    "what": "Where your site physically runs, and how close the copies sit to the people loading it.",
    "why": "A visitor in Delhi should not wait for a server in Virginia. Hosting choice quietly sets the floor for how fast your site can ever be.",
    "how": "Deployed to a global edge network with automatic HTTPS, preview deployments per change, and instant rollback if a release misbehaves."
  },
  {
    "id": "t11",
    "num": "11",
    "name": "Scalability",
    "tag": "Architecture",
    "what": "The ability to add traffic, pages, products or team members without the site or the codebase falling apart.",
    "why": "Growth should be an operational detail, not an emergency. Most rebuilds happen because the first build could not bend.",
    "how": "Edge caching, modular typed components, content editable without deploys, and load testing before launch rather than after."
  }
];
