import { type NextRequest, NextResponse } from 'next/server';
import { STUDIO_INBOX, sendEmail } from '@/lib/email';
import {
  getEnquiryByExternalId,
  markWelcomed,
  saveEnquiry,
  type Enquiry,
} from '@/lib/enquiries';
import { fetchLeadSheet, isLeadSheetConfigured, type SheetLead } from '@/lib/leadSheet';
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
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? '';
  const given = request.headers.get('authorization') ?? '';
  if (!secret || given !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 404 });
  }

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

    const enquiry = await saveEnquiry({
      service: lead.service || 'Website (Meta lead ad)',
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company || null,
      // A lead ad gives a name and a number, nothing more. The brief is what
      // the thank-you message is asking them for.
      answers: {},
      summary: summaryFor(lead),
      source: 'sheet',
      externalId: lead.externalId,
    });
    imported++;

    if (await welcome(enquiry)) welcomed++;
  }

  return NextResponse.json({
    ok: true,
    rows: sheet.leads.length,
    imported,
    alreadyKnown: already,
    welcomed,
    unusableRows: sheet.skipped,
  });
}

/** What the studio sees on the lead before anyone has spoken to them. */
function summaryFor(lead: SheetLead): { label: string; value: string }[] {
  return [
    { label: 'Source', value: 'Meta lead ad' },
    ...(lead.service ? [{ label: 'Interested in', value: lead.service }] : []),
    ...(lead.company ? [{ label: 'Business', value: lead.company }] : []),
    ...(lead.createdAt ? [{ label: 'Submitted', value: lead.createdAt }] : []),
    {
      label: 'Brief',
      value:
        'Not given — a lead ad collects contact details only. The automatic reply asks what they are looking to build.',
    },
  ];
}

/**
 * The thank-you, on both channels, once. Claims the right to send *before*
 * sending: a duplicate message to a stranger is worse than a missed one, so
 * the stamp is taken first and a failure afterwards is not retried.
 */
async function welcome(enquiry: Enquiry): Promise<boolean> {
  if (!(await markWelcomed(enquiry.id))) return false;

  await sendWhatsapp(newLeadWhatsapp({ name: enquiry.name, phone: enquiry.phone }));

  if (enquiry.email) {
    try {
      await sendEmail({
        to: enquiry.email,
        ...newLeadEmail({ name: enquiry.name }),
        replyTo: STUDIO_INBOX,
      });
    } catch (e) {
      console.error('[leads] welcome email failed', enquiry.id, e);
    }
  }
  return true;
}
