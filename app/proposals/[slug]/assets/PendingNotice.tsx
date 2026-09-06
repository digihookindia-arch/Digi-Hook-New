import { Check } from 'lucide-react';
import { site } from '@/lib/site';

/**
 * Shown after the client accepts but before the studio has published the asset
 * list. The seeded checklist is a prompt for the studio's own edit, so putting
 * it in front of the client the instant they accept would be showing them a
 * list nobody has actually looked at for their project.
 */
export function PendingNotice() {
  return (
    <section>
      <div className="mb-3 text-[13px] font-extrabold uppercase leading-none tracking-[0.16em] text-accent-700">
        02
      </div>
      <h2 className="m-0 max-w-[22ch] font-heading text-[clamp(24px,3vw,38px)] font-extrabold leading-[1.06] tracking-[-0.035em]">
        What we need from you
      </h2>

      <div className="mt-8 rounded-panel bg-panel p-[clamp(24px,4vw,40px)] shadow-panel">
        <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent-600 text-white">
          <Check size={19} strokeWidth={3} aria-hidden="true" />
        </span>
        <h3 className="m-0 max-w-[24ch] font-heading text-[clamp(20px,2.4vw,27px)] font-bold leading-[1.15] tracking-[-0.03em]">
          Thank you for accepting the proposal.
        </h3>
        <p className="m-0 mt-4 max-w-[60ch] text-[16px] leading-[1.7] text-neutral-800">
          We are putting together the list of everything we need from you to build
          the site — copy, images, logo files and any accounts we need access to.
          It will appear on this page{' '}
          <strong className="font-semibold">within 24 hours</strong>.
        </p>
        <p className="m-0 mt-4 max-w-[60ch] text-[15.5px] leading-[1.7] text-neutral-800">
          Nothing is needed from you until then. If you already have material ready
          and would rather send it now, call us on{' '}
          <a
            href={`tel:${site.phoneHref}`}
            className="border-b border-accent text-accent-700"
          >
            {site.phoneDisplay}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
