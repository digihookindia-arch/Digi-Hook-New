import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getEnquiry } from '@/lib/enquiries';
import { requireSession } from '../actions';
import { NewProposalForm } from './NewProposalForm';

export const dynamic = 'force-dynamic';

/**
 * Reached blank from the dashboard, or prefilled from an enquiry via
 * `?enquiry=<id>` — in which case the visitor's own answers become the brief
 * rather than being retyped from the email.
 */
export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ enquiry?: string }>;
}) {
  await requireSession();

  const { enquiry: enquiryId } = await searchParams;
  const enquiry = enquiryId ? await getEnquiry(enquiryId) : null;

  const brief = enquiry
    ? [
        `Service requested: ${enquiry.service}`,
        enquiry.company ? `Company: ${enquiry.company}` : null,
        '',
        ...enquiry.summary.map((r) => `${r.label}: ${r.value}`),
      ]
        .filter((l) => l !== null)
        .join('\n')
    : '';

  return (
    <main>
      <div className="mx-auto max-w-[760px] px-gutter py-[clamp(40px,6vh,72px)]">
        <Link
          href={enquiry ? `/dashboard/enquiries/${enquiry.id}` : '/dashboard'}
          className="mb-7 inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase leading-none tracking-[0.1em] text-accent-700"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {enquiry ? 'Back to the enquiry' : 'Proposals'}
        </Link>

        <h1 className="m-0 mb-3 font-heading text-[clamp(28px,3.6vw,44px)] font-extrabold leading-[1.03] tracking-[-0.04em]">
          New proposal
        </h1>
        <p className="m-0 mb-8 max-w-[58ch] text-[15.5px] leading-[1.6] text-neutral-800">
          {enquiry
            ? `Prefilled from ${enquiry.name}’s enquiry. Edit anything before drafting — Claude only sees what is in the box.`
            : 'Give the basics. Claude drafts the proposal against our published pricing, and you can revise it in plain English afterwards.'}
        </p>

        <NewProposalForm
          defaultClient={enquiry?.company || enquiry?.name || ''}
          defaultBrief={brief}
          enquiryId={enquiry?.id}
        />
      </div>
    </main>
  );
}
