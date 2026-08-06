import Link from 'next/link';
import { site } from '@/lib/site';
import { footerServices, footerCompany } from '@/content/navigation';

/** Site footer (README shared chrome): brand blurb + phone/address, Services,
 * Company, and a bottom bar with copyright and the build-stack line. */
export function Footer() {
  return (
    <footer data-site-footer className="bg-text text-neutral-300">
      <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-[clamp(28px,4vw,64px)] px-gutter py-[clamp(48px,6vh,80px)]">
        <div>
          <div className="mb-4 font-heading text-[clamp(26px,2.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-bg">
            Digi Hook
          </div>
          <p className="m-0 mb-5 max-w-[40ch] text-[14.5px] leading-[1.6]">
            An IT solutions and creative agency in Noida — engineers,
            designers and marketers building websites, online stores and
            industry platforms that stay fast, safe and findable.
          </p>
          <a
            href={`tel:${site.phoneHref}`}
            className="inline-block py-[3px] font-heading text-[20px] font-bold leading-none text-accent-400 transition-colors hover:text-white"
          >
            {site.phoneDisplay}
          </a>
          <div className="mt-3.5 text-[14px] leading-[1.6]">
            A211, Golden I, Noida Extension, UP
          </div>
        </div>

        <FooterColumn heading="Services" links={footerServices} />
        <FooterColumn heading="Company" links={footerCompany} />
      </div>

      <div className="border-t border-neutral-800">
        <div className="mx-auto flex max-w-content flex-wrap justify-between gap-4 px-gutter py-[22px] text-[12.5px] leading-none text-neutral-500">
          <span>© 2026 Digi Hook. All rights reserved.</span>
          <span>{site.builtWith}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="mb-[18px] text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-500">
        {heading}
      </div>
      {/* py + a tightened gap keeps the visual rhythm identical while giving
          each link a 26px hit area — 14.5px text on a 1.4 line box is only
          20px, under the 24px WCAG 2.2 AA target-size minimum the site
          publishes about itself. */}
      <div className="grid gap-1">
        {links.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="py-[3px] text-[14.5px] leading-[1.4] text-neutral-300 transition-colors hover:text-accent-400"
          >
            {f.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
