import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions } from '@/content/meta';
import { JsonLd, offerSchema } from '@/lib/jsonld';
import { routes } from '@/content/navigation';
import { PageHero } from '@/components/PageHero';
import { CtaBand } from '@/components/CtaBand';
import { Reveal } from '@/components/Reveal';
import { plans, addOns, timeline, pricingIntro, taxNote } from '@/content/pricing';
import type { Plan } from '@/content/types';

/** Numeric price for schema, where the package has a single fixed figure. */
const SCHEMA_PRICE: Record<string, string> = {
  'Business website': '20000',
  'Ecommerce website': '35000',
};

export const metadata: Metadata = pageMetadata({
  title: 'Pricing',
  description: metaDescriptions.pricing,
  path: routes.pricing,
});

export default function PricingPage() {
  return (
    <main>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'OfferCatalog',
          name: 'Website packages',
          itemListElement: plans.map((p) =>
            offerSchema({
              name: p.title,
              description: p.body,
              ...(SCHEMA_PRICE[p.title]
                ? { price: SCHEMA_PRICE[p.title] }
                : {}),
            })
          ),
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <PageHero
        kicker={pricingIntro.kicker}
        title={pricingIntro.heading}
        lead={pricingIntro.lead}
        titleSize="clamp(38px,6vw,96px)"
        titleMax="20ch"
      />

      {/* ── The two packages ─────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(48px,6vh,88px)]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]">
            {plans.map((plan, i) => (
              <Reveal key={plan.title} index={i} className="flex">
                <PlanCard plan={plan} />
              </Reveal>
            ))}
          </div>
          <p className="m-0 mt-5 text-[13.5px] leading-[1.6] text-neutral-700">
            {taxNote}
          </p>
        </div>
      </section>

      {/* ── What costs extra ─────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-[clamp(32px,5vw,72px)] px-gutter py-[clamp(56px,7vh,100px)]">
          <div>
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
              What costs extra
            </div>
            <h2 className="m-0 mb-5 font-heading text-[clamp(30px,3.6vw,52px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
              Three add-ons, each with its price.
            </h2>
            <p className="m-0 mb-4 max-w-[40ch] text-[15.5px] leading-[1.6] text-neutral-700">
              If it is not on this list, it is in the flat price. You are told
              which of these you need before the work starts, not after.
            </p>
            <p className="m-0 max-w-[40ch] text-[13.5px] leading-[1.6] text-neutral-700">
              {taxNote}
            </p>
          </div>
          <div className="border-t-2 border-text">
            {addOns.map((a, i) => (
              <Reveal
                key={a.num}
                index={i}
                className="grid grid-cols-[52px_minmax(0,1fr)] gap-4 border-b border-neutral-300 py-[22px]"
              >
                <div className="font-heading text-[20px] font-extrabold leading-none text-accent">
                  {a.num}
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
                    <h3 className="m-0 font-heading text-[18px] font-bold leading-[1.2] tracking-[-0.02em]">
                      {a.title}
                    </h3>
                    <span className="font-heading text-[17px] font-extrabold leading-none tracking-[-0.02em] text-accent-700">
                      {a.price}
                    </span>
                  </div>
                  <p className="m-0 max-w-[60ch] text-[14.5px] leading-[1.6] text-neutral-800">
                    {a.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-center gap-[clamp(28px,5vw,64px)] px-gutter py-[clamp(48px,6vh,84px)]">
          <div>
            <div className="mb-4 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
              {timeline.kicker}
            </div>
            <div className="font-heading text-[clamp(44px,6vw,88px)] font-extrabold leading-none tracking-[-0.045em]">
              {timeline.value}
            </div>
          </div>
          <div>
            <h2 className="m-0 mb-4 font-heading text-[clamp(24px,2.6vw,36px)] font-bold leading-[1.15] tracking-[-0.03em]">
              {timeline.heading}
            </h2>
            <p className="m-0 max-w-[52ch] text-[15.5px] leading-[1.6] text-neutral-800">
              {timeline.body}
            </p>
          </div>
        </div>
      </section>

      <CtaBand
        content={{
          heading: 'Tell us the pages. We’ll confirm the number.',
          body: 'Send the brief and we return a written scope naming the package, any add-ons and your launch date — usually within two working days.',
        }}
      />
    </main>
  );
}

/** One engagement model. `accent` is the filled "poster" card in the middle. */
function PlanCard({ plan }: { plan: Plan }) {
  const accent = plan.variant === 'accent';

  return (
    <div
      className={`flex w-full flex-col gap-[18px] p-[clamp(26px,3vw,40px)] outline outline-1 outline-text ${
        accent ? 'bg-accent-600 text-white' : 'bg-bg text-text'
      }`}
    >
      <div
        className={`text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] ${
          accent ? 'text-white/80' : 'text-accent-700'
        }`}
      >
        {plan.kicker}
      </div>
      {/* h2: the two packages are the page's top-level sections, and nothing
          above them is an h2 — h3 here made the document jump h1 -> h3. */}
      <h2 className="m-0 font-heading text-[clamp(23px,2.2vw,32px)] font-bold leading-[1.1] tracking-[-0.03em]">
        {plan.title}
      </h2>
      <div>
        <div className="font-heading text-[clamp(28px,3vw,42px)] font-extrabold leading-none tracking-[-0.04em]">
          {plan.price}
        </div>
        <div className="mt-2 text-[13px] leading-[1.5] opacity-70">
          {plan.priceNote}
        </div>
      </div>
      <p className="m-0 text-[15px] leading-[1.6] opacity-90">{plan.body}</p>
      <ul className="m-0 mt-auto grid list-none gap-2.5 p-0">
        {plan.items.map((it) => (
          <li
            key={it}
            className={`grid grid-cols-[20px_minmax(0,1fr)] gap-2 border-t pt-2.5 text-[14px] leading-[1.5] ${
              accent ? 'border-white/35' : 'border-neutral-300'
            }`}
          >
            <Check
              size={15}
              strokeWidth={3}
              aria-hidden="true"
              className={`mt-[3px] ${accent ? 'text-white' : 'text-accent'}`}
            />
            <span>{it}</span>
          </li>
        ))}
      </ul>
      <Link
        href={routes.contact}
        className={`mt-2 inline-flex items-center gap-2.5 border-2 px-[18px] py-[15px] text-[14.5px] font-semibold leading-[1.3] transition-transform hover:-translate-y-0.5 ${
          accent
            ? 'border-white bg-white text-accent-700'
            : 'border-text bg-text text-bg'
        }`}
      >
        {plan.cta}
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
