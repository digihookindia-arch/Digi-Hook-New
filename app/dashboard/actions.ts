'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  checkPassword,
  createSessionToken,
  verifySessionToken,
} from '@/lib/auth';
import { getEnquiry, linkEnquiryToProposal } from '@/lib/enquiries';
import {
  deleteProposal,
  getProposal,
  newAccessCode,
  newSlug,
  saveDelivery,
  saveProposal,
  setAssetsShared,
  setProposalAccepted,
  type Proposal,
} from '@/lib/proposals';
import {
  parseAssets,
  parseMilestones,
  parseStages,
  seedDelivery,
} from '@/lib/delivery';
import { parseProposalContent } from '@/lib/proposalContent';
import { draftProposal, reviseProposal } from '@/lib/claude';

/**
 * Dashboard server actions. Every one of these re-verifies the session — the
 * middleware only checks that a cookie exists, it does not validate the
 * signature, so the real check lives here.
 */

export async function requireSession(): Promise<void> {
  const store = await cookies();
  if (!verifySessionToken(store.get(SESSION_COOKIE)?.value)) {
    redirect('/dashboard/login');
  }
}

const secureCookie = process.env.NODE_ENV === 'production';

export async function signIn(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const password = String(formData.get('password') ?? '');
  if (!password) return { error: 'Enter the team password.' };

  try {
    if (!checkPassword(password)) {
      return { error: 'That password is not right.' };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sign-in is not configured.' };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: secureCookie,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  redirect('/dashboard');
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/dashboard/login');
}

/**
 * `revisedAt` and `unchanged` exist because a revision that succeeds is
 * otherwise indistinguishable from one that never ran: the button stops saying
 * "Revising…" and nothing else on the page has to visibly move. Silence read as
 * failure and cost a real afternoon.
 */
export type DraftState = {
  error?: string;
  revisedAt?: string;
  /** Claude returned the proposal byte-identical — the instruction did nothing. */
  unchanged?: boolean;
};

export async function createProposal(
  _prev: DraftState,
  formData: FormData
): Promise<DraftState> {
  await requireSession();

  const client = String(formData.get('client') ?? '').trim();
  const brief = String(formData.get('brief') ?? '').trim();
  const budget = String(formData.get('budget') ?? '').trim();

  if (client.length < 2) return { error: 'Who is this proposal for?' };
  if (brief.length < 20) {
    return { error: 'Give Claude a bit more to work with — a few sentences at least.' };
  }

  // Read the source enquiry before drafting, so the client's contact details
  // travel onto the proposal. Without them stages 3 and 4 have nobody to mail,
  // and the studio would be re-typing an address that is already on file.
  const enquiryId = String(formData.get('enquiry') ?? '').trim();
  const source = enquiryId ? await getEnquiry(enquiryId) : null;

  let result;
  try {
    result = await draftProposal({ client, brief, budget });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not reach Claude.' };
  }
  if (!result.ok) return { error: result.error };

  const now = new Date().toISOString();
  const proposal: Proposal = {
    slug: newSlug(),
    client,
    accessCode: newAccessCode(),
    content: result.content,
    brief,
    budget,
    // Empty when drafted without an enquiry — the dashboard then asks for an
    // address before it will send anything.
    clientEmail: source?.email ?? '',
    clientPhone: source?.phone ?? '',
    createdAt: now,
    updatedAt: now,
    // Accepted later — by the client on the page, or the studio after a call.
    acceptedAt: null,
    // Published to the client only once the studio has edited it down.
    assetsSharedAt: null,
    // Starting points for the delivery tabs, all editable before sending.
    ...seedDelivery(result.content),
  };

  try {
    await saveProposal(proposal);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save the proposal.' };
  }

  // Drafted from an enquiry: link the two and move it out of the open list.
  // Non-fatal — the proposal exists either way, and a broken link is a smaller
  // problem than throwing away a draft that took a paid API call to produce.
  if (enquiryId) {
    try {
      await linkEnquiryToProposal(enquiryId, proposal.slug);
      revalidatePath('/dashboard/enquiries');
    } catch (e) {
      console.error('[dashboard] proposal saved but enquiry link failed', e);
    }
  }

  revalidatePath('/dashboard');
  redirect(`/dashboard/${proposal.slug}`);
}

export async function reviseProposalAction(
  _prev: DraftState,
  formData: FormData
): Promise<DraftState> {
  await requireSession();

  const slug = String(formData.get('slug') ?? '');
  const instruction = String(formData.get('instruction') ?? '').trim();
  if (instruction.length < 4) return { error: 'What should Claude change?' };

  const existing = await getProposal(slug);
  if (!existing) return { error: 'That proposal no longer exists.' };

  let result;
  try {
    result = await reviseProposal({
      client: existing.client,
      current: existing.content,
      instruction,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not reach Claude.' };
  }
  if (!result.ok) return { error: result.error };

  // Claude is told never to state a payment split, and the schedule the client
  // reads comes from `milestones`, not `content` — so "make it 50% upfront"
  // comes back with the document untouched. Saving that and saying nothing is
  // what made Revise look broken. Report it instead.
  const unchanged =
    JSON.stringify(result.content) === JSON.stringify(existing.content);
  if (unchanged) return { unchanged: true };

  const revisedAt = new Date().toISOString();
  try {
    await saveProposal({ ...existing, content: result.content, updatedAt: revisedAt });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save the revision.' };
  }

  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/proposals/${slug}`);
  return { revisedAt };
}

export type ContentState = { error?: string; savedAt?: string };

/**
 * Saves a hand-typed proposal document — the manual alternative to Revise, for
 * the cases Claude structurally cannot make (the payment split) and the cases
 * where typing the one line yourself is just faster than describing it. Writes
 * only `content`; `assets` / `milestones` / `stages` are untouched, same
 * separation `saveDelivery` keeps in the other direction.
 */
export async function saveProposalContentAction(
  _prev: ContentState,
  formData: FormData
): Promise<ContentState> {
  await requireSession();

  const slug = String(formData.get('slug') ?? '');
  if (!slug) return { error: 'Which proposal is this?' };

  const existing = await getProposal(slug);
  if (!existing) return { error: 'That proposal no longer exists.' };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get('content') ?? '{}'));
  } catch {
    return { error: 'The editor sent something malformed. Reload and try again.' };
  }

  const { content, errors } = parseProposalContent(payload);
  if (errors.length > 0) return { error: errors.join(' ') };

  try {
    await saveProposal({ ...existing, content, updatedAt: new Date().toISOString() });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save.' };
  }

  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/proposals/${slug}`);
  return { savedAt: new Date().toISOString() };
}

export type DeliveryState = { error?: string; savedAt?: string };

/**
 * Saves the assets / milestones / work-stage lists the studio maintains beside
 * the proposal. The editor posts one JSON payload; the parsers re-validate
 * every row here rather than trusting it, so a hand-crafted post cannot smuggle
 * in a status the schema does not define — the same rule the enquiry form runs.
 */
export async function saveDeliveryAction(
  _prev: DeliveryState,
  formData: FormData
): Promise<DeliveryState> {
  await requireSession();

  const slug = String(formData.get('slug') ?? '');
  if (!slug) return { error: 'Which proposal is this?' };

  const existing = await getProposal(slug);
  if (!existing) return { error: 'That proposal no longer exists.' };

  let payload: { assets?: unknown; milestones?: unknown; stages?: unknown };
  try {
    payload = JSON.parse(String(formData.get('delivery') ?? '{}'));
  } catch {
    return { error: 'The editor sent something malformed. Reload and try again.' };
  }

  const toRows = (value: unknown) => (Array.isArray(value) ? value : []);

  try {
    await saveDelivery(slug, {
      assets: parseAssets(toRows(payload.assets)),
      milestones: parseMilestones(toRows(payload.milestones)),
      stages: parseStages(toRows(payload.stages)),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save.' };
  }

  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/proposals/${slug}/assets`);
  revalidatePath(`/proposals/${slug}/status`);
  return { savedAt: new Date().toISOString() };
}

/**
 * Studio-side acceptance toggle, for the client who accepts over the phone —
 * and the only way to un-accept, since the client's own button is one-way.
 */
export async function setAcceptedAction(formData: FormData): Promise<void> {
  await requireSession();

  const slug = String(formData.get('slug') ?? '');
  if (!slug) return;
  const accepted = String(formData.get('accepted') ?? '') === 'yes';

  await setProposalAccepted(slug, accepted);
  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/proposals/${slug}`);
  revalidatePath(`/proposals/${slug}/assets`);
  revalidatePath(`/proposals/${slug}/status`);
}

/**
 * Publishes the asset list to the client, or pulls it back. Deliberately a
 * separate action from saving the list — the studio edits the draft repeatedly,
 * and only this button puts it in front of the client.
 */
export async function setAssetsSharedAction(formData: FormData): Promise<void> {
  await requireSession();

  const slug = String(formData.get('slug') ?? '');
  if (!slug) return;
  const shared = String(formData.get('shared') ?? '') === 'yes';

  await setAssetsShared(slug, shared);
  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/proposals/${slug}/assets`);
}

export async function removeProposal(formData: FormData): Promise<void> {
  await requireSession();
  const slug = String(formData.get('slug') ?? '');
  if (slug) await deleteProposal(slug);
  revalidatePath('/dashboard');
  redirect('/dashboard');
}
