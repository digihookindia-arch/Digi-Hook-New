'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getProposal, setProposalAccepted } from '@/lib/proposals';
import { accessCookie, createAccessToken, verifyAccessToken } from '@/lib/auth';
import { STUDIO_INBOX, sendEmail } from '@/lib/email';
import { proposalAcceptedEmail } from '@/lib/milestoneEmails';
import { formatInr } from '@/lib/money';
import { parseAmount } from '@/lib/delivery';
import { proposalRef } from '@/lib/proposalDoc';
import { SITE_URL } from '@/lib/site';

/**
 * Access-code gate for a published proposal. Verified server-side; on success a
 * cookie scoped to that one proposal is set, so the client types the code once.
 */
export async function unlockProposal(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const slug = String(formData.get('slug') ?? '');
  const code = String(formData.get('code') ?? '').trim();

  const proposal = await getProposal(slug);
  // Same message either way — don't reveal whether the proposal exists.
  if (!proposal || proposal.accessCode !== code) {
    return { error: 'That code does not match. Check it with your contact at Digi Hook.' };
  }

  const store = await cookies();
  store.set(accessCookie(slug), createAccessToken(slug, proposal.accessCode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/proposals/${slug}`,
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath(`/proposals/${slug}`);
  return {};
}

/**
 * The client accepts the proposal from the page itself. Gated by the same
 * access cookie as the page — only someone who has unlocked the proposal can
 * accept it, and acceptance is what opens the other two tabs. One-way from
 * here: only the studio can un-accept, from the dashboard.
 */
export async function acceptProposal(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const slug = String(formData.get('slug') ?? '');

  const proposal = await getProposal(slug);
  if (!proposal) return { error: 'This proposal no longer exists.' };

  const store = await cookies();
  const unlocked = verifyAccessToken(
    store.get(accessCookie(slug))?.value,
    slug,
    proposal.accessCode
  );
  if (!unlocked) {
    return { error: 'Enter the access code before accepting.' };
  }

  // Only the first acceptance notifies. Re-submitting the form — a double
  // click, a back button — must not put a second "they accepted!" in the
  // studio's inbox.
  const firstTime = !proposal.acceptedAt;
  if (firstTime) {
    await setProposalAccepted(slug, true);
    await notifyAccepted(proposal);
  }

  revalidatePath(`/proposals/${slug}`);
  revalidatePath(`/proposals/${slug}/status`);
  revalidatePath(`/proposals/${slug}/payment`);
  return {};
}

/**
 * Tells the studio a proposal has been accepted, and confirms it to the client.
 *
 * Both best-effort and both after the write, the rule this codebase follows
 * everywhere: the acceptance is recorded either way, and a mail server having a
 * bad afternoon must never surface to the client as a failure to accept.
 *
 * The studio alert is the load-bearing one. The client is told on screen that
 * someone will be in touch within 24 hours, and nothing else in the system
 * makes that promise happen — so if this email does not arrive, a client is
 * sitting waiting on a call nobody knows to make.
 */
async function notifyAccepted(proposal: Awaited<ReturnType<typeof getProposal>>) {
  if (!proposal) return;
  try {
    const total = parseAmount(proposal.content.total);
    await sendEmail({
      to: STUDIO_INBOX,
      subject: `ACCEPTED: ${proposal.client} — ${proposal.content.title}`,
      body: [
        `${proposal.client} has accepted their proposal.`,
        '',
        `Proposal:  ${proposalRef(proposal.slug)}`,
        `Title:     ${proposal.content.title}`,
        `Value:     ${total === null ? proposal.content.total : formatInr(total)} (excluding GST)`,
        `Contact:   ${proposal.clientEmail || 'no email on file'}` +
          `${proposal.clientPhone ? ` / ${proposal.clientPhone}` : ''}`,
        '',
        'THEY HAVE BEEN TOLD SOMEONE WILL CONTACT THEM WITHIN 24 HOURS.',
        'That promise is made on the page and nothing else keeps it.',
        '',
        `${SITE_URL}/dashboard/${proposal.slug}`,
      ].join('\n'),
      // So hitting reply reaches the client rather than the sender box.
      ...(proposal.clientEmail ? { replyTo: proposal.clientEmail } : {}),
    });
  } catch (e) {
    console.error('[proposals] studio acceptance alert failed', proposal.slug, e);
  }

  if (!proposal.clientEmail) return;
  try {
    await sendEmail({
      to: proposal.clientEmail,
      ...proposalAcceptedEmail({
        name: proposal.client,
        slug: proposal.slug,
        firstPhase: proposal.content.timeline[0]?.phase,
      }),
    });
  } catch (e) {
    console.error('[proposals] client acceptance email failed', proposal.slug, e);
  }
}
