import type { Metadata } from 'next';
import {
  pillars,
  rendering,
  disciplines,
  engineeringFaqs,
} from '@/content/engineering';
import { routes } from '@/content/navigation';
import { PageHero } from '@/components/PageHero';
import { Reveal } from '@/components/Reveal';
import { CheckItem } from '@/components/CheckItem';
import { FaqSection } from '@/components/FaqSection';
import { CtaBand } from '@/components/CtaBand';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions } from '@/content/meta';
import { JsonLd, serviceSchema, faqSchema } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';

const lead =
  'Four things decide whether a website earns its keep: how fast it loads, how safely it holds data, how well search engines and AI assistants understand it, and how calmly it grows. We treat each as an engineering requirement with a number attached — not a promise.';

export const metadata: Metadata = pageMetadata({
  title: 'Website Engineering',
  description: metaDescriptions.engineering,
  path: routes.engineering,
});

const RENDER_COLS = 'grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_170px]';

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          serviceSchema({
            name: 'Website Engineering',
            description: lead,
            url: `${SITE_URL}${routes.engineering}`,
            serviceType: 'Website design and development',
          }),
          faqSchema(engineeringFaqs),
        ]}
      />

      <main>
        <PageHero
          tone="dark"
          kicker="Service · Website Engineering"
          title="Websites built like infrastructure."
          lead={lead}
          titleSize="clamp(40px,6.6vw,104px)"
          titleMax="18ch"
        />

        {/* Four pillars */}
        <section className="border-b-2 border-divider">
          <div className="mx-auto max-w-content px-gutter">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))]">
              {pillars.map((p, i) => (
                <Reveal
                  key={p.num}
                  index={i}
                  className="border-r border-neutral-300 py-[clamp(28px,4vw,48px)] pr-6"
                >
                  <div className="mb-4 text-[12px] font-semibold leading-none tracking-[0.14em] text-accent-700">
                    {p.num}
                  </div>
                  <h2 className="m-0 mb-3 font-heading text-[clamp(19px,1.7vw,24px)] font-bold leading-[1.15] tracking-[-0.02em]">
                    {p.title}
                  </h2>
                  <p className="m-0 text-[14.5px] leading-[1.55] text-neutral-800">
                    {p.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Rendering strategy table */}
        <section className="border-b-2 border-divider">
          <div className="mx-auto max-w-content px-gutter py-[clamp(64px,8vh,112px)]">
            <div className="mb-[clamp(32px,5vh,52px)] max-w-[62ch]">
              <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                Rendering strategy
              </div>
              <h2 className="m-0 mb-[18px] font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
                Where each page gets built — and why it matters to you.
              </h2>
              <p className="m-0 text-[16px] leading-[1.6] text-neutral-800">
                A page can be built in advance, built fresh on every visit, or
                built in the visitor’s browser. Choosing wrong is the single most
                common reason a site feels slow or shows stale information. We
                pick per page, not per project.
              </p>
            </div>
            <div className="overflow-x-auto border-t-2 border-text">
              <div className="min-w-[760px]">
                <div
                  className={`grid ${RENDER_COLS} bg-text text-[12px] font-semibold uppercase leading-none tracking-[0.12em] text-bg`}
                >
                  <div className="px-4 py-3.5">Method</div>
                  <div className="border-l border-neutral-700 px-4 py-3.5">
                    In plain English
                  </div>
                  <div className="border-l border-neutral-700 px-4 py-3.5">
                    Best for
                  </div>
                  <div className="border-l border-neutral-700 px-4 py-3.5">
                    Trade-off
                  </div>
                </div>
                {rendering.map((r, i) => (
                  <Reveal
                    key={r.name}
                    index={i}
                    className={`grid ${RENDER_COLS} border-b border-neutral-300 transition-colors hover:bg-neutral-100`}
                  >
                    <div className="px-4 py-[18px] font-heading text-[14.5px] font-bold leading-[1.3] tracking-[-0.01em] text-accent-700">
                      {r.name}
                    </div>
                    <div className="border-l border-neutral-300 px-4 py-[18px] text-[14.5px] leading-[1.55]">
                      {r.plain}
                    </div>
                    <div className="border-l border-neutral-300 px-4 py-[18px] text-[14.5px] leading-[1.55] text-neutral-800">
                      {r.best}
                    </div>
                    <div className="border-l border-neutral-300 px-4 py-[18px] text-[13.5px] leading-[1.5] text-neutral-700">
                      {r.cost}
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Four disciplines */}
        <section className="border-b-2 border-divider">
          <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] px-gutter py-[clamp(64px,8vh,112px)]">
            {disciplines.map((d, i) => (
              <Reveal
                key={d.num}
                index={i}
                className="h-full bg-bg p-[clamp(24px,3vw,44px)]"
              >
                <div className="mb-[18px] flex items-baseline gap-3.5">
                  <span className="font-heading text-[13px] font-extrabold leading-none text-accent-700">
                    {d.num}
                  </span>
                  <h2 className="m-0 font-heading text-[clamp(22px,2.2vw,32px)] font-bold leading-[1.1] tracking-[-0.028em]">
                    {d.title}
                  </h2>
                </div>
                <p className="m-0 mb-5 max-w-[56ch] text-[15.5px] leading-[1.6] text-neutral-800">
                  {d.body}
                </p>
                <ul className="m-0 grid list-none gap-2.5 p-0">
                  {d.items.map((it) => (
                    <CheckItem key={it}>{it}</CheckItem>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        <FaqSection
          heading="Asked before every project."
          introBefore="If your question isn’t here, call us on"
          introAfter="and ask it directly."
          faqs={engineeringFaqs}
        />

        <CtaBand />
      </main>
    </>
  );
}
