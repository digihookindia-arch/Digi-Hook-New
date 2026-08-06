import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions, metaTitles } from '@/content/meta';
import { SITE_URL } from '@/lib/site';
import { JsonLd, articleSchema, breadcrumbSchema, faqSchema } from '@/lib/jsonld';
import { routes } from '@/content/navigation';
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

const title = 'Next.js or WordPress: how to decide without a developer’s opinion';

const lead =
  'Both are good answers to different questions. The choice is not about which technology is better — it is about who edits the site, how often, and what happens to it in three years.';

export const metadata: Metadata = pageMetadata({
  // Shorter than the <h1> so the result does not truncate mid-phrase.
  title: metaTitles.articleStack,
  description: metaDescriptions.articleStack,
  path: routes.articleStack,
  type: 'article',
});

export const revalidate = 3600;

const contents: { href: string; label: string }[] = [
  { href: '#a1', label: '1. The question behind the question' },
  { href: '#a2', label: '2. What you are choosing between' },
  { href: '#a3', label: '3. When WordPress is right' },
  { href: '#a4', label: '4. When Next.js is right' },
  { href: '#a5', label: '5. The costs in neither quote' },
  { href: '#a6', label: '6. Deciding in ten minutes' },
  { href: '#a7', label: '7. Questions to ask' },
];

const wordpressWhen: string[] = [
  'Someone non-technical needs to publish new pages every week, and nobody wants to involve a developer to do it.',
  'The site is mostly articles, events or notices, and the design can sit comfortably inside a theme.',
  'You need a specific piece of functionality that already exists as a mature plugin, and building it fresh would cost more than it is worth.',
  'The budget genuinely cannot stretch past a template, and a working site this month beats a better site next quarter.',
  'Your team already knows WordPress, and that knowledge is worth more than any technical gain from switching.',
];

const nextWhen: string[] = [
  'Speed is commercially load-bearing — a store, a booking flow, anything where a slow page costs you the enquiry.',
  'The site has to talk to something else: an inventory system, a CRM, a payment gateway, a hospital or property database.',
  'The interface is genuinely custom, and you would spend the project fighting a theme into a shape it resists.',
  'You expect to grow past a few hundred pages, or to add a second language, a second brand or an app later.',
  'You want the codebase itself as a deliverable — readable, typed, and handed over as an asset you own outright.',
];

const hiddenCosts: { term: string; note: string }[] = [
  {
    term: 'Plugin licences',
    note: 'The serious plugins are annual subscriptions. Four or five of them is a recurring line item nobody mentions during the quote, and it does not stop.',
  },
  {
    term: 'Update labour',
    note: 'WordPress core, the theme and every plugin update on their own schedules, and updates occasionally conflict. Someone has to apply them and check nothing broke.',
  },
  {
    term: 'Security response',
    note: 'A public, widely-used platform with third-party plugins is a larger target. Budget for monitoring and for the day something needs patching quickly.',
  },
  {
    term: 'Developer availability',
    note: 'On the Next.js side, the pool of developers is smaller and costs more per hour than the WordPress pool. That is a real trade-off, not a footnote.',
  },
  {
    term: 'Editing workflow',
    note: 'A custom-built site needs its content tool built or connected deliberately. If that is skipped, every text change becomes a developer ticket — the most common regret we hear.',
  },
];

const questions: string[] = [
  'Who on my team will change page text, and what exactly do they click to do it?',
  'What is the total recurring cost in year two — hosting, licences, updates, monitoring — not just the build price?',
  'If I stop working with you, who can pick this up, and what do they receive?',
  'Which parts of this are custom-built, and which are a plugin or theme doing the work?',
  'What happens when I want a page layout the current design does not have?',
];

const faqs = [
  {
    q: 'Is Next.js always faster than WordPress?',
    a: 'No. A carefully built WordPress site beats a careless Next.js one. Next.js makes fast easier to reach and easier to keep, because pages can be pre-built and only the interactive parts ship JavaScript. But the platform sets the ceiling, not the floor — the floor is set by how the site is built.',
  },
  {
    q: 'Can I edit a Next.js site myself without a developer?',
    a: 'Yes, if the editing tool is part of the build. That is a deliberate decision made at the start, not something that appears automatically. Ask any studio quoting you exactly what your team clicks to change a heading, and have them show you.',
  },
  {
    q: 'Should I move my existing WordPress site to Next.js?',
    a: 'Only if the current site is costing you something you can name — lost enquiries from slow pages, a plugin you cannot secure, a feature you cannot add. A working site that nobody complains about is rarely worth rebuilding for architectural reasons alone.',
  },
  {
    q: 'Which is cheaper?',
    a: 'WordPress is usually cheaper to start and carries more recurring cost — licences, updates, maintenance. A custom build costs more up front and less to run. Compare them over three years rather than at the quote.',
  },
];

export default function ArticleStackPage() {
  return (
    <main>
      <JsonLd
        data={[
          articleSchema({
            headline: title,
            description: lead,
            url: `${SITE_URL}${routes.articleStack}`,
            section: 'Technology',
            datePublished: '2026-07-26',
            dateModified: '2026-07-26',
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Knowledge Hub', path: routes.knowledge },
            { name: 'Next.js or WordPress', path: routes.articleStack },
          ]),
          faqSchema(faqs),
        ]}
      />

      <ArticleLayout
        meta="Technology · 11 min read · Updated July 2026"
        title={title}
        lead={lead}
        contents={contents}
        cta={{
          heading: 'Not sure which one your project wants?',
          body: 'Tell us what the site has to do and who will run it. We will say which way we would build it, and why — including when that answer is WordPress.',
        }}
      >
        <h2 id="a1" className={H2}>
          1. The question behind the question
        </h2>
        <p className={P}>
          When you ask a developer this question, you will usually get an answer
          shaped by what they are good at. That is not dishonesty; it is how
          expertise works. A WordPress specialist has solved a hundred problems
          in WordPress and will reach for it. We build in Next.js, and you should
          read everything below with that in mind.
        </p>
        <p className={P}>
          So it helps to reframe. The technology is not really the decision. The
          decision is: who edits this site, how often, how custom does it need to
          be, and what does it have to connect to? Answer those four honestly and
          the technology usually picks itself.
        </p>
        <p className={P_LAST}>
          This article is written so you can reach that answer without needing to
          trust either of us.
        </p>

        <h2 id="a2" className={H2}>
          2. What you are choosing between
        </h2>
        <h3 className={H3}>WordPress is a content management system</h3>
        <p className={P}>
          It arrives as a finished application: a login screen, an editor, a
          media library, and a theme that decides how pages look. You install it,
          and most of a website already exists. Functionality is extended with
          plugins — pre-built packages that add a booking form, a store, a
          gallery. More websites run on it than on anything else, which means a
          large pool of people who can work on yours.
        </p>
        <p className={P}>
          The trade-off is that you are assembling a site from parts other people
          designed. When your requirement matches an available part, that is
          enormously efficient. When it does not, you spend the project
          persuading a component to be something it was not built to be.
        </p>
        <h3 className={H3}>Next.js is a framework you build in</h3>
        <p className={P}>
          Nothing exists until it is written. There is no editor, no theme, no
          plugin directory — those are things the build includes deliberately or
          not at all. In exchange you control precisely what the browser
          receives, which is why pages can be pre-built and served as finished
          files rather than assembled on every visit.
        </p>
        <p className={P_LAST}>
          One is a house you furnish. The other is a plot you build on. Neither
          is the better purchase in the abstract.
        </p>

        <h2 id="a3" className={H2}>
          3. When WordPress is right
        </h2>
        <p className={P}>
          We do not build WordPress sites, and we will still tell you to use one
          when the following describes you. Getting this wrong is expensive in a
          direction that is hard to reverse.
        </p>
        <RuledList items={wordpressWhen} />
        <p className={P_LAST}>
          The first point carries the most weight. If publishing is frequent and
          must not involve a developer, WordPress solves that on day one, and
          every alternative has to earn its way past it.
        </p>

        <h2 id="a4" className={H2}>
          4. When Next.js is right
        </h2>
        <p className={P}>
          The case for building rather than assembling is strongest when your
          requirements stop matching what themes and plugins already do:
        </p>
        <RuledList items={nextWhen} />
        <Pullquote>
          A rough test: if you can describe your site as “like that one, but our
          content”, a theme will serve you well. If you keep saying “except
          ours also has to…”, you are describing a build.
        </Pullquote>

        <h2 id="a5" className={H2}>
          5. The costs in neither quote
        </h2>
        <p className={P}>
          Both quotes will show you a build price. Neither reliably shows you the
          cost of owning the thing, and that is where the two platforms diverge
          most sharply:
        </p>
        <DefinitionList items={hiddenCosts} />
        <p className={P_LAST}>
          The shape is consistent: WordPress front-loads less cost and carries
          more of it forward; a custom build does the reverse. Compare the two
          over three years, not at signature.
        </p>

        <h2 id="a6" className={H2}>
          6. Deciding in ten minutes
        </h2>
        <p className={P}>
          Take the four questions from the first section and answer them out
          loud. In our experience the decision falls out of the answers without
          much argument.
        </p>
        <p className={P}>
          <strong className="font-heading">Who edits the site, and how often?</strong>{' '}
          Weekly, by a non-technical person, with no developer available — that
          points hard at WordPress unless something else overrules it. Rarely,
          or by someone comfortable with a proper tool, and the question stops
          mattering.
        </p>
        <p className={P}>
          <strong className="font-heading">How custom is the interface?</strong>{' '}
          If a theme gets you most of the way, take the theme. If you are already
          listing exceptions, the theme will cost you more than it saves.
        </p>
        <p className={P}>
          <strong className="font-heading">What does it connect to?</strong>{' '}
          Nothing, or one payment gateway — either platform is fine. A live
          inventory, a CRM, a property feed, a hospital system — that is a
          build.
        </p>
        <p className={P_LAST}>
          <strong className="font-heading">What is it in three years?</strong>{' '}
          Roughly the same site with more posts — WordPress ages well at that.
          Ten times the pages, a second language, an app sharing the same data —
          plan for that now, because retrofitting it is the expensive path.
        </p>

        <h2 id="a7" className={H2}>
          7. Questions to ask
        </h2>
        <p className={P}>
          Put these to whoever is quoting you, on either side. You are not
          testing their technical knowledge — you are testing whether they have
          thought about your second year:
        </p>
        <RuledList items={questions} />
        <p className={P}>
          Specific answers mean someone has planned the work. Reassurance without
          detail — “don’t worry, it’s all handled” — is itself the answer.
        </p>
        <p className="m-0 text-[17px] leading-[1.75] text-neutral-900">
          There is no wrong platform here, only a mismatch between what a site
          has to do and what it was built on. Almost every rebuild we are asked
          about traces back to that mismatch being made quickly, by someone who
          only ever used one of the two.
        </p>
      </ArticleLayout>
    </main>
  );
}
