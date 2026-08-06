'use server';

import { formatInr, BUDGET_RULES, TYPE_QUESTION } from '@/content/quote';
import { sendEmail, STUDIO_INBOX } from '@/lib/email';
import { validateAndPruneQuoteAnswers, type QuoteSource } from '@/lib/quote';
import { saveQuoteLead, type QuoteLead } from '@/lib/quoteLeads';
import { SITE_URL } from '@/lib/site';

export type QuoteSubmitResult = { ok: true } | { ok: false; error: string };

/**
 * Save first, notify second — same rule as the contact enquiry: a failed
 * email must never lose a lead, so the notification failure is logged and
 * swallowed.
 */
export async function submitQuoteLead(payload: {
  answers: unknown;
  source?: QuoteSource;
}): Promise<QuoteSubmitResult> {
  const result = validateAndPruneQuoteAnswers(payload?.answers);
  if (!result.ok) return { ok: false, error: result.error };

  let lead: QuoteLead;
  try {
    lead = await saveQuoteLead({ answers: result.answers, source: payload.source });
  } catch (e) {
    console.error('[get-quote] failed to save lead', e);
    return { ok: false, error: 'Could not save your details.' };
  }

  try {
    await notify(lead);
  } catch (e) {
    console.error('[get-quote] lead saved but notification failed', lead.id, e);
  }

  return { ok: true };
}

function budgetLine(lead: QuoteLead): string {
  if (lead.budgetAgreed === 'yes') {
    const rule = BUDGET_RULES[lead.websiteType];
    return rule
      ? `Accepted the ${formatInr(rule.min)}-${formatInr(rule.max)} range`
      : 'Accepted the displayed range';
  }
  const amount = parseInt(lead.budget, 10);
  return Number.isFinite(amount) ? `Their own number: ${formatInr(amount)}` : lead.budget;
}

async function notify(lead: QuoteLead): Promise<void> {
  const typeLabel =
    TYPE_QUESTION.options.find((o) => o.id === lead.websiteType)?.title ?? lead.websiteType;

  await sendEmail({
    to: STUDIO_INBOX,
    subject: `New quote lead — ${lead.name} · ${typeLabel}`,
    body: [
      `${lead.name} (${lead.business}) asked for a quote.`,
      '',
      `Type: ${typeLabel}`,
      `Budget: ${budgetLine(lead)}`,
      `WhatsApp: +91 ${lead.phone}`,
      `Preferred time: ${lead.contactTime}`,
      '',
      `Full answers: ${SITE_URL}/dashboard/quote-leads`,
    ].join('\n'),
  });
}
