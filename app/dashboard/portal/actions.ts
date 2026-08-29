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
import {
  cleanActivity,
  currentMonthKey,
  isMonthKey,
  monthLabel,
  parseDeliverableStatus,
  publishProblem,
} from '@/lib/seoWork';
import {
  addActivity,
  addDeliverable,
  deleteActivity,
  deleteDeliverable,
  deleteReport,
  generateReport,
  getReport,
  publishReport,
  saveReportText,
  setActivityResult,
  setDeliverableStatus,
} from '@/lib/seoRecords';
import { seoReportEmail } from '@/lib/portalEmails';
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

/* ── SEO work record (activity log · deliverables · monthly reports) ──── */

/** Both surfaces that show the record — refresh together after any change. */
function revalidateSeo(projectId: string): void {
  revalidatePath(`/dashboard/portal/${projectId}/seo`);
  revalidatePath(`/portal/${projectId}/seo`);
}

export async function addSeoActivityAction(
  _prev: PortalAdminState,
  formData: FormData
): Promise<PortalAdminState> {
  await requireSession();
  const projectId = String(formData.get('project') ?? '');
  const project = projectId ? await getProject(projectId) : null;
  if (!project) return { error: 'That project no longer exists.' };

  const cleaned = cleanActivity({
    category: formData.get('category'),
    work: formData.get('work'),
    reason: formData.get('reason'),
    evidence: formData.get('evidence'),
    result: formData.get('result'),
    happenedOn: formData.get('happened_on'),
  });
  if ('error' in cleaned) return { error: cleaned.error };

  await addActivity(project.id, cleaned.activity);
  revalidateSeo(project.id);
  return { savedAt: new Date().toISOString() };
}

export async function setActivityResultAction(formData: FormData): Promise<void> {
  await requireSession();
  const projectId = String(formData.get('project') ?? '');
  const id = String(formData.get('id') ?? '');
  if (id && projectId) {
    await setActivityResult(id, projectId, String(formData.get('result') ?? ''));
    revalidateSeo(projectId);
  }
}

export async function deleteSeoActivityAction(formData: FormData): Promise<void> {
  await requireSession();
  const projectId = String(formData.get('project') ?? '');
  const id = String(formData.get('id') ?? '');
  if (id && projectId) {
    await deleteActivity(id, projectId);
    revalidateSeo(projectId);
  }
}

export async function addSeoDeliverableAction(formData: FormData): Promise<void> {
  await requireSession();
  const projectId = String(formData.get('project') ?? '');
  const project = projectId ? await getProject(projectId) : null;
  if (!project) return;
  await addDeliverable(project.id, String(formData.get('title') ?? ''));
  revalidateSeo(project.id);
}

export async function setDeliverableStatusAction(formData: FormData): Promise<void> {
  await requireSession();
  const projectId = String(formData.get('project') ?? '');
  const id = String(formData.get('id') ?? '');
  const status = parseDeliverableStatus(formData.get('status'));
  if (id && projectId && status) {
    await setDeliverableStatus(id, projectId, status);
    revalidateSeo(projectId);
    revalidatePath(`/portal/${projectId}`); // the overview's attention strip
  }
}

export async function deleteSeoDeliverableAction(formData: FormData): Promise<void> {
  await requireSession();
  const projectId = String(formData.get('project') ?? '');
  const id = String(formData.get('id') ?? '');
  if (id && projectId) {
    await deleteDeliverable(id, projectId);
    revalidateSeo(projectId);
  }
}

export async function generateSeoReportAction(
  _prev: PortalAdminState,
  formData: FormData
): Promise<PortalAdminState> {
  await requireSession();
  const projectId = String(formData.get('project') ?? '');
  const project = projectId ? await getProject(projectId) : null;
  if (!project) return { error: 'That project no longer exists.' };

  const month = String(formData.get('month') ?? '').trim();
  if (!isMonthKey(month)) return { error: 'Pick a month.' };
  if (month > currentMonthKey()) return { error: 'That month has not happened yet.' };

  const outcome = await generateReport(project, month);
  if ('error' in outcome) return { error: outcome.error };

  revalidateSeo(project.id);
  return { savedAt: outcome.report.generatedAt };
}

/**
 * One action for the draft editor's two buttons. `intent=save` persists the
 * studio's words; `intent=publish` persists them first, then publishes —
 * so what goes out is always exactly what is on screen — and emails the
 * client best-effort. Publishing a hollow report is refused.
 */
export async function saveSeoReportAction(
  _prev: PortalAdminState,
  formData: FormData
): Promise<PortalAdminState> {
  await requireSession();
  const projectId = String(formData.get('project') ?? '');
  const id = String(formData.get('id') ?? '');
  const project = projectId ? await getProject(projectId) : null;
  const report = project && id ? await getReport(id, project.id) : null;
  if (!project || !report) return { error: 'That report no longer exists.' };
  if (report.status === 'published') {
    return { error: 'Published reports never change.' };
  }

  const summary = String(formData.get('summary') ?? '');
  const priorities = String(formData.get('priorities') ?? '');
  await saveReportText(report.id, project.id, summary, priorities);

  if (String(formData.get('intent') ?? '') !== 'publish') {
    revalidateSeo(project.id);
    return { savedAt: new Date().toISOString() };
  }

  const problem = publishProblem({ summary });
  if (problem) return { error: problem };
  const published = await publishReport(report.id, project.id);
  if (!published) return { error: 'That report is not a draft any more.' };

  const client = await getClient(project.clientId);
  if (client?.email) {
    try {
      await sendEmail({
        to: client.email,
        replyTo: STUDIO_INBOX,
        ...seoReportEmail({
          name: client.name,
          businessName: project.businessName,
          monthLabel: monthLabel(report.month),
          reportUrl: `${SITE_URL}/portal/${project.id}/seo/reports/${report.id}`,
        }),
      });
    } catch (err) {
      console.error('[seo] report published, but the client email failed', err);
    }
  }

  revalidateSeo(project.id);
  revalidatePath(`/portal/${project.id}/seo/reports/${report.id}`);
  return { savedAt: new Date().toISOString() };
}

export async function deleteSeoReportAction(formData: FormData): Promise<void> {
  await requireSession();
  const projectId = String(formData.get('project') ?? '');
  const id = String(formData.get('id') ?? '');
  if (id && projectId) {
    await deleteReport(id, projectId);
    revalidateSeo(projectId);
  }
}
