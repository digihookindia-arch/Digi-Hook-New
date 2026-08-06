// Generated from the design prototype — copy is final and approved, carried
// across verbatim. SEO & AEO page.

import type { Faq, Numbered, Plan, SeoType } from './types';

export const seoChips: string[] = [
  "Technical SEO",
  "On-page",
  "Local SEO",
  "Content",
  "AEO / AI search"
];

export const seoWhy: Numbered[] = [
  {
    "num": "01",
    "title": "The enquiry goes to your competitor instead",
    "body": "Nobody scrolls to page two. If a competitor sits above you, they get the call you would have won — same service, same city, sometimes a worse business. You are not losing on quality. You are losing on visibility."
  },
  {
    "num": "02",
    "title": "You end up renting customers forever",
    "body": "With no search presence, every single enquiry has to be bought through ads. The day you pause the spend, the phone stops. A page that ranks keeps working while you sleep, and gets cheaper every month it stays there."
  },
  {
    "num": "03",
    "title": "People judge you before you speak",
    "body": "Buyers assume the businesses on page one are the serious ones. Being absent is read as being small, new or inactive — an unfair judgement made before anyone has seen your work."
  },
  {
    "num": "04",
    "title": "Now AI skips you too",
    "body": "When someone asks an assistant for a recommendation, it answers from sources it can read and trust. No search presence means no mention. This is the same mistake as ignoring Google in 2010, happening again right now."
  }
];

export const seoTypes: SeoType[] = [
  {
    "id": "s1",
    "num": "01",
    "name": "Technical SEO",
    "tag": "Foundation",
    "body": "Making sure search engines can reach, read and understand every page. This is the floor — no amount of content fixes a site that cannot be crawled properly.",
    "items": [
      "Crawlability, indexing and sitemap health",
      "Site speed and Core Web Vitals",
      "Mobile rendering and responsive behaviour",
      "Clean URLs, canonicals and redirects",
      "Structured data markup",
      "HTTPS, security headers and error handling"
    ]
  },
  {
    "id": "s2",
    "num": "02",
    "name": "On-page SEO",
    "tag": "Each page",
    "body": "What an individual page says and how it is organised — so both a reader and a search engine can tell in seconds what question it answers.",
    "items": [
      "One clear search intent per page",
      "Titles and meta descriptions written to be clicked",
      "Heading structure that reflects real content",
      "Internal links to related pages",
      "Image alt text and file naming",
      "Readable formatting and scannable sections"
    ]
  },
  {
    "id": "s3",
    "num": "03",
    "name": "Off-page SEO",
    "tag": "Authority",
    "body": "Signals from outside your website that suggest you are a credible source — mostly other reputable sites linking to or mentioning you.",
    "items": [
      "Genuine backlinks from relevant sites",
      "Business directory and citation consistency",
      "Digital PR and industry mentions",
      "Brand searches and reputation signals",
      "Removing or disavowing harmful links",
      "No purchased link schemes — they eventually cost you"
    ]
  },
  {
    "id": "s4",
    "num": "04",
    "name": "Local SEO",
    "tag": "Nearby",
    "body": "Getting found by people searching in your city or neighbourhood. For clinics, showrooms, offices and service businesses, this is usually the highest-value work of all.",
    "items": [
      "Google Business Profile setup and optimisation",
      "Location and service-area pages",
      "Consistent name, address and phone everywhere",
      "Local structured data",
      "Review generation and responses",
      "Maps visibility for ‘near me’ searches"
    ]
  },
  {
    "id": "s5",
    "num": "05",
    "name": "Content SEO",
    "tag": "Answers",
    "body": "Publishing pages that genuinely answer the questions your customers ask, in the order they ask them — from first curiosity to ready to buy.",
    "items": [
      "Keyword and question research",
      "Topic clusters instead of scattered posts",
      "Service pages written for one intent each",
      "Comparison, pricing and FAQ content",
      "Refreshing pages that are slipping",
      "Editors write, engineers fact-check"
    ]
  },
  {
    "id": "s6",
    "num": "06",
    "name": "Ecommerce SEO",
    "tag": "Products",
    "body": "Category and product pages are their own discipline — thousands of near-identical pages, filters that create duplicates, and stock that changes daily.",
    "items": [
      "Category page architecture",
      "Product structured data with price and availability",
      "Filter and pagination handling",
      "Duplicate and thin content control",
      "Out-of-stock and discontinued product strategy",
      "Merchant feed alignment"
    ]
  }
];

export const seoTools: { name: string; use: string }[] = [
  {
    "name": "Semrush",
    "use": "Competitor visibility, keyword gaps, backlink profiles and which of their pages actually earn traffic."
  },
  {
    "name": "Google Search Console",
    "use": "What you already rank for, where you sit on page two, and every indexing problem Google has found."
  },
  {
    "name": "Google Analytics",
    "use": "What visitors do after they arrive — which pages produce enquiries and which quietly lose them."
  },
  {
    "name": "PageSpeed / CrUX",
    "use": "Real-visitor Core Web Vitals, because speed is a ranking factor and a conversion factor at once."
  },
  {
    "name": "Google Business Profile",
    "use": "Local visibility, map pack position, calls, direction requests and review activity."
  },
  {
    "name": "Schema validators",
    "use": "Confirming that search engines and AI assistants read your structured data the way we intended."
  }
];

export const seoAeo: { title: string; body: string }[] = [
  {
    "title": "Server-rendered content",
    "body": "If a page needs JavaScript to show its text, many crawlers and assistants simply never see it."
  },
  {
    "title": "One question per page, answered early",
    "body": "Assistants extract answers. A page that states its answer in the first paragraph gets quoted; one that builds up to it does not."
  },
  {
    "title": "Structured data everywhere",
    "body": "Organisation, service, product, article, FAQ and location schema, so machines read facts instead of guessing them."
  },
  {
    "title": "Plain, checkable language",
    "body": "Short sentences and specific claims. Marketing adjectives are unquotable and get skipped."
  },
  {
    "title": "Consistent facts across the web",
    "body": "Your name, address, services and prices should match everywhere — contradictions make an assistant distrust all of it."
  },
  {
    "title": "Genuine depth on your subject",
    "body": "Assistants favour sources that cover a topic completely. Ten shallow pages lose to three thorough ones."
  }
];

export const seoPlans: Plan[] = [
  {
    "num": "01",
    "kicker": "Foundation",
    "title": "Growth SEO",
    "price": "₹8,000 / month",
    "priceNote": "Monthly, no lock-in · excludes GST",
    "body": "For a single-location business that needs to start appearing for the searches its customers already make.",
    "forLabel": "Best for clinics, local services and small brands",
    "items": [
      "Full technical audit, then ongoing fixes",
      "Up to 10 target keywords",
      "On-page optimisation across existing pages",
      "Google Business Profile and local SEO",
      "Structured data and schema setup",
      "2 optimised content pieces per month",
      "Search Console and Analytics monitoring",
      "Monthly plain-English report"
    ],
    "cta": "Start with Growth",
    "variant": "light"
  },
  {
    "num": "02",
    "kicker": "Competitive · Most chosen",
    "title": "Authority SEO + AEO",
    "price": "₹12,000 / month",
    "priceNote": "Monthly, no lock-in · excludes GST",
    "body": "For businesses in a contested market that also want to be the source AI assistants quote.",
    "forLabel": "Best for multi-location, ecommerce and competitive sectors",
    "items": [
      "Everything in the Growth plan",
      "Up to 25 target keywords",
      "Semrush competitor and gap analysis",
      "AEO: structured answers built for AI citation",
      "4 optimised content pieces per month",
      "Off-page authority and citation building",
      "Conversion tracking and enquiry attribution",
      "Monthly strategy call with the team"
    ],
    "cta": "Start with Authority",
    "variant": "accent"
  }
];

export const seoFaqs: Faq[] = [
  {
    "id": "sf1",
    "q": "How long does SEO take to work?",
    "a": "Technical fixes can show within weeks. Content and authority usually take three to six months to move meaningfully, and competitive terms take longer. Anyone promising page one in thirty days is either buying links or describing a term nobody searches."
  },
  {
    "id": "sf2",
    "q": "Can you guarantee the first position?",
    "a": "No, and neither can anyone else — Google does not sell positions and its ranking system changes constantly. What we can guarantee is the work: measurable technical health, published pages, and a monthly report showing exactly what moved."
  },
  {
    "id": "sf3",
    "q": "Is SEO still worth it now that AI answers questions directly?",
    "a": "More than before, but the target has widened. AI assistants build their answers from web sources, and the same things that make you rank — clear structure, real depth, structured data, trustworthy signals — make you citable. Sites with no search presence are invisible to both."
  },
  {
    "id": "sf4",
    "q": "Do we need new content, or can you optimise what we have?",
    "a": "Usually both, starting with what exists. Pages sitting on page two are the cheapest wins available. New content comes after we know which questions your existing site fails to answer."
  },
  {
    "id": "sf5",
    "q": "What do we get every month?",
    "a": "A plain-English report: visibility and ranking movement, traffic and enquiries by source, what we published or fixed, what it changed, and what we are doing next month. No vanity charts."
  }
];
