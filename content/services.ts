// Generated from the design prototype — copy is final and approved, carried
// across verbatim. Shared "service page" layout: ecommerce, marketing, creative.

import type { ServiceContent } from './types';

export const services: Record<'ecommerce' | 'marketing' | 'creative', ServiceContent> = {
  "ecommerce": {
    "kicker": "Ecommerce Solutions",
    "title": "Storefronts where checkout is the fastest part of the site.",
    "lead": "Product pages carry the heaviest images and the most third-party scripts on the web, and shoppers abandon on the slowest step. We engineer the catalogue, the cart and the payment path as one system — then measure it on a mid-range phone.",
    "chips": [
      "Catalogue architecture",
      "Cart & checkout",
      "Payments",
      "Product schema"
    ],
    "failTitle": "Ecommerce sites rarely fail at design. They fail three steps later.",
    "problems": [
      {
        "num": "01",
        "title": "The catalogue outgrows the build",
        "body": "Two hundred products behave nothing like two thousand. Search, filters and category pages that were never indexed properly slow down exactly as the business grows."
      },
      {
        "num": "02",
        "title": "Checkout inherits the whole site",
        "body": "The payment page loads the same sliders, chat widgets and tracking scripts as the homepage — on the one screen where a half-second decides the sale."
      },
      {
        "num": "03",
        "title": "Products are invisible to search",
        "body": "Without product structured data, price and availability never appear in results, and AI shopping assistants cannot read the catalogue at all."
      }
    ],
    "buildTitle": "Four systems, engineered together.",
    "builds": [
      {
        "num": "01",
        "title": "Catalogue and search",
        "body": "A data model designed around how your customers actually browse, not how the spreadsheet was exported.",
        "items": [
          "Indexed search and faceted filters that stay instant",
          "Category pages pre-built and refreshed on a schedule",
          "Variant, stock and price fields modelled once, used everywhere",
          "Bulk import and edit without touching code"
        ]
      },
      {
        "num": "02",
        "title": "Product pages that load first",
        "body": "The image and the price appear before anything decorative is allowed to load.",
        "items": [
          "Responsive image pipeline in modern formats",
          "Reserved image space so nothing jumps",
          "Reviews and recommendations loaded after first paint",
          "Product schema for rich results"
        ]
      },
      {
        "num": "03",
        "title": "Cart and checkout",
        "body": "Kept deliberately lean and separated from the rest of the site's code.",
        "items": [
          "Server-validated cart state",
          "Payment gateway integration with retry handling",
          "Guest checkout that does not lose the basket",
          "Order confirmation and invoice flow"
        ]
      },
      {
        "num": "04",
        "title": "Operations and growth",
        "body": "The parts that decide whether the store is a pleasure or a burden to run.",
        "items": [
          "Inventory and order dashboards for your team",
          "Analytics with real funnel measurement",
          "Search Console and merchant feed set up",
          "Load tested before your first sale event"
        ]
      }
    ],
    "specs": [
      {
        "name": "Rendering per page",
        "plain": "Category and product pages pre-built and refreshed on a schedule; cart and account rendered live."
      },
      {
        "name": "Image pipeline",
        "plain": "Every upload resized and converted automatically, so your team cannot accidentally slow the store down."
      },
      {
        "name": "Payments",
        "plain": "Indian gateways with UPI, cards and netbanking, plus server-side verification of every transaction."
      },
      {
        "name": "Search visibility",
        "plain": "Product, breadcrumb and offer structured data on every item, with a clean sitemap that updates itself."
      },
      {
        "name": "Sale-day capacity",
        "plain": "Cached at the edge and load tested, so a campaign spike costs nothing extra in hosting."
      },
      {
        "name": "Handover",
        "plain": "Documented codebase, admin training, and analytics you can read without a specialist."
      }
    ],
    "ctaTitle": "Send us your store. We'll show you where the drop-off is."
  },
  "marketing": {
    "kicker": "Digital Marketing",
    "title": "Marketing that begins with a site worth sending traffic to.",
    "lead": "Paying to send visitors to a slow, badly-measured website means paying twice. We fix the destination first, then run search, content and paid growth on top of numbers you can trust.",
    "chips": [
      "Technical SEO",
      "Content",
      "Performance ads",
      "Measurement"
    ],
    "failTitle": "Most marketing spend is lost before the campaign starts.",
    "problems": [
      {
        "num": "01",
        "title": "The destination leaks",
        "body": "A slow landing page raises the cost of every click. Speed is the cheapest conversion work available, and it is done once."
      },
      {
        "num": "02",
        "title": "Measurement nobody trusts",
        "body": "Three analytics tools with three different numbers, none matching the enquiries in the inbox. Decisions become opinions."
      },
      {
        "num": "03",
        "title": "Content written for algorithms",
        "body": "Pages stuffed with keywords answer nothing. Search engines and AI assistants now reward the page that actually resolves the question."
      }
    ],
    "buildTitle": "Four disciplines, in this order.",
    "builds": [
      {
        "num": "01",
        "title": "Technical SEO",
        "body": "The foundation. Everything else compounds on top of it or does not compound at all.",
        "items": [
          "Crawl, index and canonical audit",
          "Structured data for services, articles and locations",
          "Core Web Vitals brought inside Google's thresholds",
          "Internal linking that reflects how you actually sell"
        ]
      },
      {
        "num": "02",
        "title": "Measurement",
        "body": "One source of truth before a rupee of spend.",
        "items": [
          "Analytics and conversion tracking installed correctly",
          "Call, form and WhatsApp enquiries attributed to source",
          "Server-side events where privacy rules require it",
          "A dashboard your team reads without a manual"
        ]
      },
      {
        "num": "03",
        "title": "Content that answers",
        "body": "Written by editors, reviewed by the engineers who did the work.",
        "items": [
          "One real question answered per page",
          "Plain-language depth AI assistants can quote",
          "Service and location pages built to a repeatable structure",
          "Editorial calendar tied to your sales conversations"
        ]
      },
      {
        "num": "04",
        "title": "Paid growth",
        "body": "Run only once the destination and measurement are honest.",
        "items": [
          "Search and Performance Max campaign structure",
          "Landing pages engineered per campaign",
          "Budget reallocated on measured cost per enquiry",
          "Monthly review in plain English"
        ]
      }
    ],
    "specs": [
      {
        "name": "Starting point",
        "plain": "A technical audit — you get the findings whether or not you continue with us."
      },
      {
        "name": "Reporting",
        "plain": "Monthly, in plain English: what moved, what it cost, what we are changing next month."
      },
      {
        "name": "Attribution",
        "plain": "Every enquiry traced to its source, including phone calls and WhatsApp."
      },
      {
        "name": "Content review",
        "plain": "Written by editors and fact-checked by the engineers, so nothing technical is wrong."
      },
      {
        "name": "AI search",
        "plain": "Content structured so assistants can extract and cite your answers correctly."
      },
      {
        "name": "Commitment",
        "plain": "Monthly retainer, no lock-in. The audit and documentation stay yours."
      }
    ],
    "ctaTitle": "Let's audit the destination before you spend on traffic."
  },
  "creative": {
    "kicker": "Creative Design Studio",
    "title": "Design decided by structure, not decoration.",
    "lead": "Good design on the web is a system: a type scale, a spacing rhythm, a set of components. Get the system right and every future page looks considered. Get it wrong and every page is a negotiation.",
    "chips": [
      "Identity",
      "Interface design",
      "Design systems",
      "Art direction"
    ],
    "failTitle": "Beautiful mockups, then a year of drift.",
    "problems": [
      {
        "num": "01",
        "title": "Designs that only work with fake content",
        "body": "Layouts drawn around perfect placeholder text collapse the moment real product names, long titles and actual photography arrive."
      },
      {
        "num": "02",
        "title": "No system, so no consistency",
        "body": "Six shades of the same grey and four button styles across nine pages, because nothing was ever defined once and reused."
      },
      {
        "num": "03",
        "title": "Decoration that costs speed",
        "body": "Heavy animation and oversized imagery added for impressiveness, paid for by every visitor on mobile data."
      }
    ],
    "buildTitle": "What the studio produces.",
    "builds": [
      {
        "num": "01",
        "title": "Identity",
        "body": "A mark, a palette and a type pairing that survive contact with a real website.",
        "items": [
          "Logo and usage rules",
          "Colour system with accessible contrast pairs",
          "Type pairing and scale",
          "Brand basics document your team can follow"
        ]
      },
      {
        "num": "02",
        "title": "Interface design",
        "body": "Designed against your actual content, at the sizes people will really use.",
        "items": [
          "Mobile-first layouts for every key page",
          "Real copy, real images, real edge cases",
          "States designed — hover, empty, error, loading",
          "Clickable prototype before build starts"
        ]
      },
      {
        "num": "03",
        "title": "Design system",
        "body": "The reason page ten looks as considered as page one.",
        "items": [
          "Tokens for colour, type, spacing and elevation",
          "Component library shared with the codebase",
          "Documented rules for adding new pages",
          "Handover your future designer can extend"
        ]
      },
      {
        "num": "04",
        "title": "Art direction",
        "body": "Photography and imagery treated as part of the engineering budget.",
        "items": [
          "Shot lists and photography direction",
          "Image treatment and cropping rules",
          "Icon set chosen once and used consistently",
          "Motion used to explain, never to impress"
        ]
      }
    ],
    "specs": [
      {
        "name": "Deliverables",
        "plain": "Clickable designs of every key page, plus the token and component documentation behind them."
      },
      {
        "name": "Accessibility",
        "plain": "Contrast, focus states and touch targets checked at design stage, not patched afterwards."
      },
      {
        "name": "Motion",
        "plain": "Purposeful and reduced-motion aware; nothing that delays reading or costs performance budget."
      },
      {
        "name": "Handover",
        "plain": "Design tokens shared directly with the codebase, so the built site matches the design."
      },
      {
        "name": "Content",
        "plain": "Our editors write to the layout, so nothing ships with placeholder text."
      },
      {
        "name": "Ownership",
        "plain": "Source files and documentation are yours, in formats another studio can open."
      }
    ],
    "ctaTitle": "Show us your current site. We'll show you the system it's missing."
  }
};
