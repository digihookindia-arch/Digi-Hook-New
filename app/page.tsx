import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions } from '@/content/meta';
import { routes } from '@/content/navigation';
import { Reveal } from '@/components/Reveal';
import { CtaBand } from '@/components/CtaBand';
import { HeroGlassLogo } from '@/components/hero/HeroGlassLogo';
import {
  homeHero,
  standards,
  difference,
  compare,
  practicesIntro,
  practices,
  processIntro,
  steps,
  industriesIntro,
  industries,
  marquee,
  knowledgeTeaser,
} from '@/content/home';

const homeTitle = 'Digi Hook — IT solutions & creative agency in Noida';

export const metadata: Metadata = {
  ...pageMetadata({
    title: homeTitle,
    description: metaDescriptions.home,
    path: '/',
  }),
  title: { absolute: homeTitle },
};

const COMPARE_COLS =
  'grid-cols-[minmax(0,0.9fr)_minmax(0,1.05fr)_minmax(0,1.05fr)]';

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-2 border-divider">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 animate-dh-grid"
          style={{
            backgroundImage:
              'linear-gradient(to right, color-mix(in srgb, var(--color-text) 7%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-text) 7%, transparent) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div className="relative mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-end gap-[clamp(32px,5vw,72px)] px-gutter pb-[clamp(40px,6vh,72px)] pt-[clamp(56px,9vh,120px)]">
          <div>
            <div className="mb-7 flex animate-dh-rise items-center gap-3">
              <span className="inline-block h-2 w-2 bg-accent" aria-hidden="true" />
              <span className="text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-700">
                {homeHero.eyebrow}
              </span>
            </div>
            <h1 className="m-0 mb-7 text-balance font-heading text-[clamp(44px,8.2vw,132px)] font-extrabold leading-[0.92] tracking-[-0.045em]">
              {homeHero.h1a}
              <br />
              {homeHero.h1b}
              <span className="text-accent">.</span>
            </h1>
            <p className="m-0 mb-5 max-w-[58ch] text-pretty text-[clamp(17px,1.5vw,22px)] leading-[1.55] text-neutral-800">
              {homeHero.lead}
            </p>
            <p className="m-0 mb-9 max-w-[58ch] text-[15.5px] leading-[1.6] text-neutral-700">
              {homeHero.sub}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={routes.contact}
                className="inline-flex items-center gap-3 border-2 border-accent-600 bg-accent-600 px-[22px] py-[17px] text-[15px] font-semibold leading-[1.25] text-white transition-[transform,background,border-color] hover:-translate-y-0.5 hover:border-accent-700 hover:bg-accent-700"
              >
                {homeHero.primaryCta}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
              <Link
                href={routes.engineering}
                className="inline-flex items-center gap-3 border-2 border-text px-[22px] py-[17px] text-[15px] font-semibold leading-[1.25] text-text transition-colors hover:bg-text hover:text-bg"
              >
                {homeHero.secondaryCta}
              </Link>
            </div>
          </div>

          {/* Replaced the Build Readout card: it listed LCP 2.5s / INP 200ms /
              CLS 0.10, which the standards row directly below repeats with
              fuller explanations. The copy for it is still in content/home.ts
              (`readout`, and homeHero.readout*) if this needs reverting. */}
          {/* No <Reveal> wrapper here on purpose — it renders a div
              unconditionally, which would leave an empty grid item and its row
              gap on mobile. HeroGlassLogo wraps itself and returns null below
              900px, so the column disappears outright. */}
          <HeroGlassLogo />
        </div>
      </section>

      {/* ── Standards row ────────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))]">
            {standards.map((s, i) => (
              <Reveal
                key={s.name}
                index={i}
                className="border-r border-neutral-300 py-[clamp(28px,4vw,48px)] pr-6"
              >
                <div className="mb-2.5 font-heading text-[clamp(30px,3.4vw,52px)] font-extrabold leading-none tracking-[-0.035em]">
                  {s.value}
                </div>
                <div className="mb-2 text-[12px] font-semibold uppercase leading-none tracking-[0.12em] text-accent-700">
                  {s.name}
                </div>
                <div className="max-w-[26ch] text-[13.5px] leading-[1.5] text-neutral-700">
                  {s.note}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The difference (comparison table) ────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(64px,8vh,120px)]">
          <div className="mb-[clamp(36px,5vh,64px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-[clamp(28px,5vw,72px)]">
            <div>
              <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                {difference.kicker}
              </div>
              <h2 className="m-0 font-heading text-[clamp(32px,4.4vw,64px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
                {difference.heading1}
                <br />
                {difference.heading2}
              </h2>
            </div>
            <p className="m-0 max-w-[62ch] self-end text-pretty text-[clamp(16px,1.3vw,19px)] leading-[1.6] text-neutral-800">
              {difference.body}
            </p>
          </div>

          <div className="overflow-x-auto border-t-2 border-text">
            <div
              className={`grid min-w-[720px] ${COMPARE_COLS} bg-text text-[12px] font-semibold uppercase leading-none tracking-[0.12em] text-bg`}
            >
              <div className="px-[18px] py-3.5">Question</div>
              <div className="border-l border-neutral-700 px-[18px] py-3.5">
                Typical website build
              </div>
              <div className="border-l border-neutral-700 px-[18px] py-3.5 text-accent-400">
                Engineered build
              </div>
            </div>
            {compare.map((c, i) => (
              <Reveal
                key={c.q}
                index={i}
                className={`grid min-w-[720px] ${COMPARE_COLS} border-b border-neutral-300 transition-colors hover:bg-neutral-100`}
              >
                <div className="px-[18px] py-5 font-heading text-[15.5px] font-bold leading-[1.35] tracking-[-0.015em]">
                  {c.q}
                </div>
                <div className="border-l border-neutral-300 px-[18px] py-5 text-[14.5px] leading-[1.55] text-neutral-700">
                  {c.them}
                </div>
                <div className="border-l border-neutral-300 px-[18px] py-5 text-[14.5px] font-medium leading-[1.55] text-accent-700">
                  {c.us}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Practices grid ───────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter pt-[clamp(64px,8vh,120px)]">
          <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
            {practicesIntro.kicker}
          </div>
          <h2 className="m-0 mb-[clamp(32px,5vh,56px)] max-w-[20ch] font-heading text-[clamp(32px,4.4vw,64px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
            {practicesIntro.heading}
          </h2>
        </div>
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] border-t-2 border-text px-gutter pb-[clamp(48px,6vh,80px)]">
          {practices.map((p, i) => (
            <Reveal key={p.num} index={i}>
              <Link
                href={p.href}
                className="group flex h-full min-h-[260px] flex-col border-b border-r border-neutral-300 p-[clamp(24px,2.6vw,36px)] text-text transition-colors duration-200 hover:bg-text hover:text-bg"
              >
                <div className="mb-[22px] flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                    {p.num}
                  </span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </div>
                <h3 className="m-0 mb-3 font-heading text-[clamp(20px,1.8vw,26px)] font-bold leading-[1.15] tracking-[-0.02em]">
                  {p.title}
                </h3>
                <p className="m-0 mb-4 text-[14.5px] leading-[1.55] opacity-80">
                  {p.body}
                </p>
                <div className="text-[12.5px] font-medium leading-[1.5] opacity-70">
                  {p.meta}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Process (sticky-left, 5 steps) ───────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-[clamp(32px,5vw,80px)] px-gutter py-[clamp(64px,8vh,120px)]">
          {/* `sticky` sits on the inner wrapper, not the grid item — the same
              fix as components/ArticleLayout.tsx. Chrome resolves sticky on a
              grid item against the whole grid rather than its own row, so this
              intro kept floating over the numbered steps once the grid
              collapsed to one column on mobile. Stretching the item and
              sticking the child scopes the travel to the item's own box: two
              columns give it the full row to move through, one column gives it
              nothing, so it goes static exactly when it should. */}
          <div className="self-stretch">
            <div className="sticky top-[120px]">
              <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                {processIntro.kicker}
              </div>
              <h2 className="m-0 mb-5 font-heading text-[clamp(32px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
                {processIntro.heading}
              </h2>
              <p className="m-0 mb-6 max-w-[40ch] text-[15.5px] leading-[1.6] text-neutral-700">
                {processIntro.body}
              </p>
              <Link
                href={routes.contact}
                className="inline-flex items-center gap-2.5 border-b-2 border-accent pb-1 pt-2 text-[14px] font-semibold leading-none text-accent-700"
              >
                {processIntro.link}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="border-t-2 border-text">
            {steps.map((st, i) => (
              <Reveal
                key={st.num}
                index={i}
                className="grid grid-cols-[92px_minmax(0,1fr)] gap-5 border-b border-neutral-300 py-[clamp(24px,3vw,34px)]"
              >
                <div className="font-heading text-[clamp(28px,3vw,40px)] font-extrabold leading-none tracking-[-0.04em] text-accent">
                  {st.num}
                </div>
                <div>
                  <h3 className="m-0 mb-2.5 font-heading text-[clamp(19px,1.7vw,24px)] font-bold leading-[1.2] tracking-[-0.02em]">
                    {st.title}
                  </h3>
                  <p className="m-0 mb-3 max-w-[62ch] text-[15px] leading-[1.6] text-neutral-800">
                    {st.body}
                  </p>
                  <div className="inline-flex items-center gap-2 bg-accent-100 px-3 py-2.5 text-[12px] font-medium uppercase leading-[1.3] tracking-[0.06em] text-accent-700">
                    You get: {st.out}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ───────────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(64px,8vh,120px)]">
          <div className="mb-[clamp(32px,5vh,52px)]">
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
              {industriesIntro.kicker}
            </div>
            <h2 className="m-0 max-w-[24ch] font-heading text-[clamp(32px,4.4vw,64px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
              {industriesIntro.heading}
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]">
            {industries.map((ind, i) => (
              <Reveal key={ind.kicker} index={i}>
                <Link
                  href={ind.href}
                  className="flex h-full min-h-[340px] flex-col gap-4 p-[clamp(24px,2.8vw,40px)] text-text outline outline-1 outline-text transition-colors duration-200 hover:bg-accent-100"
                >
                  <div className="text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                    {ind.kicker}
                  </div>
                  <h3 className="m-0 font-heading text-[clamp(22px,2.1vw,30px)] font-bold leading-[1.12] tracking-[-0.025em]">
                    {ind.title}
                  </h3>
                  <p className="m-0 text-[15px] leading-[1.6] text-neutral-800">
                    {ind.body}
                  </p>
                  <ul className="m-0 mt-auto grid list-none gap-2 border-t border-neutral-300 p-0 pt-4">
                    {ind.points.map((pt) => (
                      <li
                        key={pt}
                        className="flex gap-2.5 text-[13.5px] font-medium leading-[1.4] text-neutral-700"
                      >
                        <span className="text-accent-700" aria-hidden="true">
                          —
                        </span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Technology marquee ───────────────────────────────────────────── */}
      <section className="overflow-hidden border-b-2 border-text bg-accent-600 py-[clamp(28px,4vh,44px)] text-white">
        <div className="flex w-max animate-dh-marquee">
          <MarqueeTrack />
          <MarqueeTrack ariaHidden />
        </div>
      </section>

      {/* ── Knowledge Hub teaser ─────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-center gap-[clamp(32px,5vw,72px)] px-gutter py-[clamp(64px,8vh,120px)]">
          <div>
            <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
              {knowledgeTeaser.kicker}
            </div>
            <h2 className="m-0 mb-5 font-heading text-[clamp(32px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
              {knowledgeTeaser.heading}
            </h2>
            <p className="m-0 mb-7 max-w-[52ch] text-[16px] leading-[1.6] text-neutral-800">
              {knowledgeTeaser.body}
            </p>
            <Link
              href={routes.knowledge}
              className="inline-flex items-center gap-3 border-2 border-text px-5 py-4 text-[15px] font-semibold leading-[1.25] text-text transition-colors hover:bg-text hover:text-bg"
            >
              {knowledgeTeaser.button}
            </Link>
          </div>
          <Reveal>
            <Link
              href={routes.knowledge}
              className="group block border-2 border-text bg-surface p-[clamp(24px,3vw,40px)] text-text transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                {knowledgeTeaser.cardKicker}
              </div>
              <h3 className="m-0 mb-4 font-heading text-[clamp(24px,2.4vw,36px)] font-bold leading-[1.1] tracking-[-0.03em]">
                {knowledgeTeaser.cardTitle}
              </h3>
              <p className="m-0 mb-[22px] text-[15px] leading-[1.6] text-neutral-800">
                {knowledgeTeaser.cardBody}
              </p>
              <div className="inline-flex items-center gap-2 text-[13.5px] font-medium leading-none text-accent-700">
                {knowledgeTeaser.cardLink}
                <ArrowRight size={15} aria-hidden="true" />
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </main>
  );
}

function MarqueeTrack({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div
      aria-hidden={ariaHidden || undefined}
      className="flex gap-14 whitespace-nowrap pr-14 font-heading text-[clamp(28px,3.4vw,52px)] font-extrabold leading-none tracking-[-0.035em]"
    >
      {marquee.map((m, i) => (
        <span key={`${m.name}-${i}`} className={m.dim ? 'opacity-45' : undefined}>
          {m.name}
        </span>
      ))}
    </div>
  );
}
