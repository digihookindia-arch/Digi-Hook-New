import { type NextRequest, NextResponse } from 'next/server';
import { STUDIO_INBOX, sendEmail } from '@/lib/email';
import {
  getEnquiryByExternalId,
  markWelcomed,
  saveEnquiry,
  type Enquiry,
} from '@/lib/enquiries';
import {
  fetchLeadSheet,
  isLeadSheetConfigured,
  isReadingPublicly,
  type SheetLead,
} from '@/lib/leadSheet';
import { newLeadEmail } from '@/lib/milestoneEmails';
import { sendWhatsapp } from '@/lib/whatsapp';
import { newLeadWhatsapp } from '@/lib/whatsappMessages';

export const dynamic = 'force-dynamic';

/**
 * Pulls new Meta lead-ad rows out of the studio's sheet, files them as
 * enquiries, and sends each new person a thank-you that asks what they are
 * looking for.
 *
 * Guarded by CRON_SECRET — with the secret unset the route plays dead (404),
 * so a misconfigured deployment can never be made to message strangers.
 *
 * **Read-only against the sheet, and idempotent.** Meta's row id is the dedupe
 * key and carries a unique index, so a row already imported is recognised and
 * left alone: the studio's status and notes on that lead are never trampled by
 * a later sync. A sheet that cannot be read returns null and this does
 * nothing — "unknown" must not be mistaken for "no new leads".
 *
 * **The welcome goes exactly once**, and only after the lead is safely stored.
 * `markWelcomed` is a conditional write, so two syncs overlapping cannot both
 * message the same person — the losing one gets false and stays quiet. Messaging
 * a stranger twice is the failure mode worth engineering against here; the
 * first message is unsolicited enough.
 *
 * ## Three modes, because the first run is not like the others
 *
 * - `?dry=1` reads the sheet and reports what it *would* do. Writes nothing,
 *   sends nothing. This is how you look at a sheet before trusting it.
 * - `?backfill=1` imports without messaging, stamping each lead as already
 *   welcomed so no later run picks it up either. **This is the correct first
 *   run against an existing sheet.** The thank-you says a team member will
 *   call within one working day; sending that to somebody who enquired six
 *   weeks ago and heard nothing is worse than staying quiet, and on WhatsApp
 *   it is how a business number gets reported. The backlog belongs in the
 *   dashboard as leads to work by hand, not in 67 people's phones.
 * - No parameter: the steady state. New rows only, each welcomed once.
 *
 * The modes are deliberately not inferred. "Is the database empty?" would make
 * the behaviour depend on a condition nobody checked, and the one run that
 * matters is the one where getting it wrong cannot be taken back.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? '';
  const given = request.headers.get('authorization') ?? '';
  if (!secret || given !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 404 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';
  const backfill = request.nextUrl.searchParams.get('backfill') === '1';

  if (!isLeadSheetConfigured()) {
    return NextResponse.json({ ok: false, reason: 'lead sheet not configured' });
  }

  const sheet = await fetchLeadSheet();
  if (!sheet) {
    // Deliberately not `imported: 0` — the sheet was unreadable, which is a
    // different fact and one somebody should notice.
    return NextResponse.json({ ok: false, reason: 'could not read the sheet' }, { status: 200 });
  }

  let imported = 0;
  let already = 0;
  let welcomed = 0;

  for (const lead of sheet.leads) {
    const existing = await getEnquiryByExternalId(lead.externalId);
    if (existing) {
      already++;
      continue;
    }

    // Counted as it would have been imported, then left alone. A dry run that
    // wrote "just the one row" would not be a dry run.
    if (dry) {
      imported++;
      continue;
    }

    const enquiry = await saveEnquiry({
      // The form's own first question, so the dashboard groups these the way
      // the website enquiries are already grouped.
      service: lead.answers[0]?.value || 'Website',
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: null,
      // The form's answers are the brief. `answers` is the enquiry form's own
      // branching shape and does not fit a lead ad, so the summary carries it
      // — which is also what the Draft-proposal button pastes in.
      answers: {},
      summary: summaryFor(lead),
      source: 'sheet',
      externalId: lead.externalId,
    });
    imported++;

    // Claim the welcome without sending it. The same conditional write, so a
    // normal run afterwards finds the stamp already set and stays quiet — the
    // backlog is closed to messaging permanently, not just for this pass.
    if (backfill) {
      await markWelcomed(enquiry.id);
      continue;
    }

    // The first answer is the website type, which the reply names back.
    if (await welcome(enquiry, lead.answers[0]?.value ?? '')) welcomed++;
  }

  return NextResponse.json({
    ok: true,
    mode: dry ? 'dry — nothing written, nothing sent' : backfill ? 'backfill — imported without messaging' : 'live',
    rows: sheet.leads.length,
    [dry ? 'wouldImport' : 'imported']: imported,
    alreadyKnown: already,
    welcomed,
    unusableRows: sheet.skipped,
    testLeadsIgnored: sheet.testLeads,
    ...(isReadingPublicly() ? { warning: 'sheet is being read with no credentials' } : {}),
  });
}

/**
 * The brief, as the person actually filled it in. This is what the studio
 * reads before ringing, and what the Draft-proposal button pastes into a new
 * proposal — so the form's answers come first and the ad attribution last.
 */
function summaryFor(lead: SheetLead): { label: string; value: string }[] {
  return [
    ...lead.answers,
    { label: 'Source', value: sourceLine(lead) },
    ...(lead.createdAt ? [{ label: 'Submitted', value: lead.createdAt }] : []),
  ];
}

function sourceLine(lead: SheetLead): string {
  const where =
    lead.platform === 'ig'
      ? 'Instagram'
      : lead.platform === 'fb'
        ? 'Facebook'
        : lead.platform || 'Meta';
  return lead.campaign ? `${where} lead ad — ${lead.campaign}` : `${where} lead ad`;
}

/**
 * The thank-you, on both channels, once. Claims the right to send *before*
 * sending: a duplicate message to a stranger is worse than a missed one, so
 * the stamp is taken first and a failure afterwards is not retried.
 */
async function welcome(enquiry: Enquiry, wants: string): Promise<boolean> {
  if (!(await markWelcomed(enquiry.id))) return false;

  await sendWhatsapp(
    newLeadWhatsapp({ name: enquiry.name, phone: enquiry.phone, wants })
  );

  if (enquiry.email) {
    try {
      await sendEmail({
        to: enquiry.email,
        ...newLeadEmail({ name: enquiry.name, wants }),
        replyTo: STUDIO_INBOX,
      });
    } catch (e) {
      console.error('[leads] welcome email failed', enquiry.id, e);
    }
  }
  return true;
}
