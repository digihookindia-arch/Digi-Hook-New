import Link from 'next/link';
import { routes } from '@/content/navigation';
import { CtaBand } from '@/components/CtaBand';

/**
 * Shared chrome for Knowledge Hub articles: hero, sticky contents rail, body
 * column and closing CTA. The flagship article predates this and still carries
 * its own copy of the markup.
 *
 * Body prose uses the exported class constants below so every article sets type
 * identically — import them rather than restating the utility strings.
 */

export const H2 =
  'm-0 mb-[18px] scroll-mt-[110px] font-heading text-[clamp(24px,2.6vw,36px)] font-extrabold leading-[1.1] tracking-[-0.032em]';
export const H3 =
  'm-0 mb-2.5 font-heading text-[20px] font-bold leading-[1.25] tracking-[-0.02em]';
export const P = 'm-0 mb-[18px] text-[17px] leading-[1.75] text-neutral-900';
export const P_LAST = 'm-0 mb-8 text-[17px] leading-[1.75] text-neutral-900';

/** An accent-ruled aside for the one sentence a reader should leave with. */
export function Pullquote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8 border-l-2 border-accent py-1 pl-5">
      <p className="m-0 text-[18px] font-medium leading-[1.6] text-accent-700">
        {children}
      </p>
    </div>
  );
}

/** Rule-separated list, used for questions and checklists. */
export function RuledList({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 mb-6 grid list-none gap-3 p-0">
      {items.map((item) => (
        <li
          key={item}
          className="border-t border-neutral-300 pt-3 text-[17px] font-medium leading-[1.6]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Two-column term/definition list, as used for the Core Web Vitals table. */
export function DefinitionList({
  items,
}: {
  items: readonly { term: string; note: string }[];
}) {
  return (
    <ul className="m-0 mb-[18px] grid list-none gap-3 p-0">
      {items.map((d) => (
        <li
          key={d.term}
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-3.5 border-t border-neutral-300 pt-3 text-[16px] leading-[1.6]"
        >
          <strong className="font-heading tracking-[-0.01em]">{d.term}</strong>
          <span className="[grid-column:span_2]">{d.note}</span>
        </li>
      ))}
    </ul>
  );
}

export function ArticleLayout({
  meta,
  title,
  lead,
  contents,
  cta,
  children,
}: {
  /** e.g. "Technology · 14 min read · Updated July 2026" */
  meta: string;
  title: string;
  lead: string;
  contents: readonly { href: string; label: string }[];
  cta: { heading: string; body: string };
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(48px,7vh,88px)]">
          <Link
            href={routes.knowledge}
            className="mb-8 inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase leading-none tracking-[0.1em] text-accent-700"
          >
            ← Knowledge Hub
          </Link>
          <div className="mb-[22px] text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-neutral-700">
            {meta}
          </div>
          <h1 className="m-0 mb-6 max-w-[26ch] font-heading text-[clamp(34px,5.4vw,84px)] font-extrabold leading-[0.96] tracking-[-0.045em]">
            {title}
          </h1>
          <p className="m-0 max-w-[64ch] text-[clamp(17px,1.5vw,22px)] leading-[1.55] text-neutral-800">
            {lead}
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] items-start gap-[clamp(32px,5vw,80px)] px-gutter py-[clamp(40px,6vh,80px)]">
          {/* `sticky` sits on the inner wrapper, not the grid item. Chrome
              resolves sticky on a grid item against the whole grid rather than
              its own row, so a sticky <aside> keeps floating over the article
              once this grid collapses to one column. Stretching the aside and
              sticking the child scopes the travel to the aside's own box: two
              columns give it the full row to move through, one column gives it
              nothing, so it goes static exactly when it should. */}
          <aside className="self-stretch">
            <div className="sticky top-[110px]">
              <div className="mb-1.5 border-b-2 border-text pb-3 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-700">
                Contents
              </div>
              {contents.map((c) => (
                <a
                  key={c.href}
                  href={c.href}
                  className="block border-b border-neutral-300 py-[11px] text-[14px] font-medium leading-[1.4] text-text transition-colors hover:text-accent-700"
                >
                  {c.label}
                </a>
              ))}
            </div>
          </aside>

          <article className="max-w-[74ch]">{children}</article>
        </div>
      </section>

      <CtaBand content={cta} />
    </>
  );
}
