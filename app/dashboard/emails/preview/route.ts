import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { getJourney, getProposalJourney, milestoneMailFor } from '@/lib/journey';
import type { MilestoneStep } from '@/lib/emailTemplate';

/**
 * Renders the exact email a stage would send, for this client, with their real
 * values in it.
 *
 * The point is to catch copy that is wrong for the situation before a client
 * reads it — "thank you for talking it through" when no call happened, a
 * missing first stage, an address nobody checked. Reading the template source
 * does not catch those; seeing it filled in does.
 *
 * Studio-only, and never indexed: this contains a client's proposal link and
 * access code.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const store = await cookies();
  if (!verifySessionToken(store.get(SESSION_COOKIE)?.value)) {
    return new Response('Not authorised.', { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('enquiry') ?? '';
  const slug = url.searchParams.get('proposal') ?? '';
  const stage = Number(url.searchParams.get('stage'));
  if ((!id && !slug) || ![1, 2, 3, 4].includes(stage)) {
    return new Response('Which email, for which client?', { status: 400 });
  }

  const journey = id ? await getJourney(id) : await getProposalJourney(slug);
  if (!journey) return new Response('No such record.', { status: 404 });

  const mail = milestoneMailFor(
    stage as MilestoneStep,
    journey.enquiry,
    journey.proposal
  );
  if (!mail) {
    return new Response(
      'That stage has nothing to render — the record it describes does not exist yet.',
      { status: 409 }
    );
  }

  return new Response(mail.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  });
}
