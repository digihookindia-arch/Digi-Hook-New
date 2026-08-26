'use server';

import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  CLIENT_COOKIE,
  CLIENT_SESSION_MAX_AGE,
  createClientSessionToken,
  createSetPasswordToken,
  hashPassword,
  verifyClientSessionToken,
  verifyPassword,
  verifySetPasswordToken,
} from '@/lib/auth';
import {
  getClient,
  getClientByEmail,
  setClientPassword,
  type Client,
} from '@/lib/clients';
import { getProject, type PortalProject } from '@/lib/portalProjects';
import { supportState } from '@/lib/support';
import {
  addMessage,
  cleanBody,
  cleanSubject,
  createTicket,
  getTicket,
  parseKind,
  setTicketStatus,
  TICKET_KIND_LABELS,
} from '@/lib/tickets';
import { portalInviteEmail, ticketReceivedEmail } from '@/lib/portalEmails';
import { isEmailConfigured, sendEmail, STUDIO_INBOX } from '@/lib/email';
import { SITE_URL } from '@/lib/site';

/**
 * Client-portal server actions. The middleware only checks that a cookie
 * exists; every action and page here re-verifies the signature — the same
 * rule as the dashboard's `requireSession()`.
 *
 * Sign-in and the password flows never reveal whether an email has an
 * account: unknown address, wrong password and not-yet-activated all read
 * identically from outside.
 */

const secureCookie = process.env.NODE_ENV === 'production';

/** The signed-in client, or a bounce to the login page. */
export async function requireClient(): Promise<Client> {
  const store = await cookies();
  const clientId = verifyClientSessionToken(store.get(CLIENT_COOKIE)?.value);
  const client = clientId ? await getClient(clientId) : null;
  if (!client) redirect('/portal/login');
  return client;
}

/**
 * The signed-in client's own project, or a 404. notFound rather than a
 * redirect on a wrong owner — a guessed id must not learn that it exists.
 */
export async function portalProject(
  projectId: string
): Promise<{ client: Client; project: PortalProject }> {
  const client = await requireClient();
  const project = await getProject(projectId);
  if (!project || project.clientId !== client.id) notFound();
  return { client, project };
}

/* ── auth ──────────────────────────────────────────────────────────────── */

const SIGN_IN_ERROR =
  "Check your email and password, or use 'Forgotten password' below.";

export async function clientSignIn(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };

  const client = await getClientByEmail(email);
  // An empty stored hash (invited, never activated) fails verification too,
  // so all three failure modes share one message.
  if (!client || !verifyPassword(password, client.passwordHash)) {
    return { error: SIGN_IN_ERROR };
  }

  const store = await cookies();
  store.set(CLIENT_COOKIE, createClientSessionToken(client.id), {
    httpOnly: true,
    secure: secureCookie,
    sameSite: 'lax',
    path: '/',
    maxAge: CLIENT_SESSION_MAX_AGE,
  });
  redirect('/portal');
}

export async function clientSignOut(): Promise<void> {
  const store = await cookies();
  store.delete(CLIENT_COOKIE);
  redirect('/portal/login');
}

const RESET_MESSAGE =
  'If that email has a portal account, a password link is on its way. It is valid for 1 hour.';

export async function requestPasswordReset(
  _prev: { done?: string; error?: string },
  formData: FormData
): Promise<{ done?: string; error?: string }> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Enter your email address.' };

  const client = await getClientByEmail(email);
  if (client) {
    const token = createSetPasswordToken(client.id, client.passwordHash, 60 * 60 * 1000);
    const url = `${SITE_URL}/portal/set-password?token=${encodeURIComponent(token)}`;
    try {
      if (!isEmailConfigured()) {
        // Dev convenience only — the studio can hand the link over by phone.
        console.info(`[portal] password link for ${client.email}: ${url}`);
      }
      await sendEmail({
        to: client.email,
        replyTo: STUDIO_INBOX,
        ...portalInviteEmail({
          name: client.name,
          setPasswordUrl: url,
          expiresIn: '1 hour',
          reset: true,
        }),
      });
    } catch (err) {
      console.error('[portal] password reset email failed', err);
    }
  }
  // The same answer whether or not the account exists.
  return { done: RESET_MESSAGE };
}

export async function setPasswordAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 10) {
    return { error: 'Use at least 10 characters.' };
  }
  if (password !== confirm) {
    return { error: 'The two passwords do not match.' };
  }

  // The token names its account; the signature is then checked against that
  // account's *current* hash, which is what makes a used link dead.
  const claimedId = token.split('.')[0] ?? '';
  const client = claimedId ? await getClient(claimedId) : null;
  const clientId = client
    ? verifySetPasswordToken(token, client.passwordHash)
    : null;
  if (!client || !clientId) {
    return {
      error:
        'This link has been used or has expired — request a new one from the sign-in page.',
    };
  }

  await setClientPassword(client.id, hashPassword(password));

  // Setting a password proves control of the email, so it signs you in.
  const store = await cookies();
  store.set(CLIENT_COOKIE, createClientSessionToken(client.id), {
    httpOnly: true,
    secure: secureCookie,
    sameSite: 'lax',
    path: '/',
    maxAge: CLIENT_SESSION_MAX_AGE,
  });
  redirect('/portal');
}

/* ── tickets ───────────────────────────────────────────────────────────── */

export type TicketFormState = { error?: string };

export async function createTicketAction(
  _prev: TicketFormState,
  formData: FormData
): Promise<TicketFormState> {
  const projectId = String(formData.get('project') ?? '');
  const { client, project } = await portalProject(projectId);

  const kind = parseKind(String(formData.get('kind') ?? ''));
  const subject = cleanSubject(formData.get('subject'));
  const body = cleanBody(formData.get('body'));
  if (!subject) return { error: 'Give the ticket a short subject.' };
  if (!body) return { error: 'Describe what you need in the message.' };

  // Stamped now, from the window as it stands today. Feature requests are
  // never flagged — they are quotable work regardless of the support plan.
  const outOfSupport =
    kind === 'support' &&
    supportState(project.liveAt, project.supportDays).state === 'ended';

  const ticket = await createTicket({
    projectId: project.id,
    clientId: client.id,
    kind,
    subject,
    body,
    outOfSupport,
  });

  // Saved first; the emails are best-effort. Losing a notification is a
  // smaller problem than losing the ticket.
  const portalUrl = `${SITE_URL}/portal/${project.id}/tickets/${ticket.id}`;
  try {
    await Promise.all([
      sendEmail({
        to: client.email,
        replyTo: STUDIO_INBOX,
        ...ticketReceivedEmail({
          name: client.name,
          kind,
          subject,
          ticketId: ticket.id,
          portalUrl,
          outOfSupport,
        }),
      }),
      sendEmail({
        to: STUDIO_INBOX,
        replyTo: client.email,
        subject: `${outOfSupport ? '[OUT OF SUPPORT] ' : ''}${TICKET_KIND_LABELS[kind]} — ${project.businessName}: ${subject}`,
        body: [
          `${TICKET_KIND_LABELS[kind]} from ${client.name} (${client.email})`,
          `Business: ${project.businessName}`,
          ...(outOfSupport
            ? ['OUT OF SUPPORT — needs a quote before work starts.']
            : []),
          '',
          subject,
          '',
          body,
          '',
          `Reply in the dashboard: ${SITE_URL}/dashboard/tickets/${ticket.id}`,
        ].join('\n'),
      }),
    ]);
  } catch (err) {
    console.error('[portal] ticket saved, but notification email failed', err);
  }

  revalidatePath(`/portal/${project.id}/tickets`);
  revalidatePath(`/portal/${project.id}/features`);
  revalidatePath('/dashboard/tickets');
  redirect(portalUrl.replace(SITE_URL, ''));
}

export async function clientReplyAction(
  _prev: TicketFormState,
  formData: FormData
): Promise<TicketFormState> {
  const client = await requireClient();
  const ticketId = String(formData.get('ticket') ?? '');
  const body = cleanBody(formData.get('body'));
  if (!body) return { error: 'Write a message first.' };

  const ticket = ticketId ? await getTicket(ticketId) : null;
  if (!ticket || ticket.clientId !== client.id) notFound();

  await addMessage(ticket.id, 'client', body);
  // Answering puts the ball back with the studio: a waiting_client ticket has
  // been answered, and a closed one is being reopened — either way it must
  // land back in the awaiting-reply count, which excludes closed tickets.
  if (ticket.status === 'waiting_client' || ticket.status === 'closed') {
    await setTicketStatus(ticket.id, 'open');
  }

  try {
    await sendEmail({
      to: STUDIO_INBOX,
      replyTo: client.email,
      subject: `Client replied — ${ticket.subject}`,
      body: [
        `${client.name} replied on "${ticket.subject}":`,
        '',
        body,
        '',
        `Reply in the dashboard: ${SITE_URL}/dashboard/tickets/${ticket.id}`,
      ].join('\n'),
    });
  } catch (err) {
    console.error('[portal] reply saved, but studio alert failed', err);
  }

  revalidatePath(`/portal/${ticket.projectId}/tickets/${ticket.id}`);
  revalidatePath('/dashboard/tickets');
  revalidatePath(`/dashboard/tickets/${ticket.id}`);
  return {};
}
