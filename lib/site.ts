/**
 * Real company facts — use exactly (per handoff README).
 * No client names, testimonials, case studies or statistics exist anywhere;
 * none are invented. The site is built around their absence on purpose.
 */

/**
 * Canonical origin — confirmed 2026-07-26 as the apex domain, no `www`.
 *
 * Everything downstream derives from this: canonical tags, OpenGraph and
 * share-card URLs, the sitemap, robots.txt, and the `@id`s that tie the
 * JSON-LD graph together. Whichever host you serve, the *other* one must
 * 301-redirect here — a site reachable at both `digihook.in` and
 * `www.digihook.in` splits its own ranking signals between two addresses.
 *
 * Override per environment with NEXT_PUBLIC_SITE_URL (local dev points it at
 * http://localhost:3000).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://digihook.in'
).replace(/\/$/, '');

export const site = {
  name: 'Digi Hook',
  legalName: 'Digi Hook',
  tagline: 'IT solutions & creative agency · Noida, India',
  description:
    'An IT solutions and creative agency in Noida — engineers, designers and marketers building websites, online stores and industry platforms that stay fast, safe and findable.',
  url: SITE_URL,
  // The one published address. Feeds the contact page, the footer and the
  // `email` field in the Organization / LocalBusiness JSON-LD.
  email: 'sales@digihook.in',
  phoneDisplay: '+91 98736 74517',
  phoneHref: '+919873674517',
  address: {
    street: 'A211, Golden I, Noida Extension',
    locality: 'Noida',
    region: 'Uttar Pradesh',
    country: 'IN',
    postalCode: '201305',
  },
  addressLine: 'A211, Golden I, Noida Extension, Uttar Pradesh, India',

  /**
   * Profiles that prove this is the same real business elsewhere on the web.
   * Emitted as schema.org `sameAs`, which is how search engines resolve a name
   * into a known entity — the main structured-data gap for local search.
   *
   * TODO(client): add the Google Business Profile URL first (it carries the
   * most weight for "web design Noida" style queries), then LinkedIn and any
   * directory listing. Leave entries out rather than guessing a URL: a
   * `sameAs` pointing at the wrong profile is worse than none.
   */
  socials: [] as readonly string[],

  /**
   * Precise coordinates for the office, emitted as schema.org `geo`.
   * TODO(client): right-click the office pin in Google Maps and paste the two
   * numbers it copies. Deliberately null rather than approximated — a wrong
   * pin sends people to the wrong building.
   */
  geo: null as { latitude: number; longitude: number } | null,

  /** TODO(client): the Google Maps share link for the office, if you want one. */
  mapUrl: null as string | null,
  hoursLine: 'Monday–Saturday, 10:00–19:00 IST',
  openingHours: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '10:00',
    closes: '19:00',
  },
  builtWith: 'Engineered in Next.js, TypeScript and Tailwind CSS.',
} as const;
