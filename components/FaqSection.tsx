import { site } from '@/lib/site';
import type { Faq } from '@/content/types';
import { Accordion } from './Accordion';

/**
 * The two-column FAQ block repeated across service pages: heading and a
 * "call us instead" note on the left, single-open accordion on the right.
 * Pages additionally emit these items as FAQPage schema.
 */
export function FaqSection({
  heading,
  introBefore,
  introAfter,
  faqs,
}: {
  heading: string;
  introBefore: string;
  introAfter: string;
  faqs: Faq[];
}) {
  return (
    <section className="border-b-2 border-divider">
      <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-[clamp(32px,5vw,72px)] px-gutter py-[clamp(56px,7vh,100px)]">
        <div>
          <div className="mb-[18px] text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-accent-700">
            Questions
          </div>
          <h2 className="m-0 mb-5 font-heading text-[clamp(30px,3.6vw,52px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
            {heading}
          </h2>
          <p className="m-0 max-w-[38ch] text-[15.5px] leading-[1.6] text-neutral-700">
            {introBefore}{' '}
            <a
              href={`tel:${site.phoneHref}`}
              className="border-b border-accent text-accent-700"
            >
              98736 74517
            </a>{' '}
            {introAfter}
          </p>
        </div>

        <Accordion
          items={faqs.map((f) => ({
            id: f.id,
            label: f.q,
            panel: (
              <p className="m-0 mb-6 max-w-[66ch] text-[15.5px] leading-[1.65] text-neutral-800">
                {f.a}
              </p>
            ),
          }))}
        />
      </div>
    </section>
  );
}
