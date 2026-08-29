import { type NextRequest, NextResponse } from 'next/server';
import { listProjects, type PortalProject } from '@/lib/portalProjects';
import { getClient } from '@/lib/clients';
import { supportState } from '@/lib/support';
import { dueThreshold, recordReminder, wasReminded, type ReminderKind } from '@/lib/renewals';
import { renewalReminderEmail } from '@/lib/portalEmails';
import { sendEmail, STUDIO_INBOX } from '@/lib/email';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * The daily renewal-reminder sweep, called by the VPS crontab. Guarded by
 * CRON_SECRET — with the secret unset the route plays dead (404), so a
 * misconfigured deployment can never be made to spam clients.
 *
 * Each reminder fires once per band (30/15/7/1 days, plus once at expiry),
 * per window end-date: recording happens only after a successful send, so a
 * failed email retries tomorrow, and extending a window re-arms the ladder.
 * Idempotent by design — running it twice a day sends nothing twice.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? '';
  const given = request.headers.get('authorization') ?? '';
  if (!secret || given !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 404 });
  }

  let checked = 0;
  let sent = 0;
  const failures: string[] = [];

  for (const project of await listProjects()) {
    checked++;
    const client = await getClient(project.clientId);
    if (!client || !client.email) continue;

    const windows: { kind: ReminderKind; startAt: string | null; days: number }[] = [
      { kind: 'support', startAt: project.liveAt, days: project.supportDays },
      { kind: 'server', startAt: project.serverAt, days: project.serverDays },
    ];

    for (const window of windows) {
      const state = supportState(window.startAt, window.days);

      let threshold: number | null = null;
      let daysLeft = 0;
      let endsOn = '';
      if (state.state === 'active') {
        threshold = dueThreshold(state.daysLeft);
        daysLeft = state.daysLeft;
        endsOn = state.endsOn;
      } else if (state.state === 'ended') {
        threshold = 0;
        endsOn = state.endedOn;
      }
      if (threshold === null || !endsOn) continue;
      if (await wasReminded(project.id, window.kind, threshold, endsOn)) continue;

      try {
        await sendEmail({
          to: client.email,
          replyTo: STUDIO_INBOX,
          ...renewalReminderEmail({
            name: client.name,
            businessName: project.businessName,
            kind: window.kind,
            daysLeft,
            endsOn,
            portalUrl: `${SITE_URL}/portal/${project.id}`,
          }),
        });
        await sendEmail({
          to: STUDIO_INBOX,
          replyTo: client.email,
          subject: `Renewal reminder sent — ${project.businessName} (${window.kind}, ${threshold === 0 ? 'expired' : `${threshold}-day band`})`,
          body: [
            `${project.businessName}: the ${window.kind} window ${threshold === 0 ? 'has ended' : `ends on ${endsOn}`}.`,
            `Client ${client.name} (${client.email}) was reminded just now.`,
            '',
            `Project: ${SITE_URL}/dashboard/portal/${project.id}`,
          ].join('\n'),
        });
        await recordReminder(project.id, window.kind, threshold, endsOn);
        sent++;
      } catch (err) {
        console.error('[cron] renewal reminder failed', project.id, window.kind, err);
        failures.push(`${project.id}:${window.kind}`);
      }
    }
  }

  return NextResponse.json({ checked, sent, failures });
}
