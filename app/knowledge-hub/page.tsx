import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions } from '@/content/meta';
import { routes } from '@/content/navigation';
import { PageHero } from '@/components/PageHero';
import { Reveal } from '@/components/Reveal';
import { articles } from '@/content/knowledge';

const lead =
  'Written for the person paying for the website, not for other developers. Read these and you will brief any agency better — including us.';

export const metadata: Metadata = pageMetadata({
  title: 'Knowledge Hub',
  description: metaDescriptions.knowledge,
  path: routes.knowledge,
});

export const revalidate = 3600;

export default function KnowledgeHubPage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <PageHero
        kicker="Knowledge Hub"
        title="Answers, with the trade-offs left in."
        lead={lead}
        titleMax="22ch"
      />

      {/* ── Flagship article ─────────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(40px,5vh,72px)]">
          <Reveal>
            <Link
              href={routes.article}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-[clamp(24px,4vw,56px)] border-2 border-text p-[clamp(26px,3vw,44px)] text-text transition-colors duration-200 hover:bg-neutral-100"
            >
              <div>
                <div className="mb-5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                  Flagship article · Performance · 12 min read
                </div>
                <h2 className="m-0 mb-[18px] font-heading text-[clamp(28px,3.4vw,50px)] font-extrabold leading-[1.02] tracking-[-0.038em]">
                  Why your website is slow — and what actually fixes it
                </h2>
                <div className="inline-block border-b-2 border-accent pb-1 text-[14px] font-semibold leading-none text-accent-700">
                  Read the article →
                </div>
              </div>
              <div className="self-center">
                <p className="m-0 mb-4 text-[16px] leading-[1.65] text-neutral-800">
                  A plain-English tour of what happens between a click and a
                  visible page, the four decisions that cause almost all
                  slowness, and how to tell whether a fix is real or cosmetic.
                </p>
                <p className="m-0 text-[14px] leading-[1.6] text-neutral-700">
                  Covers: images, JavaScript, fonts, third-party scripts,
                  hosting, and how to read a Core Web Vitals report without a
                  developer.
                </p>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── The writing schedule ─────────────────────────────────────────── */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(48px,6vh,88px)]">
          <div className="mb-[clamp(24px,4vh,40px)] flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="m-0 font-heading text-[clamp(26px,3vw,42px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
              The writing schedule
            </h2>
            <p className="m-0 max-w-[46ch] text-[14px] leading-[1.5] text-neutral-700">
              Each article answers one question properly. Live titles are
              linked; the rest are commissioned.
            </p>
          </div>
          <div className="border-t-2 border-text">
            {articles.map((a, i) => {
              const row = (
                <>
                  <div className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-accent-700">
                    {a.cat}
                  </div>
                  <div className="font-heading text-[clamp(17px,1.7vw,24px)] font-bold leading-[1.25] tracking-[-0.022em] [grid-column:span_2]">
                    {a.title}
                  </div>
                  <div className="justify-self-start text-[12.5px] font-medium uppercase leading-none tracking-[0.06em] text-neutral-700">
                    {a.status}
                  </div>
                </>
              );
              const grid =
                'grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-baseline gap-3 border-b border-neutral-300 py-[22px]';

              return (
                <Reveal key={a.title} index={i} className={a.href ? undefined : grid}>
                  {a.href ? (
                    <Link
                      href={a.href}
                      className={`${grid} text-text transition-colors hover:text-accent-700`}
                    >
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
