'use server';

import { detailQuestions } from '@/content/enquiry';
import { sendEmail, STUDIO_INBOX } from '@/lib/email';
import { milestoneEmailHtml, shortReference } from '@/lib/emailTemplate';
import { saveEnquiry, type Enquiry } from '@/lib/enquiries';
import { site, SITE_URL } from '@/lib/site';
import {
  isServiceKey,
  questionsFor,
  pruneAnswers,
  validateEnquiry,
  summarise,
  type Answers,
  type EnquiryState,
} from '@/lib/enquiry';

/**
 * Enquiry server action.
 *
 * A `'use server'` module may only export async functions — the schema, types
 * and pure logic live in `@/content/enquiry` and `@/lib/enquiry`, which the
 * client renderer imports too. Both sides therefore agree on which questions
 * exist and when they show.
 */

export async function submitEnquiry(
  _prev: EnquiryState,
  formData: FormData
): Promise<EnquiryState> {
  // Honeypot: hidden from people, filled by bots. Answer with the success
  // shape so the bot learns nothing about why it failed.
  const trap = formData.get('company_website');
  if (typeof trap === 'string' && trap.trim()) {
    return { status: 'success', errors: {} };
  }

  const service = formData.get('service');
  if (!isServiceKey(service)) {
    return {
      status: 'error',
      errors: { service: 'Please choose what you need first.' },
    };
  }

  // Read only fields the schema knows about — never iterate the raw FormData.
  const answers: Answers = {};
  for (const q of [...questionsFor(service), ...detailQuestions]) {
    if (q.type === 'multi') {
      const picked = formData
        .getAll(q.id)
        .filter((v): v is string => typeof v === 'string' && v !== '');
      if (picked.length) answers[q.id] = picked;
    } else {
      const value = formData.get(q.id);
      if (typeof value === 'string' && value.trim()) answers[q.id] = value.trim();
    }
  }

  // Re-derive visibility server-side, so answers to questions the visitor was
  // never shown are dropped rather than trusted.
  const pruned = pruneAnswers(service, answers);
  for (const q of detailQuestions) {
    const value = answers[q.id];
    if (value !== undefined) pruned[q.id] = value;
  }

  const errors = validateEnquiry(service, pruned);
  if (Object.keys(errors).length > 0) {
    return { status: 'error', errors };
  }

  const str = (id: string) => {
    const v = pruned[id];
    return typeof v === 'string' ? v : '';
  };

  // Persist first. If this fails the visitor must be told, because nothing
  // else in the system will have a record of them.
  let enquiry;
  try {
    enquiry = await saveEnquiry({
      service,
      name: str('name'),
      email: str('email'),
      phone: str('phone'),
      company: str('company'),
      answers: pruned,
      summary: summarise(service, pruned),
    });
  } catch (err) {
    console.error('[enquiry] could not be saved', err);
    return {
      status: 'error',
      errors: {
        form: 'Something went wrong saving your brief. Please call +91 98736 74517 and we will take the details directly.',
      },
    };
  }

  // Email is best-effort on purpose: the brief is already safe in the database,
  // and telling someone their enquiry failed when we actually have it would
  // cost a lead over a missing acknowledgement.
  try {
    await notify(enquiry);
  } catch (err) {
    console.error('[enquiry] saved, but notification email failed', err);
  }

  return { status: 'success', errors: {} };
}

/** Acknowledgement to the client, and the brief to the studio. */
async function notify(enquiry: Enquiry): Promise<void> {
  const brief = enquiry.summary
    .map((r) => `  ${r.label}: ${r.value}`)
    .join('\n');

  await Promise.all([
    sendEmail({
      to: enquiry.email,
      replyTo: STUDIO_INBOX,
      subject: 'We have your project brief — Digi Hook',
      body: [
        `Hi ${enquiry.name.split(' ')[0]},`,
        '',
        'Thank you for sending your requirements. They have reached our team and nothing more is needed from you right now.',
        '',
        'What happens next: we read the brief properly, and send you a written proposal covering scope, the technology we would use and why, a stage-by-stage timeline and the costs. If anything in your brief needs a conversation first, we will call you on the number you gave us.',
        '',
        'You will hear from us within 24 hours.',
        '',
        `If you need us sooner, call ${site.phoneDisplay}.`,
        '',
        '— The team at Digi Hook',
        site.addressLine,
      ].join('\n'),
      html: milestoneEmailHtml({
        preheader: 'Your enquiry has reached us. A member of the team will reply within 24 hours — no action needed.',
        kicker: 'Enquiry received',
        headline: "We'll get back<br>to you within<br>24 hours.",
        leadHeading: 'Thank you for getting in touch.',
        leadBody:
          'Your enquiry has reached us and is with the team. Nothing is needed from you in the meantime — this email is your confirmation.',
        detailLeftLabel: 'Response time',
        detailLeftValue: '24 hours',
        detailRightLabel: 'Reference',
        detailRightValue: shortReference(enquiry.id),
        step: 1,
        ctaText: 'Visit our website',
        ctaHref: SITE_URL,
        secondaryLine: `Or write to us directly at <a href="mailto:${site.email}" style="color:#b02510;text-decoration:underline;">${site.email}</a>.`,
      }),
    }),

    sendEmail({
      to: STUDIO_INBOX,
      replyTo: enquiry.email,
      subject: `New enquiry — ${enquiry.name}${enquiry.company ? ` (${enquiry.company})` : ''} · ${enquiry.service}`,
      body: [
        `${enquiry.name} · ${enquiry.email} · ${enquiry.phone}`,
        enquiry.company ? `Company: ${enquiry.company}` : null,
        `Service: ${enquiry.service}`,
        '',
        'Brief:',
        brief,
        '',
        `Open in the dashboard: ${SITE_URL}/dashboard/enquiries/${enquiry.id}`,
      ]
        .filter((l) => l !== null)
        .join('\n'),
    }),
  ]);
}
