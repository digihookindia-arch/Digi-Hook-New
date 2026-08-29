import { type NextRequest, NextResponse } from 'next/server';
import { listProjects } from '@/lib/portalProjects';
import { latestAudit, runAudit } from '@/lib/seoAudits';

export const dynamic = 'force-dynamic';

/**
 * The weekly site-audit sweep for SEO-subscribed projects, called by the VPS
 * crontab. Guarded by CRON_SECRET the same way as /api/cron/reminders — with
 * the secret unset the route plays dead.
 *
 * Idempotent by freshness, not by schedule: a project audited in the last
 * five days is skipped, so a daily crontab still yields weekly audits and a
 * rerun after a failure actually retries. Crawls run one at a time — the
 * audits are guests on client sites and this server shares its box.
 *
 * A full pass can take minutes; point the crontab straight at the Node port
 * (127.0.0.1:3001), not through nginx and its proxy timeout.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? '';
  const given = request.headers.get('authorization') ?? '';
  if (!secret || given !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 404 });
  }

  const FRESH_MS = 5 * 24 * 60 * 60 * 1000;
  let checked = 0;
  let audited = 0;
  const skipped: string[] = [];
  const failures: string[] = [];

  for (const project of await listProjects()) {
    if (!project.seoActive || !project.siteUrl) continue;
    checked++;

    const last = await latestAudit(project.id);
    if (last?.status === 'running') {
      skipped.push(`${project.id}:running`);
      continue;
    }
    if (
      last?.status === 'done' &&
      last.finishedAt &&
      Date.now() - Date.parse(last.finishedAt) < FRESH_MS
    ) {
      skipped.push(`${project.id}:fresh`);
      continue;
    }

    const run = await runAudit(project.id, project.siteUrl);
    if (run?.status === 'done') audited++;
    else failures.push(project.id);
  }

  return NextResponse.json({ checked, audited, skipped, failures });
}
