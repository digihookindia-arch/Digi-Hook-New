import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Check } from 'lucide-react';
import type { DeepContent } from '@/content/types';
import { routes } from '@/content/navigation';
import { PageHero, Chips } from './PageHero';
import { Reveal } from './Reveal';
import { CheckItem } from './CheckItem';
import { FaqSection } from './FaqSection';
import { CtaBand } from './CtaBand';

/**
 * Shared "deep page" layout (README): dark hero → (medical only) OPD vs HMS
 * split + the complimentary-website band → problems → capabilities →
 * (real estate only) three-part ecosystem → stage pipeline → two-column feature
 * panel → operations cards → audience + "what we ask" card → FAQ → CTA.
 */
export function DeepPage({ deep }: { deep: DeepContent }) {
  return (
    <main>
      <PageHero
        tone="dark"
        kicker={`Service · ${deep.kicker}`}
        title={deep.title}
        lead={deep.lead}
        lead2={deep.lead2}
        chips={deep.chips}
        titleSize="clamp(36px,5.8vw,92px)"
        titleMax="24ch"
      />

      {deep.hasSplit && deep.splits ? (
        <>
          {/* Two systems — which one is yours? */}
          <section className="border-b-2 border-divider">
            <div className="mx-auto max-w-content px-gutter py-[clamp(48px,6vh,84px)]">
              <div className="mb-[clamp(28px,4vh,44px)] max-w-[60ch]">
                <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
                  Two systems
                </div>
                <h2 className="m-0 mb-4 font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
                  Which one is yours?
                </h2>
                <p className="m-0 text-[16px] leading-[1.65] text-neutral-800">
                  The dividing line is simple: do you admit patients overnight,
                  or not?
                </p>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))]">
                {deep.splits.map((sp, i) => {
                  const accent = sp.variant === 'accent';
                  return (
                    <Reveal
                      key={sp.num}
                      index={i}
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
                          {sp.kicker}
                        </span>
                        <span className="font-heading text-[13px] font-extrabold leading-[1.2] opacity-50">
                          {sp.num}
                        </span>
                      </div>
                      <h3 className="m-0 font-heading text-[clamp(26px,2.8vw,40px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
                        {sp.title}
                      </h3>
                      <p className="m-0 max-w-[46ch] text-[16px] leading-[1.6] opacity-90">
                        {sp.body}
                      </p>
                      <div className="mt-1.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.12em] opacity-65">
                        {sp.forLabel}
                      </div>
                      <div className="-mt-2 text-[15px] font-medium leading-[1.55] opacity-95">
                        {sp.forWho}
                      </div>
                      <ul className="m-0 mt-2 grid list-none gap-2.5 p-0">
                        {sp.items.map((it) => (
                          <CheckItem
                            key={it}
                            tone={accent ? 'onAccent' : 'default'}
                            className={accent ? 'text-[15px]' : 'text-[15px]'}
                          >
                            {it}
                          </CheckItem>
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
                        {sp.cta}
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Complimentary — the website is included */}
          {deep.siteItems ? (
            <section className="border-b-2 border-divider">
              <div className="mx-auto max-w-content px-gutter py-[clamp(48px,6vh,84px)]">
                <div className="border-2 border-text">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))]">
                    <div className="flex flex-col gap-4 bg-accent-600 p-[clamp(26px,3vw,44px)] text-white">
                      <span className="self-start bg-white px-3 py-2 text-[11.5px] font-bold uppercase leading-[1.3] tracking-[0.16em] text-accent-700">
                        Complimentary
                      </span>
                      <h2 className="m-0 max-w-[18ch] font-heading text-[clamp(26px,3vw,42px)] font-extrabold leading-[1.05] tracking-[-0.038em]">
                        The website is included with both systems.
                      </h2>
                      <p className="m-0 max-w-[42ch] text-[16px] leading-[1.6] opacity-90">
                        No separate quote and no separate project. Whether you
                        take the OPD system or the full HMS, the patient-facing
                        site is engineered and delivered with it.
                      </p>
                      <div className="mt-auto border-t border-white/35 pt-5 text-[14px] font-medium leading-[1.5] opacity-90">
                        Built on the same performance, accessibility and security
                        standards as every Digi Hook build.
                      </div>
                    </div>
                    <div className="bg-bg p-[clamp(26px,3vw,44px)]">
                      <div className="mb-5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
                        What the website covers
                      </div>
                      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-7">
                        {deep.siteItems.map((it) => (
                          <div
                            key={it}
                            className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 border-t border-neutral-300 py-3 text-[14.5px] leading-[1.5] text-neutral-900"
                          >
                            <Check
                              size={15}
                              strokeWidth={3}
                              aria-hidden="true"
                              className="mt-[3px] text-accent"
                            />
                            <span>{it}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {/* The problem */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
          <div className="mb-[clamp(32px,5vh,52px)] max-w-[62ch]">
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
              {deep.leakKicker}
            </div>
            <h2 className="m-0 mb-[18px] font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
              {deep.leakTitle}
            </h2>
            <p className="m-0 text-[16px] leading-[1.65] text-neutral-800">
              {deep.leakIntro}
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] border-t-2 border-text">
            {deep.problems.map((p, i) => (
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

      {/* What you get — capabilities */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-[clamp(32px,5vw,72px)] px-gutter py-[clamp(56px,7vh,100px)]">
          <div>
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
              {deep.moreKicker}
            </div>
            <h2 className="m-0 mb-5 font-heading text-[clamp(30px,3.8vw,54px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
              {deep.moreTitle}
            </h2>
            <p className="m-0 mb-4 max-w-[46ch] text-[16px] leading-[1.65] text-neutral-800">
              {deep.moreIntro}
            </p>
            <p className="m-0 max-w-[46ch] text-[15px] leading-[1.6] text-neutral-700">
              {deep.moreIntro2}
            </p>
          </div>
          <div className="border-t-2 border-text">
            {deep.capabilities.map((c, i) => (
              <Reveal
                key={c}
                index={i}
                className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-b border-neutral-300 py-3.5 text-[15.5px] font-medium leading-[1.5] text-neutral-900"
              >
                <Check
                  size={16}
                  strokeWidth={3}
                  aria-hidden="true"
                  className="mt-[3px] text-accent"
                />
                <span>{c}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Three-part ecosystem (real estate) */}
      {deep.noSplit && deep.ecosystem ? (
        <section className="border-b-2 border-divider">
          <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
            <div className="mb-[clamp(28px,4vh,44px)] max-w-[60ch]">
              <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
                {deep.ecoKicker}
              </div>
              <h2 className="m-0 font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
                {deep.ecoTitle}
              </h2>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))]">
              {deep.ecosystem.map((b, i) => (
                <Reveal
                  key={b.num}
                  index={i}
                  className="h-full bg-bg p-[clamp(24px,3vw,40px)] outline outline-1 outline-neutral-300"
                >
                  <div className="mb-4 flex items-baseline gap-3.5">
                    <span className="font-heading text-[13px] font-extrabold leading-[1.2] text-accent-700">
                      {b.num}
                    </span>
                    <h3 className="m-0 font-heading text-[clamp(21px,2vw,29px)] font-bold leading-[1.12] tracking-[-0.028em]">
                      {b.title}
                    </h3>
                  </div>
                  <p className="m-0 mb-5 max-w-[52ch] text-[15.5px] leading-[1.6] text-neutral-800">
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
      ) : null}

      {/* Stage pipeline */}
      <section className="border-b-2 border-divider bg-surface">
        <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
          <div className="mb-[clamp(28px,4vh,40px)] max-w-[62ch]">
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
              {deep.stagesKicker}
            </div>
            <h2 className="m-0 mb-[18px] font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
              {deep.stagesTitle}
            </h2>
            <p className="m-0 text-[16px] leading-[1.65] text-neutral-800">
              {deep.stagesIntro}
            </p>
          </div>
          <ol className="m-0 flex list-none flex-wrap gap-[2px] border-2 border-text bg-neutral-400 p-0">
            {deep.stages.map((s) => (
              <li
                key={s.num}
                className="min-h-[92px] flex-[1_1_170px] bg-bg px-4 py-[18px] transition-colors hover:bg-accent-100"
              >
                <div className="mb-2.5 text-[11px] font-semibold leading-[1.2] tracking-[0.12em] text-accent-700">
                  {s.num}
                </div>
                <div className="font-heading text-[15px] font-bold leading-[1.25] tracking-[-0.015em]">
                  {s.name}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Feature panel — CAPI events / security controls */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-[clamp(32px,5vw,72px)] px-gutter py-[clamp(56px,7vh,100px)]">
          <div>
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
              {deep.panelKicker}
            </div>
            <h2 className="m-0 mb-5 font-heading text-[clamp(30px,3.8vw,54px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
              {deep.panelTitle}
            </h2>
            <p className="m-0 mb-4 max-w-[50ch] text-[16px] leading-[1.65] text-neutral-800">
              {deep.panelBody1}
            </p>
            <p className="m-0 mb-5 max-w-[50ch] text-[16px] leading-[1.65] text-neutral-800">
              {deep.panelBody2}
            </p>
            <div className="border-l-2 border-accent py-1 pl-5">
              <p className="m-0 max-w-[48ch] text-[15.5px] font-medium leading-[1.6] text-accent-700">
                {deep.panelNote}
              </p>
            </div>
          </div>
          <div>
            <div className="mb-[26px] border-2 border-text">
              <div className="bg-text px-[18px] py-3.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-bg">
                {deep.panelTableTitle}
              </div>
              {deep.panelRows.map((r) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between gap-4 border-b border-neutral-300 px-[18px] py-3.5"
                >
                  <span className="text-[14.5px] font-medium leading-[1.4]">
                    {r.name}
                  </span>
                  <span className="text-right text-[11.5px] font-semibold uppercase leading-[1.2] tracking-[0.08em] text-accent-700">
                    {r.stage}
                  </span>
                </div>
              ))}
            </div>
            <h3 className="m-0 mb-3.5 font-heading text-[20px] font-bold leading-[1.25] tracking-[-0.02em]">
              {deep.gapsTitle}
            </h3>
            <Chips items={deep.gaps} />
            <p className="m-0 mt-[18px] max-w-[52ch] text-[14.5px] leading-[1.6] text-neutral-700">
              {deep.gapsNote}
            </p>
          </div>
        </div>
      </section>

      {/* Operations modules */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
          <div className="mb-[clamp(28px,4vh,44px)] max-w-[62ch]">
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
              {deep.opsKicker}
            </div>
            <h2 className="m-0 mb-[18px] font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
              {deep.opsTitle}
            </h2>
            <p className="m-0 text-[16px] leading-[1.65] text-neutral-800">
              {deep.opsIntro}
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] border-t-2 border-text">
            {deep.ops.map((o, i) => (
              <Reveal
                key={o.num}
                index={i}
                className="h-full min-h-[200px] bg-bg p-[clamp(22px,2.4vw,34px)] outline outline-1 outline-neutral-300"
              >
                <div className="mb-4 font-heading text-[13px] font-extrabold leading-[1.2] text-accent-700">
                  {o.num}
                </div>
                <h3 className="m-0 mb-2.5 font-heading text-[clamp(18px,1.6vw,22px)] font-bold leading-[1.2] tracking-[-0.02em]">
                  {o.title}
                </h3>
                <p className="m-0 text-[14.5px] leading-[1.6] text-neutral-800">
                  {o.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Audience + what we ask before building */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(56px,7vh,100px)]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-[clamp(32px,5vw,72px)]">
            <div>
              <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
                {deep.audienceKicker}
              </div>
              <h2 className="m-0 mb-6 font-heading text-[clamp(30px,3.8vw,54px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
                {deep.audienceTitle}
              </h2>
              <div className="border-t-2 border-text">
                {deep.audience.map((a, i) => (
                  <Reveal
                    key={a.title}
                    index={i}
                    className="border-b border-neutral-300 py-[18px]"
                  >
                    <h3 className="m-0 mb-1.5 font-heading text-[17px] font-bold leading-[1.25] tracking-[-0.02em]">
                      {a.title}
                    </h3>
                    <p className="m-0 max-w-[52ch] text-[14.5px] leading-[1.55] text-neutral-700">
                      {a.body}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>

            <Reveal className="border-2 border-text bg-bg p-[clamp(24px,3vw,40px)]">
              <div className="mb-[18px] text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
                Start here
              </div>
              <h3 className="m-0 mb-4 font-heading text-[clamp(22px,2.2vw,30px)] font-bold leading-[1.12] tracking-[-0.028em]">
                {deep.startTitle}
              </h3>
              <p className="m-0 mb-[22px] text-[15.5px] leading-[1.6] text-neutral-800">
                {deep.startIntro}
              </p>
              <ul className="m-0 mb-[22px] grid list-none gap-2.5 p-0">
                {deep.startItems.map((it) => (
                  <li
                    key={it}
                    className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 border-t border-neutral-200 pt-2.5 text-[15px] font-medium leading-[1.5]"
                  >
                    <ArrowRight
                      size={15}
                      strokeWidth={2.5}
                      aria-hidden="true"
                      className="mt-[4px] text-accent"
                    />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              <p className="m-0 mb-[22px] text-[14px] leading-[1.6] text-neutral-700">
                {deep.startNote}
              </p>
              <Link
                href={routes.contact}
                className="inline-flex items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-[18px] py-[15px] text-[14.5px] font-semibold leading-[1.25] text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
              >
                {deep.startCta}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <FaqSection
        heading="Asked by every client in this sector."
        introBefore="If yours is not here, call"
        introAfter="and ask it directly."
        faqs={deep.faqs}
      />

      <CtaBand
        content={{ heading: deep.ctaTitle, body: deep.ctaBody }}
        addressLine="A211, Golden I, Noida Extension · Mon–Sat, 10:00–19:00 IST"
      />
    </main>
  );
}
