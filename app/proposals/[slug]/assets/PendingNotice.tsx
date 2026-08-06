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
      <div className="mb-8 flex flex-wrap items-baseline gap-x-3 gap-y-2 border-2 border-accent-600 p-6">
        <Check
          size={17}
          strokeWidth={3}
          aria-hidden="true"
          className="self-center text-accent"
        />
        <h2 className="m-0 font-heading text-[clamp(19px,2vw,24px)] font-bold leading-[1.2] tracking-[-0.025em]">
          Thank you for accepting the proposal.
        </h2>
      </div>

      <p className="m-0 mb-4 max-w-[60ch] text-[16px] leading-[1.65] text-neutral-800">
        We are putting together the list of everything we need from you to build
        the site — copy, images, logo files and any accounts we need access to.
        It will appear on this page <strong className="font-semibold">within 24 hours</strong>.
      </p>
      <p className="m-0 max-w-[60ch] text-[15.5px] leading-[1.65] text-neutral-800">
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
    </section>
  );
}
