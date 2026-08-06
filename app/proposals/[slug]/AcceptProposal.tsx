'use client';

import { useActionState } from 'react';
import { Check } from 'lucide-react';
import { site } from '@/lib/site';
import { acceptProposal } from './actions';

/**
 * The acceptance block that closes the document — the equivalent of the
 * signature panel on the studio's printed proposals. Accepting is what unlocks
 * "What we need" and "Status"; the server re-checks the access cookie, so this
 * button is a convenience, not the security boundary.
 */
export function AcceptProposal({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(
    acceptProposal,
    {} as { error?: string }
  );

  return (
    <section className="mt-4 break-inside-avoid border-2 border-text">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 bg-text px-7 py-4 text-bg">
        <span className="font-heading text-[15px] font-extrabold leading-none tracking-[-0.01em] text-bg">
          ✓
        </span>
        <h2 className="m-0 font-heading text-[clamp(19px,2vw,24px)] font-bold leading-[1.2] tracking-[-0.025em]">
          Acceptance
        </h2>
      </div>

      <div className="p-7">
        <p className="m-0 mb-5 max-w-[58ch] text-[15.5px] leading-[1.65] text-neutral-800">
          To go ahead, accept below. That opens the next two tabs — what we need
          from you, and a live view of the work and the payment schedule.
          Accepting charges nothing; each payment above is invoiced when it falls
          due.
        </p>

        <form action={action}>
          <input type="hidden" name="slug" value={slug} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-[48px] items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-6 text-[15px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45 print:hidden"
          >
            <Check size={16} strokeWidth={3} aria-hidden="true" />
            {pending ? 'One moment…' : 'Accept this proposal'}
          </button>
        </form>

        {state.error ? (
          <p
            role="alert"
            className="m-0 mt-3 text-[13.5px] font-medium leading-[1.45] text-accent-700"
          >
            {state.error}
          </p>
        ) : null}

        <p className="m-0 mt-5 max-w-[58ch] text-[13.5px] leading-[1.6] text-neutral-700">
          Rather talk it through first? Call us on{' '}
          <a
            href={`tel:${site.phoneHref}`}
            className="border-b border-accent text-accent-700"
          >
            {site.phoneDisplay}
          </a>{' '}
          — nothing here is fixed until you are happy with it.
        </p>

        {/* Signature lines, for the clients who print the document and sign it.
            Screen-hidden: on screen the button above is the acceptance. */}
        <div className="mt-8 hidden grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-8 print:grid">
          <div className="border-t-2 border-text pt-2 text-[12px] uppercase tracking-[0.12em] text-neutral-700">
            Client — signature and date
          </div>
          <div className="border-t-2 border-text pt-2 text-[12px] uppercase tracking-[0.12em] text-neutral-700">
            {site.name} — signature and date
          </div>
        </div>
      </div>
    </section>
  );
}
