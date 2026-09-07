import { type NextRequest, NextResponse } from 'next/server';
import { milestoneSchedule, totalDue } from '@/lib/delivery';
import { listProposals } from '@/lib/proposals';
import { listPayments, paidMilestones } from '@/lib/payments';
import { toWhatsappNumber } from '@/lib/phone';
import { sendWhatsapp } from '@/lib/whatsapp';
import { paymentDueWhatsapp } from '@/lib/whatsappMessages';

export const dynamic = 'force-dynamic';

/**
 * The daily sweep that tells clients a payment has fallen due, over WhatsApp.
 *
 * Guarded by CRON_SECRET — with the secret unset the route plays dead (404),
 * so a misconfigured deployment can never be made to message clients. Same
 * guard as the renewal reminders beside it.
 *
 * **It sends one message per proposal, not one per overdue milestone.** A
 * client three payments behind gets a single message naming the total due, not
 * three separate chases — which is also how the payment page itself presents
 * it, so the figure they read here matches the button they will press.
 *
 * **It only ever messages on the day a payment first falls due.** Anything
 * older is a conversation, not a notification: a client who has not paid a
 * fortnight-old invoice does not need a fourteenth reminder, they need a phone
 * call. Nagging daily is how a business gets its number blocked, and a blocked
 * number cannot deliver the invoices either.
 *
 * Accepted proposals only, and skipped silently where there is no usable phone
 * number — the studio sees that gap on the proposal page instead.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? '';
  const given = request.headers.get('authorization') ?? '';
  if (!secret || given !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  let checked = 0;
  let sent = 0;
  let noPhone = 0;
  const skipped: string[] = [];

  for (const proposal of await listProposals()) {
    if (!proposal.acceptedAt || proposal.milestones.length === 0) continue;
    checked++;

    const settled = paidMilestones(await listPayments(proposal.slug));
    const schedule = milestoneSchedule(
      proposal.content.total,
      proposal.milestones,
      proposal.gstPercent,
      settled
    );
    const due = totalDue(schedule);
    if (!due) continue;

    // Only the day it lands. `dueDate` is a plain ISO date, so this is a
    // string compare and time zones never enter into it.
    const fellDueToday = due.rows.some((row) => row.milestone.dueDate === today);
    if (!fellDueToday) continue;

    if (!toWhatsappNumber(proposal.clientPhone)) {
      noPhone++;
      skipped.push(proposal.client);
      continue;
    }

    // Name the whole total but label it with the payment that just landed, so
    // the message is specific about what changed today.
    const landed = due.rows.find((row) => row.milestone.dueDate === today);
    const result = await sendWhatsapp(
      paymentDueWhatsapp({
        name: proposal.client,
        phone: proposal.clientPhone,
        slug: proposal.slug,
        milestoneLabel:
          due.rows.length > 1
            ? `${landed?.milestone.label} and ${due.rows.length - 1} more`
            : (landed?.milestone.label ?? 'Payment'),
        payableInr: due.payable,
      })
    );
    if (result.sent) sent++;
  }

  return NextResponse.json({
    ok: true,
    checked,
    sent,
    skippedNoPhone: noPhone,
    ...(skipped.length > 0 ? { clientsWithoutPhone: skipped } : {}),
  });
}
