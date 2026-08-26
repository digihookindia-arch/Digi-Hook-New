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
  // Changed from sales@ on 2026-08-08: that address does not authenticate
  // against the mail server, while this one does — so it was published on the
  // contact page, in the footer, in the JSON-LD and at the foot of every client
  // email while quite possibly bouncing anything sent to it. If sales@ is later
  // created as a real mailbox, this can go back.
  email: 'contact@digihook.in',
  phoneDisplay: '+91 98736 74517',
  phoneHref: '+919873674517',

  /**
   * WhatsApp is a separate line from the office phone above — client-facing
   * emails point their main call-to-action here, because a reply on WhatsApp
   * reaches the team faster than an email back. Kept apart deliberately:
   * changing the office number must not silently repoint the WhatsApp button.
   */
  whatsappDisplay: '+91 85957 32020',
  whatsappHref: '+918595732020',
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

/**
 * A wa.me link that opens WhatsApp with a message already typed. The number
 * must be digits only — wa.me rejects '+' and spaces, which is why this
 * strips them rather than trusting the display format above.
 */
export function whatsappUrl(message: string): string {
  const number = site.whatsappHref.replace(/\D/g, '');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
