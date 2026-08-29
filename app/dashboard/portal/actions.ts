'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { createSetPasswordToken } from '@/lib/auth';
import {
  createOrGetClientByEmail,
  getClient,
  isActivated,
} from '@/lib/clients';
import {
  createProject,
  deleteProject,
  getProject,
  updateProjectDetails,
} from '@/lib/portalProjects';
import { deleteDocument, saveDocument } from '@/lib/documents';
import { runAudit } from '@/lib/seoAudits';
import { portalInviteEmail } from '@/lib/portalEmails';
import { isEmailConfigured, sendEmail, STUDIO_INBOX } from '@/lib/email';
import { SITE_URL } from '@/lib/site';
import { requireSession } from '../actions';

/**
 * Studio-side management of portal clients and their projects. The account
 * and project are always created first; the invite email is best-effort — a
 * dead SMTP server must not lose the setup, and the link can be re-sent (or
 * read from the server log in development) at any time.
 */

export type PortalAdminState = { error?: string; savedAt?: string };

const INVITE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_AGE_MS = 60 * 60 * 1000;

/** Builds and (best-effort) emails the set-password link for one client. */
async function sendPortalLink(clientId: string): Promise<void> {
  const client = await getClient(clientId);
  if (!client) return;

  const reset = isActivated(client);
  const token = createSetPasswordToken(
    client.id,
    client.passwordHash,
    reset ? RESET_AGE_MS : INVITE_AGE_MS
  );
  const url = `${SITE_URL}/portal/set-password?token=${encodeURIComponent(token)}`;

  if (!isEmailConfigured()) {
    // Dev convenience — the studio can copy the link from the server log.
    console.info(`[portal] set-password link for ${client.email}: ${url}`);
  }
  await sendEmail({
    to: client.email,
    replyTo: STUDIO_INBOX,
    ...portalInviteEmail({
      name: client.name,
      setPasswordUrl: url,
      expiresIn: reset ? '1 hour' : '7 days',
      reset,
    }),
  });
}

export async function addPortalClientAction(
  _prev: PortalAdminState,
  formData: FormData
): Promise<PortalAdminState> {
  await requireSession();

  const email = String(formData.get('email') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const businessName = String(formData.get('business') ?? '').trim();

  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'That email does not look right.' };
  if (name.length < 2) return { error: 'Who is the contact person?' };
  if (businessName.length < 2) return { error: 'What is the business called?' };

  const client = await createOrGetClientByEmail(email, name);
  const project = await createProject({ clientId: client.id, businessName });

  try {
    await sendPortalLink(client.id);
  } catch (err) {
    console.error('[portal] client created, but the invite email failed', err);
  }

  revalidatePath('/dashboard/portal');
  redirect(`/dashboard/portal/${project.id}`);
}

export async function updateProjectAction(
  _prev: PortalAdminState,
  formData: FormData
): Promise<PortalAdminState> {
  await requireSession();

  const id = String(formData.get('id') ?? '');
  const project = id ? await getProject(id) : null;
  if (!project) return { error: 'That project no longer exists.' };

  const businessName = String(formData.get('business') ?? '').trim();
  if (businessName.length < 2) return { error: 'The business needs a name.' };

  const liveAtRaw = String(formData.get('live_at') ?? '').trim();
  const totalRaw = String(formData.get('total_inr') ?? '').trim();
  const paidRaw = String(formData.get('paid_inr') ?? '').trim();

  const totalInr = totalRaw === '' ? null : Number(totalRaw);
  const paidInr = paidRaw === '' ? 0 : Number(paidRaw);
  if (totalInr !== null && paidInr > totalInr) {
    return { error: 'Paid cannot be more than the project total.' };
  }

  const serverAtRaw = String(formData.get('server_at') ?? '').trim();

  await updateProjectDetails(id, {
    businessName,
    liveAt: liveAtRaw || null,
    supportDays: Number(formData.get('support_days') ?? 180),
    totalInr,
    paidInr,
    siteUrl: formData.get('site_url'),
    serverAt: serverAtRaw || null,
    serverDays: Number(formData.get('server_days') ?? 365),
    statsCode: formData.get('stats_code'),
    statsToken: formData.get('stats_token'),
    seoActive: formData.get('seo_active') === 'on',
    gscProperty: formData.get('gsc_property'),
  });

  revalidatePath(`/dashboard/portal/${id}`);
  revalidatePath('/dashboard/portal');
  revalidatePath(`/portal/${id}`);
  revalidatePath(`/portal/${id}/tickets`);
  revalidatePath(`/portal/${id}/seo`);
  return { savedAt: new Date().toISOString() };
}

/**
 * Kicks off a site audit for one project without holding the request open —
 * a 100-page crawl takes a minute or two, and the runner refuses to stack a
 * second crawl while one is in flight. The page shows the run in progress
 * on its next render.
 */
export async function runSeoAuditAction(formData: FormData): Promise<void> {
  await requireSession();

  const projectId = String(formData.get('project') ?? '');
  const project = projectId ? await getProject(projectId) : null;
  if (!project?.siteUrl) return;

  const { id, siteUrl } = project;
  after(async () => {
    await runAudit(id, siteUrl);
  });

  revalidatePath(`/dashboard/portal/${projectId}`);
}

/**
 * One button for both moments: an invite for an account with no password yet
 * (7 days), a reset link for an active one (1 hour). The account's own state
 * decides which — the studio cannot send the wrong kind.
 */
export async function sendPortalLinkAction(formData: FormData): Promise<void> {
  await requireSession();

  const clientId = String(formData.get('client') ?? '');
  const projectId = String(formData.get('project') ?? '');
  if (!clientId) return;

  try {
    await sendPortalLink(clientId);
  } catch (err) {
    console.error('[portal] set-password link email failed', err);
  }
  if (projectId) revalidatePath(`/dashboard/portal/${projectId}`);
}

export type DocumentState = { error?: string; savedAt?: string };

/** Shares a document with the client — it appears on their Documents tab. */
export async function uploadDocumentAction(
  _prev: DocumentState,
  formData: FormData
): Promise<DocumentState> {
  await requireSession();

  const projectId = String(formData.get('project') ?? '');
  const project = projectId ? await getProject(projectId) : null;
  if (!project) return { error: 'That project no longer exists.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a file to share.' };
  }

  const { problem } = await saveDocument(
    project.id,
    String(formData.get('title') ?? ''),
    file
  );
  if (problem) return { error: problem };

  revalidatePath(`/dashboard/portal/${project.id}`);
  revalidatePath(`/portal/${project.id}/documents`);
  return { savedAt: new Date().toISOString() };
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get('id') ?? '');
  const projectId = String(formData.get('project') ?? '');
  if (id) await deleteDocument(id);
  if (projectId) {
    revalidatePath(`/dashboard/portal/${projectId}`);
    revalidatePath(`/portal/${projectId}/documents`);
  }
}

export async function removeProjectAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get('id') ?? '');
  if (id) await deleteProject(id);
  revalidatePath('/dashboard/portal');
  redirect('/dashboard/portal');
}
