'use server';

import { revalidatePath } from 'next/cache';
import {
  addMessage,
  ATTACHMENTS_PER_MESSAGE,
  attachmentProblem,
  cleanBody,
  cleanQuoteInr,
  getTicket,
  isTicketStatus,
  setQuote,
  setQuotePaid,
  setTicketStatus,
} from '@/lib/tickets';
import { saveMessageAttachments } from '@/lib/attachments';
import { getClient } from '@/lib/clients';
import { quoteSentEmail, ticketReplyEmail } from '@/lib/portalEmails';
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

  const files = (formData.getAll('files') as File[]).filter((f) => f && f.size > 0);
  if (files.length > ATTACHMENTS_PER_MESSAGE) {
    return { error: `Up to ${ATTACHMENTS_PER_MESSAGE} files per message.` };
  }
  for (const file of files) {
    const problem = attachmentProblem(file.type, file.size);
    if (problem) return { error: problem };
  }

  const message = await addMessage(ticket.id, 'studio', body);
  if (message && files.length > 0) {
    try {
      await saveMessageAttachments(ticket.id, message.id, files);
    } catch (err) {
      console.error('[tickets] reply saved, but an attachment failed to store', err);
    }
  }

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

export type QuoteState = { error?: string; savedAt?: string };

/**
 * Sends (or revises) a quote on a feature request: persisted first, then
 * the client is emailed with the amount and an approve link. Approval
 * happens only client-side in the portal — the studio never approves on a
 * client's behalf here.
 */
export async function sendQuoteAction(
  _prev: QuoteState,
  formData: FormData
): Promise<QuoteState> {
  await requireSession();

  const id = String(formData.get('id') ?? '');
  const ticket = id ? await getTicket(id) : null;
  if (!ticket) return { error: 'That ticket no longer exists.' };

  const quoteInr = cleanQuoteInr(formData.get('quote_inr'));
  if (quoteInr === null) return { error: 'Give the quote a whole rupee amount.' };
  const quoteNote = String(formData.get('quote_note') ?? '').trim();

  await setQuote(ticket.id, quoteInr, quoteNote);

  try {
    const client = await getClient(ticket.clientId);
    if (client) {
      await sendEmail({
        to: client.email,
        replyTo: STUDIO_INBOX,
        ...quoteSentEmail({
          name: client.name,
          subject: ticket.subject,
          quoteInr,
          quoteNote,
          ticketId: ticket.id,
          portalUrl: `${SITE_URL}/portal/${ticket.projectId}/tickets/${ticket.id}`,
        }),
      });
    }
  } catch (err) {
    console.error('[tickets] quote saved, but the client email failed', err);
  }

  revalidatePath(`/dashboard/tickets/${ticket.id}`);
  revalidatePath('/dashboard/tickets');
  revalidatePath(`/portal/${ticket.projectId}/tickets/${ticket.id}`);
  revalidatePath(`/portal/${ticket.projectId}`);
  return { savedAt: new Date().toISOString() };
}

/** Records payment against an approved quote — bookkeeping, not a gateway. */
export async function setQuotePaidAction(formData: FormData): Promise<void> {
  await requireSession();

  const id = String(formData.get('id') ?? '');
  const ticket = id ? await getTicket(id) : null;
  if (!ticket) return;

  await setQuotePaid(id, String(formData.get('paid') ?? '') === 'yes');
  revalidatePath(`/dashboard/tickets/${id}`);
  revalidatePath(`/portal/${ticket.projectId}/tickets/${id}`);
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
