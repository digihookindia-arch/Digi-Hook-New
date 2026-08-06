import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions } from '@/content/meta';
import { routes } from '@/content/navigation';
import { PageHero } from '@/components/PageHero';
import { CtaBand } from '@/components/CtaBand';
import { Accordion, type AccordionItem } from '@/components/Accordion';
import { topics } from '@/content/technology';

const lead =
  'You are paying for these decisions, so you should understand them. Eleven topics: what it is, why it matters to your business, and how we use it. Open any one.';

export const metadata: Metadata = pageMetadata({
  title: 'Technology',
  description: metaDescriptions.technology,
  path: routes.technology,
});

/** One of the three panel cells: accent label above a plain-language paragraph. */
function Cell({ label, body }: { label: string; body: string }) {
  return (
    <div className="bg-bg p-5 outline outline-1 outline-neutral-300">
      <div className="mb-3 text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-accent-700">
        {label}
      </div>
      <p className="m-0 text-[14.5px] leading-[1.6] text-neutral-800">{body}</p>
    </div>
  );
}

const items: AccordionItem[] = topics.map((t) => ({
  id: t.id,
  num: t.num,
  label: t.name,
  tag: t.tag,
  panel: (
    <div className="grid grid-cols-[58px_minmax(0,1fr)] gap-4 pb-8">
      <div />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] border-t-2 border-text">
        <Cell label="What it is" body={t.what} />
        <Cell label="Why it matters to you" body={t.why} />
        <Cell label="How we use it" body={t.how} />
      </div>
    </div>
  ),
}));

export default function TechnologyPage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <PageHero
        kicker="Technology"
        title="Every tool we use, explained without jargon."
        lead={lead}
        titleSize="clamp(40px,6.6vw,104px)"
        titleMax="20ch"
      />

      {/* ── Eleven topics ────────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter pb-[clamp(56px,7vh,96px)]">
          {/* The topic list is this page's top-level structure — nothing wraps
              it in an h2 — so the triggers are h2 rather than the default h3. */}
          <Accordion items={items} variant="topic" headingLevel="h2" />
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
