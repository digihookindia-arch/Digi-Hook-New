import { cookies } from 'next/headers';
import { getProposal, type Proposal } from './proposals';
import { accessCookie, verifyAccessToken } from './auth';

/**
 * The access-code gate for a client-facing proposal, in one place because it is
 * now checked on four routes instead of one.
 *
 * The layout renders the gate, but a Next.js layout that declines to render
 * `children` does not stop those child pages from executing — so every page
 * behind the gate re-checks with `unlockedProposal` and renders nothing when it
 * comes back null. Same reasoning as `requireSession()` on the dashboard: the
 * outer check is for the visitor, the inner check is the one that is load
 * bearing.
 */

export type ProposalAccess =
  | { state: 'missing' }
  | { state: 'locked' }
  | { state: 'open'; proposal: Proposal };

export async function proposalAccess(slug: string): Promise<ProposalAccess> {
  const proposal = await getProposal(slug);
  if (!proposal) return { state: 'missing' };

  const store = await cookies();
  const unlocked = verifyAccessToken(
    store.get(accessCookie(slug))?.value,
    slug,
    proposal.accessCode
  );
  return unlocked ? { state: 'open', proposal } : { state: 'locked' };
}

/** The proposal if this visitor has unlocked it, otherwise null. */
export async function unlockedProposal(slug: string): Promise<Proposal | null> {
  const access = await proposalAccess(slug);
  return access.state === 'open' ? access.proposal : null;
}
