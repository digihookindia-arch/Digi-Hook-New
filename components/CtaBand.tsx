import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { site } from '@/lib/site';
import { routes } from '@/content/navigation';
import { defaultCta, type CtaContent } from '@/content/cta';

/**
 * The Modernist "poster statement" CTA band — a full field of accent red closing
 * most pages. Copy defaults to the shared CTA; pages override any field.
 */
export function CtaBand({
  content,
  addressLine = 'A211, Golden I, Noida Extension · Mon–Sat, 10:00–19:00 IST',
}: {
  content?: Partial<CtaContent>;
  addressLine?: string;
}) {
  const c = { ...defaultCta, ...content };

  return (
    <section className="bg-accent-600 text-white">
      <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-end gap-[clamp(28px,5vw,64px)] px-gutter py-[clamp(56px,8vh,104px)]">
        <div>
          <div className="mb-[22px] text-[12px] font-semibold uppercase leading-none tracking-[0.16em] opacity-75">
            {c.eyebrow}
          </div>
          <h2 className="m-0 mb-[22px] max-w-[22ch] font-heading text-[clamp(34px,5.4vw,80px)] font-extrabold leading-[0.96] tracking-[-0.04em]">
            {c.heading}
          </h2>
          <p className="m-0 max-w-[52ch] text-[clamp(16px,1.4vw,20px)] leading-[1.55] opacity-90">
            {c.body}
          </p>
        </div>

        <div className="grid justify-items-start gap-3.5">
          <Link
            href={routes.contact}
            className="inline-flex items-center gap-3 border-2 border-white bg-white px-[22px] py-[18px] text-[15.5px] font-bold leading-[1.25] text-accent-700 transition-transform hover:-translate-y-0.5"
          >
            {c.button}
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <a
            href={`tel:${site.phoneHref}`}
            className="inline-block border-b-2 border-white/50 pb-1 pt-1 font-heading text-[clamp(20px,2vw,30px)] font-bold leading-none tracking-[-0.025em] text-white transition-colors hover:border-white"
          >
            {site.phoneDisplay}
          </a>
          <div className="text-[13.5px] leading-[1.5] opacity-85">
            {addressLine}
          </div>
        </div>
      </div>
    </section>
  );
}
