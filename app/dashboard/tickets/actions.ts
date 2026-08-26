'use server';

import { revalidatePath } from 'next/cache';
import {
  addMessage,
  cleanBody,
  getTicket,
  isTicketStatus,
  setTicketStatus,
} from '@/lib/tickets';
import { getClient } from '@/lib/clients';
import { ticketReplyEmail } from '@/lib/portalEmails';
import { sendEmail, STUDIO_INBOX } from '@/lib/email';
import { SITE_URL } from '@/lib/site';
import { requireSession } from '../actions';

/**
 * Studio-side ticket actions. Replies append to the thread and email the
 * client; the message is saved first and the email is best-effort, same as
 * everywhere else in this app.
 */

export type ReplyState = { error?: string; savedAt?: string };

export async function replyToTicketAction(
  _prev: ReplyState,
  formData: FormData
): Promise<ReplyState> {
  await requireSession();

  const id = String(formData.get('id') ?? '');
  const body = cleanBody(formData.get('body'));
  if (!body) return { error: 'Write the reply first.' };

  const ticket = id ? await getTicket(id) : null;
  if (!ticket) return { error: 'That ticket no longer exists.' };

  await addMessage(ticket.id, 'studio', body);

  try {
    const client = await getClient(ticket.clientId);
    if (client) {
      await sendEmail({
        to: client.email,
        replyTo: STUDIO_INBOX,
        ...ticketReplyEmail({
          name: client.name,
          subject: ticket.subject,
          replyBody: body,
          ticketId: ticket.id,
          portalUrl: `${SITE_URL}/portal/${ticket.projectId}/tickets/${ticket.id}`,
        }),
      });
    }
  } catch (err) {
    console.error('[tickets] reply saved, but the client email failed', err);
  }

  revalidatePath(`/dashboard/tickets/${ticket.id}`);
  revalidatePath('/dashboard/tickets');
  revalidatePath(`/portal/${ticket.projectId}/tickets/${ticket.id}`);
  return { savedAt: new Date().toISOString() };
}

export async function setTicketStatusAction(formData: FormData): Promise<void> {
  await requireSession();

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !isTicketStatus(status)) return;

  const ticket = await getTicket(id);
  if (!ticket) return;

  await setTicketStatus(id, status);
  revalidatePath(`/dashboard/tickets/${id}`);
  revalidatePath('/dashboard/tickets');
  revalidatePath(`/portal/${ticket.projectId}/tickets/${id}`);
}
