'use client';

import { useActionState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { site } from '@/lib/site';
import { acceptProposal } from './actions';

/**
 * The acceptance band that closes the document — the signature panel of the
 * studio's printed proposals, and the one place on the page carrying full
 * accent. Accepting is what unlocks the other three stages; the server
 * re-checks the access cookie, so this button is a convenience, not the
 * security boundary.
 *
 * `#accept` is the anchor the cover's call to action jumps to. Keep the id.
 *
 * White on `accent-600` measures 4.74:1 and passes AA; white on bare `accent`
 * is 4.20:1 and does not — so the band is 600, and the button that sits on it
 * inverts to dark rather than going lighter, which would fail either way.
 */
export function AcceptProposal({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(
    acceptProposal,
    {} as { error?: string }
  );

  return (
    <section
      id="accept"
      className="mt-[clamp(44px,6vw,76px)] scroll-mt-6 break-inside-avoid overflow-hidden rounded-panel bg-accent-600 text-white shadow-lift"
    >
      <div className="p-[clamp(26px,4.5vw,52px)]">
        <div className="mb-4 text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-white/75">
          Acceptance
        </div>

        <h2 className="m-0 max-w-[16ch] font-heading text-[clamp(26px,3.6vw,44px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
          Happy with all of it?
        </h2>

        <p className="m-0 mt-5 max-w-[54ch] text-[clamp(15px,1.6vw,17px)] leading-[1.65] text-white/85">
          Accepting opens the next three stages — what we need from you, a live
          view of the work, and the payment schedule. It charges nothing: each
          payment is invoiced when it falls due.
        </p>

        <form action={action} className="mt-8">
          <input type="hidden" name="slug" value={slug} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-[56px] items-center gap-3 rounded-panel-sm bg-text px-7 text-[15.5px] font-semibold leading-none text-bg shadow-lift transition-opacity hover:opacity-90 disabled:opacity-45 print:hidden"
          >
            <Check size={17} strokeWidth={3} aria-hidden="true" />
            {pending ? 'One moment…' : 'Accept this proposal'}
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </form>

        {state.error ? (
          <p
            role="alert"
            className="m-0 mt-4 text-[14px] font-semibold leading-[1.5] text-white"
          >
            {state.error}
          </p>
        ) : null}

        <p className="m-0 mt-7 max-w-[54ch] text-[13.5px] leading-[1.65] text-white/80">
          Rather talk it through first? Call us on{' '}
          <a href={`tel:${site.phoneHref}`} className="border-b border-white/50 text-white">
            {site.phoneDisplay}
          </a>{' '}
          — nothing here is fixed until you are happy with it.
        </p>

        {/* Signature lines, for the clients who print the document and sign it.
            Screen-hidden: on screen the button above is the acceptance. */}
        <div className="mt-10 hidden grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-8 print:grid">
          <div className="border-t-2 border-current pt-2 text-[12px] uppercase tracking-[0.12em]">
            Client — signature and date
          </div>
          <div className="border-t-2 border-current pt-2 text-[12px] uppercase tracking-[0.12em]">
            {site.name} — signature and date
          </div>
        </div>
      </div>
    </section>
  );
}
