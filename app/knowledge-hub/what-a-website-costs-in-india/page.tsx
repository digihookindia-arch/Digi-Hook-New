import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions, metaTitles } from '@/content/meta';
import { SITE_URL } from '@/lib/site';
import { JsonLd, articleSchema, breadcrumbSchema, faqSchema } from '@/lib/jsonld';
import { routes } from '@/content/navigation';
import { plans, addOns, taxNote } from '@/content/pricing';
import {
  ArticleLayout,
  DefinitionList,
  Pullquote,
  RuledList,
  H2,
  H3,
  P,
  P_LAST,
} from '@/components/ArticleLayout';

const title =
  'What a website should actually cost in India, and why quotes differ 10x';

const lead =
  'Send the same brief to five suppliers and the numbers will not resemble each other. That spread is not haggling — the five are quoting for genuinely different things, and none of them will tell you which.';

export const metadata: Metadata = pageMetadata({
  // Shorter than the <h1> so the result does not truncate mid-phrase.
  title: metaTitles.articleCost,
  description: metaDescriptions.articleCost,
  path: routes.articleCost,
  type: 'article',
});

export const revalidate = 3600;

const contents: { href: string; label: string }[] = [
  { href: '#a1', label: '1. Why the spread is so wide' },
  { href: '#a2', label: '2. What you are paying for' },
  { href: '#a3', label: '3. The five things that move it' },
  { href: '#a4', label: '4. What the cheap quote omits' },
  { href: '#a5', label: '5. Costs that arrive after launch' },
  { href: '#a6', label: '6. Our numbers, in full' },
  { href: '#a7', label: '7. Comparing two quotes fairly' },
];

const drivers: { term: string; note: string }[] = [
  {
    term: 'Page count',
    note: 'The single most reliable driver, because every page needs content, layout, review and testing. It is also the easiest number to pin down before anyone quotes.',
  },
  {
    term: 'Template or built',
    note: 'A theme adjusted to your brand, or a design drawn for your content and built from nothing. This is the largest single fork in the road, and the one least often stated plainly.',
  },
  {
    term: 'Who does the work',
    note: 'One freelancer between other jobs, a small studio, or an agency with account managers and a margin to cover. The same output can carry very different overheads.',
  },
  {
    term: 'Backend and integrations',
    note: 'A brochure site that sends an email is a different project from one holding stock, taking payments, or reading a live property or hospital feed. Integrations carry most of the risk in any quote.',
  },
  {
    term: 'Who supplies the content',
    note: 'If nobody is writing your copy or preparing your photographs, that work still has to happen — usually late, usually by you, and usually as the reason the project runs over.',
  },
];

const omissions: string[] = [
  'Content. “Client to provide text and images” is one line in a scope document and several weeks of your team’s time.',
  'Revisions past a fixed round. Cheap quotes cap them tightly; the cap is where the price gets made back.',
  'Anything to do with search. Structured data, metadata, a real sitemap — often described as included, rarely specified.',
  'Performance on a mid-range phone on mobile data, rather than on the builder’s laptop.',
  'The editing tool. Without one, every text change becomes a paid request for the life of the site.',
  'Handover. The code, the accounts, the domain, the documentation — who holds them after the invoice is paid.',
];

const runningCosts: { term: string; note: string }[] = [
  {
    term: 'Domain and hosting',
    note: 'An annual and a monthly cost respectively. Small, predictable, and the one pair most people already expect.',
  },
  {
    term: 'Plugin and theme licences',
    note: 'On template-based sites these are usually annual renewals. They tend not to appear in the build quote at all.',
  },
  {
    term: 'Updates and monitoring',
    note: 'Someone applies updates and confirms nothing broke. Either you are paying for it, or it is not happening — and the second is worse.',
  },
  {
    term: 'Changes',
    note: 'The real recurring cost for most businesses. It falls close to zero if your team can edit the site, and grows without limit if they cannot.',
  },
];

const compare: string[] = [
  'How many pages, and what happens to the price at page eleven?',
  'Is this a template or built for us? If a template, which one, and what does the licence cost each year?',
  'What is the total in year two, assuming we change some text every month?',
  'What are the Core Web Vitals targets, measured on a mid-range phone, and are they in the contract?',
  'Who owns the code, the domain and the hosting accounts on the day we part ways?',
  'What is explicitly not included?',
];

const faqs = [
  {
    q: 'Why do website quotes in India vary so much for the same brief?',
    a: 'Because the suppliers are quoting for different work. One is adapting a template, another is designing and building from nothing, and a third is adding project management and account handling on top. Page count, integrations, who supplies the content, and who does the work explain nearly all of the spread.',
  },
  {
    q: 'What does Digi Hook charge for a website?',
    a: 'A business website is ₹20,000 flat for one to ten pages, with extra pages at ₹2,000 each. An ecommerce website is ₹35,000 flat and includes the admin panel for inventory, payments, shipments and content. Content management on a business website is ₹10,000. All figures exclude GST.',
  },
  {
    q: 'How long does a website take to build?',
    a: 'Two to four weeks from start to launch. A straightforward business website sits at the shorter end; a store with a catalogue to load, payments to test and shipments to wire up sits at the longer end.',
  },
  {
    q: 'Is a cheaper website always worse?',
    a: 'No. A cheap quote for a template site that matches your requirement is good value. It becomes expensive when it is cheap because something was left out — content, revisions, an editing tool, search setup — and you discover the omission after signing.',
  },
];

export default function ArticleCostPage() {
  return (
    <main>
      <JsonLd
        data={[
          articleSchema({
            headline: title,
            description: lead,
            url: `${SITE_URL}${routes.articleCost}`,
            section: 'Cost',
            datePublished: '2026-07-26',
            dateModified: '2026-07-26',
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Knowledge Hub', path: routes.knowledge },
            { name: 'What a website should cost in India', path: routes.articleCost },
          ]),
          faqSchema(faqs),
        ]}
      />

      <ArticleLayout
        meta="Cost · 10 min read · Updated July 2026"
        title={title}
        lead={lead}
        contents={contents}
        cta={{
          heading: 'Want a number for your project?',
          body: 'Describe what the site has to do. You get a scope document with the price, the timeline and the exclusions written down before any work starts.',
        }}
      >
        <h2 id="a1" className={H2}>
          1. Why the spread is so wide
        </h2>
        <p className={P}>
          A ten-times spread across quotes for one brief sounds like a broken
          market. It usually is not. It is the predictable result of a brief that
          did not pin down the things that set the price, so each supplier filled
          the gaps with their own assumptions and quoted for the project they
          imagined.
        </p>
        <p className={P}>
          One assumed a theme with your logo dropped in. One assumed a design
          drawn for your content. One assumed you would supply finished copy and
          photographs; one assumed they would write them. One included a year of
          changes; one included none. Every one of those is a legitimate way to
          build a website, and they cannot cost the same.
        </p>
        <p className={P_LAST}>
          A note before the rest: the only prices in this article are our own. We
          are not going to invent a survey of the Indian market, and you should
          be wary of anyone who quotes you one without saying where it came from.
        </p>

        <h2 id="a2" className={H2}>
          2. What you are paying for
        </h2>
        <p className={P}>
          Almost every website budget divides into four kinds of work, and being
          able to name them makes any quote legible:
        </p>
        <h3 className={H3}>Design</h3>
        <p className={P}>
          Deciding what each page contains, in what order, and what it looks
          like. Either taken from a template or drawn for your content. This is
          where the widest price gap opens, because the two are not variations on
          one activity — they are different jobs.
        </p>
        <h3 className={H3}>Build</h3>
        <p className={P}>
          Turning that into working pages: markup, styling, forms, responsive
          behaviour, testing. Fairly predictable per page, which is why page
          count is the number everyone asks for first.
        </p>
        <h3 className={H3}>Content</h3>
        <p className={P}>
          Words and pictures. Frequently assigned to the client in a single line
          of the scope, and then the single most common reason projects run late.
        </p>
        <h3 className={H3}>Everything that is not a page</h3>
        <p className={P_LAST}>
          Payments, stock, a CRM, an editing tool, search setup, accessibility,
          hosting, handover. This category holds nearly all the risk in a
          project, and it is the category cheap quotes shrink to zero.
        </p>

        <h2 id="a3" className={H2}>
          3. The five things that move it
        </h2>
        <p className={P}>
          Fix these five before you ask anyone for a number, and the quotes you
          get back will finally be comparable:
        </p>
        <DefinitionList items={drivers} />
        <Pullquote>
          If two quotes differ by a factor of ten, at least one of these five was
          left undefined. Find which, and the gap usually explains itself.
        </Pullquote>

        <h2 id="a4" className={H2}>
          4. What the cheap quote omits
        </h2>
        <p className={P}>
          A low number is not a warning sign by itself. It becomes one when the
          number is low because something was quietly left out. In rough order of
          how often we see it:
        </p>
        <RuledList items={omissions} />
        <p className={P_LAST}>
          None of these make a supplier dishonest. They make the quote
          incomplete, and incomplete quotes are the mechanism by which a
          ₹15,000 website becomes a ₹60,000 website by launch.
        </p>

        <h2 id="a5" className={H2}>
          5. Costs that arrive after launch
        </h2>
        <p className={P}>
          The build price is the part everyone compares. The ownership cost is
          the part that decides what the site actually cost you:
        </p>
        <DefinitionList items={runningCosts} />
        <p className={P_LAST}>
          The last row is the one worth planning around. A site your team can
          edit has a running cost close to zero; a site they cannot has a running
          cost that never stops.
        </p>

        <h2 id="a6" className={H2}>
          6. Our numbers, in full
        </h2>
        <p className={P}>
          We publish flat prices rather than ranges, so this article can end with
          real figures rather than a recommendation to get in touch:
        </p>
        <DefinitionList
          items={plans.map((p) => ({
            term: `${p.title} — ${p.price}`,
            note: `${p.priceNote.replace(/ · excludes GST$/, '')}. ${p.body}`,
          }))}
        />
        <p className={P}>Everything charged on top, with its price:</p>
        <DefinitionList
          items={addOns.map((a) => ({
            term: `${a.title} — ${a.price}`,
            note: a.body,
          }))}
        />
        <p className={P}>
          Start to launch is two to four weeks depending on complexity.{' '}
          {taxNote} GST applies on top at the prevailing rate. The full
          breakdown, including what sits inside each package, is on the{' '}
          <Link
            href={routes.pricing}
            className="border-b-2 border-accent pb-0.5 font-medium text-accent-700"
          >
            pricing page
          </Link>
          .
        </p>
        <p className={P_LAST}>
          We are not claiming these are the right prices for every supplier in
          India. They are ours, they are published, and they give you one fixed
          point to measure other quotes against.
        </p>

        <h2 id="a7" className={H2}>
          7. Comparing two quotes fairly
        </h2>
        <p className={P}>
          Send these six questions to every supplier you are considering. The
          answers make quotes comparable in a way the totals never do:
        </p>
        <RuledList items={compare} />
        <p className={P}>
          The last question is the most useful and the least often asked. A
          supplier who can tell you plainly what is not included has thought
          about the project. One who says everything is included has either not
          read the brief or is planning to discuss it later, when you have
          already paid a deposit.
        </p>
        <p className="m-0 text-[17px] leading-[1.75] text-neutral-900">
          Price a website the way you would price anything else you intend to
          keep: over the years you will own it, with the exclusions in writing,
          and against a scope specific enough that two suppliers are genuinely
          quoting for the same thing.
        </p>
      </ArticleLayout>
    </main>
  );
}
