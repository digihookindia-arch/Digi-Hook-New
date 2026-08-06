import type { Plan } from './types';

/**
 * Pricing.
 *
 * NOTE ON COPY: this replaces the prototype's three indicative ranges with the
 * flat prices the client supplied on 2026-07-25. The figures are theirs; the
 * surrounding wording is new and still needs their sign-off.
 */

export const pricingIntro = {
  kicker: 'Pricing',
  heading: 'Fixed prices, published in full.',
  lead: 'Two packages, each quoted as one number rather than a range. Everything that costs extra is listed below with its price, so nothing arrives at the end of the project as a surprise.',
} as const;

/** Shown under the packages and again under the add-ons. */
export const taxNote =
  'All prices on this page exclude GST.';

export const plans: Plan[] = [
  {
    kicker: 'Package 01',
    title: 'Business website',
    price: '₹20,000',
    priceNote: 'Flat price · 1 to 10 pages · excludes GST',
    body: 'A complete website for a business that needs to be found, understood and contacted. No backend — and engineered to the same standards as everything else we build.',
    items: [
      'Between one and ten pages',
      'Designed and built against your real content',
      'Core Web Vitals inside Google’s thresholds',
      'Structured data and search setup',
      'Mobile-first and accessible',
      'Documented codebase, yours to keep',
    ],
    cta: 'Scope my website',
    variant: 'light',
  },
  {
    kicker: 'Package 02',
    title: 'Ecommerce website',
    price: '₹35,000',
    priceNote: 'Flat price · admin panel included · excludes GST',
    body: 'A storefront with the admin panel your team actually runs it from — stock, orders, payments and shipments in one place, plus control of what the pages say.',
    items: [
      'Everything in the business website',
      'Admin panel for your team',
      'Inventory and stock management',
      'Payments and order management',
      'Shipment handling',
      'Content management — edit hero banners and page content yourself',
    ],
    cta: 'Scope my store',
    variant: 'accent',
  },
];

/** Priced add-ons. Anything not in the flat price is on this list. */
export const addOns: {
  num: string;
  title: string;
  price: string;
  body: string;
}[] = [
  {
    num: '01',
    title: 'Extra pages',
    price: '₹2,000 per page',
    body: 'The business website covers ten pages. Anything beyond that is priced per page, at the same rate however many you add.',
  },
  {
    num: '02',
    title: 'Content management on a business website',
    price: '₹10,000',
    body: 'Adds the tool that lets your team edit the site — text, images and banners — without coming back to us for every change.',
  },
  {
    num: '03',
    title: 'Ecommerce backend dashboard with SEO features',
    price: '₹5,000 – ₹10,000',
    body: 'A deeper dashboard on top of the standard admin panel, with the search controls for product and category pages. The range depends on how much of it you need.',
  },
];

export const timeline = {
  kicker: 'How long it takes',
  value: '2 – 4 weeks',
  heading: 'Start to launch, depending on complexity.',
  body: 'A straightforward business website sits at the shorter end. A store with a catalogue to load, payments to test and shipments to wire up sits at the longer end. The scope document names your date before work starts.',
} as const;
