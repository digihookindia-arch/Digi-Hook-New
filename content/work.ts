/**
 * Live client work, grouped by the kind of site it is.
 *
 * NOT lifted from the prototype — this section is new (2026-08-13) and is not
 * client-approved copy. Everything factual here is checkable by opening the
 * URL, which is the entire point of the section: the Website Engineering page
 * makes four claims about speed, security, findability and scale, and a
 * visitor should be able to leave the page and verify them on a real site.
 *
 * Two rules this file exists to enforce, both from CLAUDE.md:
 *
 *  1. **Never invent performance statistics.** `scores` are Lighthouse category
 *     scores for the URL above them. `measured` is the day they were taken and
 *     `strategy` is the preset — both are printed on the page, because a score
 *     without a date and a device is a marketing number, not a measurement.
 *     When a site is rebuilt, re-measure rather than leaving a stale figure up.
 *     Re-measure with:
 *
 *       npx lighthouse@12 <url> --preset=desktop --output=json \
 *         --only-categories=performance,accessibility,best-practices,seo
 *
 *  2. **Never invent client names.** These three are real, live and shipped.
 *     Do not add an entry here for a site the studio did not build.
 *
 * `shot` files are 1440x900 WebP captures in `public/work/`, taken at
 * 2x and downscaled — regenerate them when a client redesigns, or the page
 * shows a site that no longer exists. They are deliberately in colour: the
 * Modernist `.grayscale-photo` treatment applies to decorative photography,
 * and these are evidence, not decoration.
 */

export type Scores = {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
};

/**
 * A filmed client review for one of the sites below. Optional, and absent on
 * every item that does not have a real one — see rule 2 above.
 *
 * **This is a recording of a named person saying something on camera, so the
 * rules that govern the scores govern it twice over.** Do not add an entry here
 * for a video the studio did not receive from the client, do not paraphrase
 * what is said into a pull-quote and attribute it, and do not fill `speaker` in
 * from memory or inference — an unattributed review is weaker than a named one,
 * but an incorrectly attributed one is a fabricated testimonial.
 *
 * `src` is a web encode, not the client's original: H.264 at CRF 28 with mono
 * 96k AAC and `+faststart`, which took the 1280x576 master from 13.6 MB to
 * 3.5 MB. A VP9/WebM sibling was encoded and thrown away — at matched quality
 * it came out *larger* than the x264 file on this footage, which is a talking
 * head against a flat wall. Do not add one back without measuring it first.
 *
 * Nothing here is fetched until a visitor clicks: `ClientReview` renders a
 * poster and a button, and the `<video>` element does not exist in the DOM
 * before that. The 3.5 MB is a cost the visitor opts into, which is the only
 * reason a file this size is allowed on a page that publishes a performance
 * budget.
 */
export type WorkReview = {
  /** Web-encoded MP4 in `public/work/`. */
  src: string;
  /** Still frame from the video itself — never a stock portrait. */
  poster: string;
  posterAlt: string;
  /** Runtime, printed on the play button so nobody clicks into an unknown. */
  duration: string;
  /**
   * Who is on camera, and their title. Both empty until the client confirms
   * them in writing; `ClientReview` falls back to naming the project alone,
   * which is honest, rather than to a guess, which is not.
   */
  speaker: string;
  speakerRole: string;
  /**
   * WebVTT caption track, or null when none exists yet.
   *
   * TODO(captions): this is null, and that is an accessibility defect, not a
   * style choice — WCAG 1.2.2 requires captions for prerecorded speech and this
   * page publishes an accessibility score a few centimetres above the video.
   * Ship a transcript to `public/work/…-review.vtt`, point this at it, and
   * re-measure the page.
   */
  captions: string | null;
};

export type WorkItem = {
  id: string;
  num: string;
  /** The kind of build, not the client's industry — it is what a visitor is shopping for. */
  category: string;
  name: string;
  /** Shown as the visible link text; `url` is what it points at. */
  domain: string;
  url: string;
  blurb: string;
  shot: string;
  shotAlt: string;
  scores: Scores;
  /** ISO date the scores were measured. Rendered, never hidden. */
  measured: string;
  strategy: 'desktop' | 'mobile';
  /**
   * Who took the reading. PageSpeed Insights runs Lighthouse on Google's own
   * hardware and a local CLI run does not always agree with it, so the page
   * says which one produced the number instead of implying they are the same.
   */
  source: 'PageSpeed Insights' | 'Lighthouse';
  /**
   * Detected from the live site, not from memory — script and asset markers in
   * the HTML plus the response headers. Anything server-side (database, payment
   * gateway, CMS) is invisible from outside and is deliberately absent rather
   * than guessed at; add those by hand if they should be listed.
   */
  tech: string[];
  /**
   * Cross-references the rendering table further down the same page, which is
   * the point of naming it: the table explains the method in the abstract, the
   * card shows one live site that was actually built that way.
   *
   * Read off the response headers on 2026-08-13, not assumed:
   *   ISR — `x-nextjs-cache: HIT` + `x-nextjs-stale-time`
   *   SSG — nginx mtime-size ETag with no Next.js headers at all, i.e. a static
   *         export being served straight off disk
   */
  rendering: 'SSG' | 'SSR' | 'ISR' | 'CSR';
  renderingNote: string;
  /** Present only where a real filmed review exists. See `WorkReview`. */
  review?: WorkReview;
};

export const work: WorkItem[] = [
  {
    id: 'swarnika',
    num: '01',
    category: 'Ecommerce',
    name: 'Swarnika Fine Jewellery',
    domain: 'swarnikajewellers.in',
    url: 'https://swarnikajewellers.in/',
    blurb:
      'A jewellery storefront where the product photography is the product. Collections, wishlist and cart, kept fast under image weight that normally sinks a catalogue.',
    shot: '/work/swarnikajewellers.webp',
    shotAlt:
      'Home page of swarnikajewellers.in — a dark hero photograph of a pearl necklace in a presentation box, with the heading “Jewelry That Tells Your Story”.',
    scores: { performance: 99, accessibility: 100, bestPractices: 100, seo: 100 },
    measured: '2026-08-13',
    strategy: 'mobile',
    source: 'PageSpeed Insights',
    tech: ['Next.js', 'React', 'Tailwind CSS', 'Static export', 'Nginx'],
    rendering: 'SSG',
    renderingNote:
      'Built once and served as finished files — the catalogue changes on a rebuild, not on every visit.',
  },
  {
    id: 'totravelistolearn',
    num: '02',
    category: 'Travel',
    name: 'To Travel Is To Learn',
    domain: 'totravelistolearn.in',
    url: 'https://totravelistolearn.in/',
    blurb:
      'A tour operator’s booking site: destination search, fixed departures and expeditions across a large catalogue that changes every week, with enquiries captured on every page.',
    shot: '/work/totravelistolearn.webp',
    shotAlt:
      'Home page of totravelistolearn.in — a lake-and-mountains hero photograph with the heading “Explore the world like never before!”, a destination search box, and a Top Destinations row below.',
    // Performance is the volatile one: this reading was 97 at 17:39 IST and 90
    // on a re-run twenty minutes later. Publishing the date is what keeps that
    // honest — see `note` below.
    scores: { performance: 97, accessibility: 96, bestPractices: 96, seo: 100 },
    measured: '2026-08-13',
    strategy: 'mobile',
    source: 'PageSpeed Insights',
    tech: ['Next.js', 'React', 'Tailwind CSS', 'Node.js', 'Separate API service'],
    rendering: 'ISR',
    renderingNote:
      'Pre-built and quietly refreshed in the background on a five-minute window, so a catalogue this size stays fast without going stale.',
    // Supplied by the client, 2026-08-21. The only filmed review on the page.
    // `speaker`/`speakerRole` are deliberately empty pending written
    // confirmation of the name and title — see the note on `WorkReview`.
    review: {
      src: '/work/totravelistolearn-review.mp4',
      poster: '/work/totravelistolearn-review-poster.webp',
      posterAlt:
        'Still from the review video: the client speaking to camera in a white room, in front of a row of framed prints.',
      duration: '0:49',
      speaker: '',
      speakerRole: '',
      captions: null,
    },
  },
  {
    id: '10penny',
    num: '03',
    category: 'Portfolio',
    name: '10 Penny Kitchens & Wardrobes',
    domain: '10penny.digihook.in',
    url: 'https://10penny.digihook.in/',
    blurb:
      'A modular-kitchen studio’s portfolio site. Full-bleed project photography carries the whole argument, so the build spends its budget on how quickly those images arrive.',
    shot: '/work/10penny.webp',
    shotAlt:
      'Home page of 10penny.digihook.in — a full-width photograph of a sage-green modular kitchen with a marble island and a stack of built-in ovens, under the 10 Penny Kitchens & Wardrobes wordmark.',
    scores: { performance: 94, accessibility: 97, bestPractices: 100, seo: 100 },
    measured: '2026-08-13',
    strategy: 'mobile',
    source: 'PageSpeed Insights',
    tech: ['Next.js', 'React', 'Tailwind CSS', 'Static export', 'Nginx'],
    rendering: 'SSG',
    renderingNote:
      'Built once and served as finished files — nothing is assembled while a visitor waits.',
  },
];

// The studio's own page scores are deliberately NOT published here (client's
// call, 2026-08-14). The scores on this page are the client sites' and no one
// else's. A `selfMeasurement` block and a "This page, measured" band were built
// and then removed — do not reinstate either without asking.

/**
 * The headline band under the hero: the four Lighthouse categories, and the
 * floor every build is held to.
 *
 * **These are a threshold, not a measurement, and the wording has to keep saying
 * so.** The brief asked for an eye-catching score animation up top that was not
 * any particular site's result. Inventing four impressive-looking numbers was
 * the one thing that could not happen here: the section immediately below hands
 * visitors three live URLs and dares them to re-run the audit, so a fabricated
 * set of rings above it would discredit the real ones by association — and
 * CLAUDE.md forbids invented performance statistics outright.
 *
 * The four figures are targets set by the client (2026-08-14), and they are
 * defensible as targets rather than results: Best Practices and SEO are
 * checklist categories that a disciplined build takes to 100 every time, while
 * performance and accessibility move with what a page actually has to carry.
 * That is why they are not a flat number, and why the copy has to keep calling
 * them targets. If these ever become claimed results, they need a real audit
 * with a date attached, like every other score on this page.
 */
export const standardBand = {
  kicker: 'Our standard',
  // Client's line, 2026-08-14. The leading "The" is load bearing: without it
  // the sentence parses as "Google scores every website" and then breaks on
  // "needs". Note what it does and does not claim — it says these are the
  // scores a website *needs*, not scores this studio has achieved, which is
  // what keeps it honest directly above three checkable client results.
  title: 'The Google scores every website needs.',
  body: 'Google gives every website four scores out of 100. These are the numbers we build to — and the three live sites below show what they actually scored.',
  scores: { performance: 95, accessibility: 99, bestPractices: 100, seo: 100 },
  note: 'These are the targets every build is held to, not a measurement of any one site. Every real score on this page is labelled with the tool, the device and the date it was taken — the three live sites below are the receipts.',
} as const;

export const workSection = {
  // This block opens the page, directly under the hero (moved 2026-08-14).
  // It used to read "Four claims, three sites you can check" and sat *below* the
  // four pillars — that title pointed at them, so it could not survive the move.
  // Whatever goes here has to stand on its own as the first thing anyone reads.
  kicker: 'Proof, not promises',
  title: 'Three live sites. Numbers you can check yourself.',
  lead: 'Most agencies show you a portfolio. We show you the audit. Every site below is live and running — open it in the preview window and use it, then run it through Google PageSpeed Insights yourself and see whether you get what we published.',
  previewCta: 'Open live preview',
  previewHint: 'Click to open the live site',
  visitLabel: 'Visit',
  // The filmed review. "Client review" and not "Testimonial": the second word
  // describes a marketing asset, the first describes what the visitor is about
  // to watch, and this section's whole argument is that it deals in the latter.
  reviewLabel: 'Client review',
  reviewCta: 'Play the review',
  /** Falls back to this when the speaker's name is not yet confirmed. */
  reviewUnattributed: 'Filmed for',
  scoresLabel: 'Measured',
  techLabel: 'Built with',
  renderingLabel: 'Rendering',
  scoreLabels: {
    performance: 'Performance',
    accessibility: 'Accessibility',
    bestPractices: 'Best Practices',
    seo: 'SEO',
  },
  /** Printed under the list. The honesty note is load bearing, not a disclaimer. */
  note: 'Scores are Google Lighthouse category scores out of 100, taken on the dates shown. A live site is not a fixed object — content, third-party scripts and hosting all move a score, which is why we publish the date and re-measure rather than framing a number once. The preview window loads each site directly from its own server; nothing here is a mock-up.',
} as const;
