'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getProposal, setProposalAccepted } from '@/lib/proposals';
import { accessCookie, createAccessToken, verifyAccessToken } from '@/lib/auth';

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

  if (!proposal.acceptedAt) await setProposalAccepted(slug, true);

  revalidatePath(`/proposals/${slug}`);
  revalidatePath(`/proposals/${slug}/assets`);
  revalidatePath(`/proposals/${slug}/status`);
  return {};
}
