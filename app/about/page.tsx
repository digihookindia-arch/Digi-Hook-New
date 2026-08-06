import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions } from '@/content/meta';
import { site } from '@/lib/site';
import { routes } from '@/content/navigation';
import { PageHero } from '@/components/PageHero';
import { CtaBand } from '@/components/CtaBand';
import { Reveal } from '@/components/Reveal';
import { roles, principles } from '@/content/about';

const lead =
  'We are a small studio in Noida that builds websites the way engineers build things: decide the structure first, write it down, measure the result. The word “engineering” is not decoration — it is the reason our work still performs a year after launch.';

export const metadata: Metadata = pageMetadata({
  title: 'About',
  description: metaDescriptions.about,
  path: routes.about,
});

export default function AboutPage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <PageHero
        kicker="About Digi Hook"
        title="Coders, designers and editors in one room."
        lead={lead}
        titleSize="clamp(38px,6.2vw,98px)"
        titleMax="20ch"
      />

      {/* ── Roles row ────────────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
            {roles.map((r, i) => (
              <Reveal
                key={r.kicker}
                index={i}
                className="border-r border-neutral-300 py-[clamp(28px,4vw,48px)] pr-7"
              >
                <div className="mb-4 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                  {r.kicker}
                </div>
                {/* h2: these three cards are the first sections under the h1. */}
                <h2 className="m-0 mb-3 font-heading text-[clamp(20px,1.9vw,27px)] font-bold leading-[1.15] tracking-[-0.025em]">
                  {r.title}
                </h2>
                <p className="m-0 max-w-[34ch] text-[14.5px] leading-[1.6] text-neutral-800">
                  {r.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Principles ───────────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
          <div className="mb-[clamp(28px,4vh,44px)] max-w-[58ch]">
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
              How we work
            </div>
            <h2 className="m-0 font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
              Six rules we do not bend.
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] border-t-2 border-text">
            {principles.map((p, i) => (
              <Reveal
                key={p.num}
                index={i}
                className="min-h-[190px] bg-bg p-[clamp(22px,2.4vw,32px)] outline outline-1 outline-neutral-300"
              >
                <div className="mb-4 font-heading text-[13px] font-extrabold leading-none text-accent-700">
                  {p.num}
                </div>
                <h3 className="m-0 mb-2.5 font-heading text-[clamp(18px,1.6vw,22px)] font-bold leading-[1.2] tracking-[-0.02em]">
                  {p.title}
                </h3>
                <p className="m-0 text-[14.5px] leading-[1.55] text-neutral-800">
                  {p.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact strip ────────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider bg-text text-bg">
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-[clamp(24px,4vw,56px)] px-gutter py-[clamp(48px,6vh,84px)]">
          <div>
            <div className="mb-3.5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-500">
              Studio
            </div>
            <div className="text-[16px] font-medium leading-[1.6]">
              A211, Golden I
              <br />
              Noida Extension, Uttar Pradesh
            </div>
          </div>
          <div>
            <div className="mb-3.5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-500">
              Hours
            </div>
            <div className="text-[16px] font-medium leading-[1.6]">
              Monday – Saturday
              <br />
              10:00 – 19:00 IST
            </div>
          </div>
          <div>
            <div className="mb-3.5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-500">
              Talk to us
            </div>
            <a
              href={`tel:${site.phoneHref}`}
              className="font-heading text-[clamp(20px,2vw,28px)] font-bold leading-none tracking-[-0.025em] text-accent-400 transition-colors hover:text-white"
            >
              {site.phoneDisplay}
            </a>
          </div>
        </div>
      </section>

      <CtaBand
        content={{
          heading: 'Come and test the claim.',
          body: 'Send us a site you are unhappy with. We will tell you what is wrong with it in plain English, whether or not you hire us.',
        }}
      />
    </main>
  );
}
