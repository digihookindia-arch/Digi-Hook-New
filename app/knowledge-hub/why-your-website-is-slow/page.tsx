import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions, metaTitles } from '@/content/meta';
import { SITE_URL } from '@/lib/site';
import { JsonLd, articleSchema, breadcrumbSchema } from '@/lib/jsonld';
import { routes } from '@/content/navigation';
import { CtaBand } from '@/components/CtaBand';

const title = 'Why your website is slow — and what actually fixes it';

const lead =
  'If your site feels slow, the cause is almost never mysterious. In nine cases out of ten it is one of four decisions, all of which you can understand without writing a line of code.';

export const metadata: Metadata = pageMetadata({
  // Shorter than the <h1> so the result does not truncate mid-phrase.
  title: metaTitles.article,
  description: metaDescriptions.article,
  path: routes.article,
  type: 'article',
});

export const revalidate = 3600;

const contents: { href: string; label: string }[] = [
  { href: '#a1', label: '1. What happens after a click' },
  { href: '#a2', label: '2. The four real causes' },
  { href: '#a3', label: '3. How to measure it honestly' },
  { href: '#a4', label: '4. Fixes that work' },
  { href: '#a5', label: '5. Fixes that only look like fixes' },
  { href: '#a6', label: '6. Questions to ask your developer' },
];

const vitals: { metric: string; note: string }[] = [
  {
    metric: 'LCP ≤ 2.5s',
    note: 'The largest thing on screen — usually your hero image or headline — should be visible within two and a half seconds.',
  },
  {
    metric: 'INP ≤ 200ms',
    note: 'When someone taps, something visible should happen within a fifth of a second.',
  },
  {
    metric: 'CLS ≤ 0.10',
    note: 'Content must not jump around as the page loads. The cause is almost always an image or advert without reserved space.',
  },
];

const fixes: string[] = [
  'Resize and convert every image to a modern format, and serve a smaller version to phones. Usually the single largest win available.',
  'Set explicit width and height on images so the browser reserves the space and nothing shifts.',
  'Audit third-party scripts. Remove what nobody reads; delay the rest until after the page is usable.',
  'Self-host fonts, in the two weights you actually use, and tell the browser to show text immediately.',
  'Load only the JavaScript a page needs, rather than one bundle for the whole site.',
  'Pre-build pages that do not change on every visit, and refresh them on a schedule instead of on demand.',
  'Serve from a network with a copy near your visitors — a site for Indian customers should not be answered from Virginia.',
];

const questions: string[] = [
  'What are our LCP, INP and CLS numbers on mobile, from real visitors?',
  'How large is the heaviest page, in megabytes, and what is the biggest single file on it?',
  'Which third-party scripts are loading, and who asked for each one?',
  'Which pages are pre-built, and which are constructed on every visit?',
];

const H2 =
  'm-0 mb-[18px] scroll-mt-[110px] font-heading text-[clamp(24px,2.6vw,36px)] font-extrabold leading-[1.1] tracking-[-0.032em]';
const H3 =
  'm-0 mb-2.5 font-heading text-[20px] font-bold leading-[1.25] tracking-[-0.02em]';
const P = 'm-0 mb-[18px] text-[17px] leading-[1.75] text-neutral-900';
const P_LAST = 'm-0 mb-8 text-[17px] leading-[1.75] text-neutral-900';

export default function ArticlePage() {
  return (
    <main>
      <JsonLd
        data={[
          articleSchema({
            headline: title,
            description: lead,
            url: `${SITE_URL}${routes.article}`,
            section: 'Performance',
            datePublished: '2026-07-01',
            dateModified: '2026-07-01',
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Knowledge Hub', path: routes.knowledge },
            { name: 'Why your website is slow', path: routes.article },
          ]),
        ]}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(48px,7vh,88px)]">
          <Link
            href={routes.knowledge}
            className="mb-8 inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase leading-none tracking-[0.1em] text-accent-700"
          >
            ← Knowledge Hub
          </Link>
          <div className="mb-[22px] text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-neutral-700">
            Performance · 12 min read · Updated July 2026
          </div>
          <h1 className="m-0 mb-6 max-w-[26ch] font-heading text-[clamp(34px,5.4vw,84px)] font-extrabold leading-[0.96] tracking-[-0.045em]">
            {title}
          </h1>
          <p className="m-0 max-w-[64ch] text-[clamp(17px,1.5vw,22px)] leading-[1.55] text-neutral-800">
            {lead}
          </p>
        </div>
      </section>

      {/* ── Contents + body ──────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] items-start gap-[clamp(32px,5vw,80px)] px-gutter py-[clamp(40px,6vh,80px)]">
          {/* See components/ArticleLayout.tsx for why `sticky` sits on the
              inner wrapper rather than the <aside> grid item. */}
          <aside className="self-stretch">
            <div className="sticky top-[110px]">
              <div className="mb-1.5 border-b-2 border-text pb-3 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-700">
                Contents
              </div>
              {contents.map((c) => (
                <a
                  key={c.href}
                  href={c.href}
                  className="block border-b border-neutral-300 py-[11px] text-[14px] font-medium leading-[1.4] text-text transition-colors hover:text-accent-700"
                >
                  {c.label}
                </a>
              ))}
            </div>
          </aside>

          <article className="max-w-[74ch]">
            <h2 id="a1" className={H2}>
              1. What happens after a click
            </h2>
            <p className={P}>
              When someone taps a link to your site, four things happen in
              sequence. The browser asks a server for the page. The server
              answers with an HTML document. The browser reads that document and
              discovers everything else it needs — images, fonts, stylesheets,
              scripts — and asks for those too. Only then can it draw something a
              human can read.
            </p>
            <p className={P}>
              Every delay you have ever experienced sits in one of those four
              steps. That is genuinely all there is to it. “The site is slow”
              always resolves into: the server took too long to answer, the
              answer was too large, or the browser was made to wait for something
              before it was allowed to paint.
            </p>
            <p className={P_LAST}>
              Hold on to that sentence. It is the whole diagnostic framework, and
              it lets you follow any technical conversation about performance.
            </p>

            <h2 id="a2" className={H2}>
              2. The four real causes
            </h2>
            <h3 className={H3}>Images that were never prepared</h3>
            <p className={P}>
              This is the most common cause by a wide margin. A photograph
              straight off a camera or a designer’s export can be four megabytes.
              Displayed in a 600-pixel-wide slot, it should be perhaps sixty
              kilobytes — roughly one-sixtieth of the data. Multiply by twelve
              images on a homepage and you have a site that is unusable on a
              train.
            </p>
            <h3 className={H3}>
              JavaScript sent for pages that do not need it
            </h3>
            <p className={P}>
              Images are heavy but passive; JavaScript is heavy and demanding.
              The browser has to download it, read it, and run it — on the
              visitor’s phone, not your laptop. A themed site frequently ships
              the code for a slider, a chat widget, three analytics tools and an
              animation library to a page that displays a paragraph of text.
            </p>
            <h3 className={H3}>Fonts that hold the text hostage</h3>
            <p className={P}>
              A custom font is a file, and browsers will often wait for it before
              showing any words at all. Loaded from someone else’s server, in
              four weights nobody uses, it produces that familiar second of blank
              white page — content that had already arrived, waiting on
              decoration.
            </p>
            <h3 className={H3}>
              Third-party scripts, and where the page is built
            </h3>
            <p className={P}>
              Every embedded chat box, tag manager, heatmap and review widget is
              code you do not control, loaded from a server you do not own. Any
              one of them can stall your page. Underneath all of it sits the
              question of where the page is assembled: pre-built and served as a
              finished file, or constructed from scratch on every single visit.
              Choosing the second when the first would do is a decision that
              quietly costs you a second on every page view.
            </p>
            <div className="mb-8 border-l-2 border-accent py-1 pl-5">
              <p className="m-0 text-[18px] font-medium leading-[1.6] text-accent-700">
                Four causes. Images, scripts, fonts, and where the page is built.
                Nearly every slow site is one or more of these — not a mystery,
                and not an argument for a rebuild until you have checked.
              </p>
            </div>

            <h2 id="a3" className={H2}>
              3. How to measure it honestly
            </h2>
            <p className={P}>
              “It feels fine on my machine” is not measurement. Your machine is
              on office broadband, has the site cached, and is not a
              three-year-old phone on patchy mobile data — which describes most
              of your visitors. Test on a throttled mobile connection, or the
              numbers mean nothing.
            </p>
            <p className={P}>
              Google publishes three thresholds, and they are the only scoreboard
              worth arguing about because they are what search ranking and real
              users both respond to:
            </p>
            <ul className="m-0 mb-[18px] grid list-none gap-3 p-0">
              {vitals.map((v) => (
                <li
                  key={v.metric}
                  className="grid grid-cols-[120px_minmax(0,1fr)] gap-3.5 border-t border-neutral-300 pt-3 text-[16px] leading-[1.6]"
                >
                  <strong className="font-heading tracking-[-0.01em]">
                    {v.metric}
                  </strong>
                  <span>{v.note}</span>
                </li>
              ))}
            </ul>
            <p className={P_LAST}>
              One more distinction worth knowing: lab data is a test run in ideal
              conditions, field data is what real visitors experienced. Field
              data wins every argument. If a report shows a green lab score and
              unhappy customers, believe the customers.
            </p>

            <h2 id="a4" className={H2}>
              4. Fixes that work
            </h2>
            <p className={P}>
              In rough order of return on effort, and none of these require a
              rebuild:
            </p>
            <ol className="m-0 mb-8 grid list-decimal gap-3.5 pl-[22px] text-[17px] leading-[1.7] text-neutral-900">
              {fixes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ol>

            <h2 id="a5" className={H2}>
              5. Fixes that only look like fixes
            </h2>
            <p className={P}>
              A caching plugin on a site that ships six megabytes of images makes
              the second visit faster and the first visit — the one that decides
              whether you get the enquiry — exactly as slow. A bigger hosting
              plan buys a faster answer to the first request, which was rarely
              the bottleneck. A loading animation makes the wait more pleasant
              without shortening it by a millisecond.
            </p>
            <p className={P_LAST}>
              None of these are scams. They are simply treatments applied without
              a diagnosis. Insist on the measurement first, then the fix, then
              the measurement again.
            </p>

            <h2 id="a6" className={H2}>
              6. Questions to ask your developer
            </h2>
            <p className={P}>
              You do not need to audit code. You need four answers, and the
              quality of the answers tells you everything:
            </p>
            <ul className="m-0 mb-6 grid list-none gap-3 p-0">
              {questions.map((q) => (
                <li
                  key={q}
                  className="border-t border-neutral-300 pt-3 text-[17px] font-medium leading-[1.6]"
                >
                  {q}
                </li>
              ))}
            </ul>
            <p className={P}>
              If those four answers come back quickly and specifically, your site
              is being engineered. If they come back as reassurance, that is your
              finding.
            </p>
            <p className="m-0 text-[17px] leading-[1.75] text-neutral-900">
              Speed is not a feature you buy at the end of a project. It is the
              result of a few decisions made early, honestly measured, and
              defended every time someone wants to add one more widget.
            </p>
          </article>
        </div>
      </section>

      <CtaBand
        content={{
          heading: 'Want those four answers about your site?',
          body: 'Send us the URL. You get the measurements and an honest note on whether a fix or a rebuild makes financial sense.',
        }}
      />
    </main>
  );
}
