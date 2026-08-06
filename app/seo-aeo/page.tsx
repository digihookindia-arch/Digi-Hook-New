import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import {
  seoChips,
  seoWhy,
  seoTypes,
  seoTools,
  seoAeo,
  seoPlans,
  seoFaqs,
} from '@/content/seo';
import type { Plan } from '@/content/types';
import { routes } from '@/content/navigation';
import { PageHero } from '@/components/PageHero';
import { Reveal } from '@/components/Reveal';
import { Accordion } from '@/components/Accordion';
import { FaqSection } from '@/components/FaqSection';
import { CtaBand } from '@/components/CtaBand';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions } from '@/content/meta';
import { JsonLd, serviceSchema, faqSchema, offerSchema } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';

const lead =
  'Search Engine Optimisation makes your website appear when someone searches for what you sell. Answer Engine Optimisation makes it appear when someone asks an AI assistant instead.';

export const metadata: Metadata = pageMetadata({
  title: 'SEO & AEO',
  description: metaDescriptions.seo,
  path: routes.seo,
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          {
            ...serviceSchema({
              name: 'SEO & AEO',
              description: lead,
              url: `${SITE_URL}${routes.seo}`,
              serviceType: 'Search engine and answer engine optimisation',
            }),
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Monthly SEO plans',
              itemListElement: seoPlans.map((p) =>
                offerSchema({ name: p.title, description: p.body })
              ),
            },
          },
          faqSchema(seoFaqs),
        ]}
      />

      <main>
        <PageHero
          tone="dark"
          kicker="Service · SEO & AEO"
          title="Get found on Google. And now, inside AI answers."
          lead={lead}
          lead2="This page explains both in two parts: why search visibility is worth paying for, and the types of SEO that produce it. No jargon, no promises of rank one by Friday."
          chips={seoChips}
          titleSize="clamp(36px,5.8vw,92px)"
          titleMax="22ch"
        />

        {/* Part one — Why is SEO important? */}
        <section className="border-b-2 border-divider">
          <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
            <div className="mb-[clamp(32px,5vh,52px)] max-w-[62ch]">
              <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
                Part one
              </div>
              <h2 className="m-0 mb-[18px] font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
                Why is SEO important?
              </h2>
              <p className="m-0 mb-3.5 text-[16px] leading-[1.65] text-neutral-800">
                Right now, someone in your city is searching for exactly what you
                sell. They will call one of the first few businesses they see. If
                that is not you, you never find out the enquiry existed — there is
                no missed call, no notification, nothing.
              </p>
              <p className="m-0 text-[16px] leading-[1.65] text-neutral-800">
                That is what makes it dangerous. Bad SEO does not look like a
                problem. It looks like a quiet month.
              </p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] border-t-2 border-text">
              {seoWhy.map((w, i) => (
                <Reveal
                  key={w.num}
                  index={i}
                  className="border-r border-neutral-300 py-[clamp(24px,2.6vw,36px)] pr-7"
                >
                  <div className="mb-4 font-heading text-[clamp(26px,2.6vw,38px)] font-extrabold leading-none tracking-[-0.04em] text-accent">
                    {w.num}
                  </div>
                  <h3 className="m-0 mb-3 font-heading text-[clamp(18px,1.6vw,23px)] font-bold leading-[1.2] tracking-[-0.02em]">
                    {w.title}
                  </h3>
                  <p className="m-0 text-[14.5px] leading-[1.6] text-neutral-800">
                    {w.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Part two — What are the types of SEO? */}
        <section className="border-b-2 border-divider">
          <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
            <div className="mb-[clamp(28px,4vh,44px)] max-w-[62ch]">
              <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
                Part two
              </div>
              <h2 className="m-0 mb-[18px] font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
                What are the types of SEO?
              </h2>
              <p className="m-0 text-[16px] leading-[1.65] text-neutral-800">
                Six of them. Most agencies sell you one and call it SEO. They work
                together or they barely work at all.
              </p>
            </div>
            <Accordion
              variant="topic"
              items={seoTypes.map((t) => ({
                id: t.id,
                num: t.num,
                label: t.name,
                tag: t.tag,
                panel: (
                  <div className="grid grid-cols-[58px_minmax(0,1fr)] gap-4 pb-[30px]">
                    <div />
                    <div>
                      <p className="m-0 mb-[18px] max-w-[64ch] text-[16px] leading-[1.65] text-neutral-800">
                        {t.body}
                      </p>
                      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-x-7 p-0">
                        {t.items.map((it) => (
                          <li
                            key={it}
                            className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 border-t border-neutral-200 py-[11px] text-[14.5px] leading-[1.5] text-neutral-800"
                          >
                            <Check
                              size={15}
                              strokeWidth={3}
                              aria-hidden="true"
                              className="mt-[3px] text-accent"
                            />
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ),
              }))}
            />
          </div>
        </section>

        {/* How we work — tools */}
        <section className="border-b-2 border-divider bg-surface">
          <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-[clamp(32px,5vw,72px)] px-gutter py-[clamp(56px,7vh,100px)]">
            <div>
              <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
                How we work
              </div>
              <h2 className="m-0 mb-5 font-heading text-[clamp(30px,3.8vw,54px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
                We study who is already winning, then work out why.
              </h2>
              <p className="m-0 mb-4 max-w-[50ch] text-[16px] leading-[1.65] text-neutral-800">
                Before writing a single page we look at the sites currently
                ranking for your terms — what they cover, how their pages are
                structured, where their authority comes from, and which of their
                pages actually earn the traffic.
              </p>
              <p className="m-0 max-w-[50ch] text-[16px] leading-[1.65] text-neutral-800">
                That analysis becomes the plan: the gaps worth filling, the pages
                worth building, and the technical problems worth fixing first.
                Guesswork is expensive; data is not.
              </p>
            </div>
            <div className="border-2 border-text bg-bg">
              <div className="bg-text px-[18px] py-3.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-bg">
                Tools we run
              </div>
              {seoTools.map((t) => (
                <div
                  key={t.name}
                  className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-4 border-b border-neutral-300 px-[18px] py-[15px]"
                >
                  <span className="font-heading text-[15px] font-bold leading-[1.3] tracking-[-0.015em]">
                    {t.name}
                  </span>
                  <span className="text-[14px] leading-[1.5] text-neutral-800">
                    {t.use}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AEO — the new half */}
        <section className="border-b-2 border-divider">
          <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
            <div className="border-2 border-text">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))]">
                <div className="flex flex-col gap-4 bg-accent-600 p-[clamp(26px,3vw,44px)] text-white">
                  <span className="self-start bg-white px-3 py-2 text-[11.5px] font-bold uppercase leading-[1.3] tracking-[0.16em] text-accent-700">
                    AEO — the new half
                  </span>
                  <h2 className="m-0 max-w-[20ch] font-heading text-[clamp(26px,3vw,42px)] font-extrabold leading-[1.05] tracking-[-0.038em]">
                    Ranking on Google is no longer the whole job.
                  </h2>
                  <p className="m-0 max-w-[44ch] text-[16px] leading-[1.6] opacity-90">
                    A growing share of your customers now ask an AI assistant
                    instead of searching. Those assistants do not show ten blue
                    links — they give one answer, and cite a handful of sources.
                  </p>
                  <p className="m-0 max-w-[44ch] text-[16px] leading-[1.6] opacity-90">
                    Answer Engine Optimisation is the work of making your site one
                    of the sources they can read, trust and quote correctly.
                  </p>
                  <div className="mt-auto border-t border-white/35 pt-5 text-[14px] font-medium leading-[1.5] opacity-90">
                    No one can guarantee an AI mention. What we can do is remove
                    every reason for an assistant to skip you.
                  </div>
                </div>
                <div className="bg-bg p-[clamp(26px,3vw,44px)]">
                  <div className="mb-5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
                    What AEO actually involves
                  </div>
                  <div className="grid">
                    {seoAeo.map((a) => (
                      <div
                        key={a.title}
                        className="border-t border-neutral-300 py-3.5"
                      >
                        <h3 className="m-0 mb-[5px] font-heading text-[15.5px] font-bold leading-[1.3] tracking-[-0.018em]">
                          {a.title}
                        </h3>
                        <div className="text-[14px] leading-[1.55] text-neutral-700">
                          {a.body}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Monthly plans */}
        <section className="border-b-2 border-divider">
          <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
            <div className="mb-[clamp(28px,4vh,44px)] max-w-[62ch]">
              <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
                Monthly plans
              </div>
              <h2 className="m-0 mb-[18px] font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
                Two plans. Both monthly, both cancellable.
              </h2>
              <p className="m-0 text-[16px] leading-[1.65] text-neutral-800">
                SEO is continuous work, so it is priced monthly rather than as a
                project. No lock-in contract — if the reports stop making sense,
                stop paying.
              </p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))]">
              {seoPlans.map((pl, i) => (
                <SeoPlanCard key={pl.title} plan={pl} index={i} />
              ))}
            </div>
            <p className="m-0 mt-5 max-w-[70ch] text-[13.5px] leading-[1.6] text-neutral-700">
              Prices exclude GST and any third-party tool or advertising spend.
              Large ecommerce catalogues, multi-city targeting and multi-branch
              businesses are scoped separately.
            </p>
          </div>
        </section>

        <FaqSection
          heading="Fair questions about SEO."
          introBefore="If yours is not here, call"
          introAfter="and ask it directly."
          faqs={seoFaqs}
        />

        <CtaBand
          content={{
            heading: 'Find out where you actually stand.',
            body: 'Send us your website. You get a written audit: your visibility today, who is beating you and why, and the three things worth fixing first.',
            button: 'Request an SEO audit',
          }}
        />
      </main>
    </>
  );
}

function SeoPlanCard({ plan, index }: { plan: Plan; index: number }) {
  const accent = plan.variant === 'accent';

  return (
    <Reveal
      index={index}
      className={`flex h-full flex-col gap-[18px] p-[clamp(26px,3vw,44px)] outline outline-1 outline-text ${
        accent ? 'bg-accent-600 text-white' : 'bg-bg text-text'
      }`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span
          className={`text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] ${
            accent ? 'text-white/80' : 'text-accent-700'
          }`}
        >
          {plan.kicker}
        </span>
        <span className="font-heading text-[13px] font-extrabold leading-[1.2] opacity-50">
          {plan.num}
        </span>
      </div>
      <h3 className="m-0 font-heading text-[clamp(24px,2.6vw,36px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
        {plan.title}
      </h3>
      <div>
        <div className="font-heading text-[clamp(30px,3.2vw,46px)] font-extrabold leading-none tracking-[-0.04em]">
          {plan.price}
        </div>
        <div className="mt-2 text-[13px] leading-[1.5] opacity-70">
          {plan.priceNote}
        </div>
      </div>
      <p className="m-0 max-w-[44ch] text-[15.5px] leading-[1.6] opacity-90">
        {plan.body}
      </p>
      <div className="mt-1.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.12em] opacity-65">
        {plan.forLabel}
      </div>
      <ul className="m-0 -mt-1 grid list-none gap-2.5 p-0">
        {plan.items.map((it) => (
          <li
            key={it}
            className={`grid grid-cols-[22px_minmax(0,1fr)] gap-2 border-t pt-2.5 text-[14.5px] leading-[1.5] ${
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
        className={`mt-3.5 inline-flex items-center gap-2.5 self-start border-2 px-[18px] py-[15px] text-[14.5px] font-semibold leading-[1.25] transition-opacity hover:opacity-90 ${
          accent
            ? 'border-white bg-white text-accent-700'
            : 'border-text bg-text text-bg'
        }`}
      >
        {plan.cta}
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </Reveal>
  );
}
