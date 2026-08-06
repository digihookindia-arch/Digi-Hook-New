import type { ServiceContent } from '@/content/types';
import { PageHero } from './PageHero';
import { Reveal } from './Reveal';
import { CheckItem } from './CheckItem';
import { CtaBand } from './CtaBand';

/**
 * Shared "service page" layout (README): dark hero with chips → 3-up problems
 * → 4 build cards with checklists → 2-column capability spec table → CTA.
 * Used by Ecommerce, Digital Marketing and Creative Design Studio.
 */
export function ServicePage({ svc }: { svc: ServiceContent }) {
  return (
    <main>
      <PageHero
        tone="dark"
        kicker={`Service · ${svc.kicker}`}
        title={svc.title}
        lead={svc.lead}
        chips={svc.chips}
        titleSize="clamp(38px,6.2vw,98px)"
        titleMax="20ch"
      />

      {/* Where these projects usually fail */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
          <div className="mb-[clamp(32px,5vh,52px)] max-w-[60ch]">
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
              Where these projects usually fail
            </div>
            <h2 className="m-0 font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
              {svc.failTitle}
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] border-t-2 border-text">
            {svc.problems.map((p, i) => (
              <Reveal
                key={p.num}
                index={i}
                className="border-r border-neutral-300 py-[clamp(24px,2.6vw,36px)] pr-7"
              >
                <div className="mb-4 font-heading text-[clamp(26px,2.6vw,38px)] font-extrabold leading-none tracking-[-0.04em] text-accent">
                  {p.num}
                </div>
                <h3 className="m-0 mb-3 font-heading text-[clamp(18px,1.6vw,23px)] font-bold leading-[1.2] tracking-[-0.02em]">
                  {p.title}
                </h3>
                <p className="m-0 text-[14.5px] leading-[1.6] text-neutral-800">
                  {p.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What we build */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
          <div className="mb-[clamp(28px,4vh,44px)] max-w-[60ch]">
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
              What we build
            </div>
            <h2 className="m-0 font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
              {svc.buildTitle}
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))]">
            {svc.builds.map((b, i) => (
              <Reveal
                key={b.num}
                index={i}
                className="h-full bg-bg p-[clamp(24px,3vw,40px)] outline outline-1 outline-neutral-300"
              >
                <div className="mb-4 flex items-baseline gap-3.5">
                  <span className="font-heading text-[13px] font-extrabold leading-none text-accent-700">
                    {b.num}
                  </span>
                  <h3 className="m-0 font-heading text-[clamp(21px,2vw,29px)] font-bold leading-[1.12] tracking-[-0.028em]">
                    {b.title}
                  </h3>
                </div>
                <p className="m-0 mb-5 max-w-[56ch] text-[15.5px] leading-[1.6] text-neutral-800">
                  {b.body}
                </p>
                <ul className="m-0 grid list-none gap-2.5 p-0">
                  {b.items.map((it) => (
                    <CheckItem key={it}>{it}</CheckItem>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Specification table */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
          <div className="mb-[clamp(28px,4vh,44px)] max-w-[60ch]">
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
              Specification
            </div>
            <h2 className="m-0 font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
              Every capability, and what it does for you.
            </h2>
          </div>
          <div className="overflow-x-auto border-t-2 border-text">
            <div className="grid min-w-[640px] grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] bg-text text-[12px] font-semibold uppercase leading-none tracking-[0.12em] text-bg">
              <div className="px-4 py-3.5">Capability</div>
              <div className="border-l border-neutral-700 px-4 py-3.5">
                What it means in practice
              </div>
            </div>
            {svc.specs.map((s, i) => (
              <Reveal
                key={s.name}
                index={i}
                className="grid min-w-[640px] grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] border-b border-neutral-300 transition-colors hover:bg-neutral-100"
              >
                <div className="px-4 py-[18px] font-heading text-[15px] font-bold leading-[1.3] tracking-[-0.015em]">
                  {s.name}
                </div>
                <div className="border-l border-neutral-300 px-4 py-[18px] text-[14.5px] leading-[1.55] text-neutral-800">
                  {s.plain}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand content={{ heading: svc.ctaTitle }} />
    </main>
  );
}
