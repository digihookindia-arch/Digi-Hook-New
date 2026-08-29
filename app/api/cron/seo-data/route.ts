import { type NextRequest, NextResponse } from 'next/server';
import { listProjects } from '@/lib/portalProjects';
import {
  runBacklinks,
  runPageSpeed,
  runRankChecks,
  runStanding,
} from '@/lib/seoRecords';

export const dynamic = 'force-dynamic';

/**
 * The daily measurement sweep, called by the VPS crontab. Guarded by
 * CRON_SECRET — unset, the route plays dead — like the other cron routes.
 *
 * The cadences live in the runners, not the crontab, so a daily call yields
 * the right rhythm for each source and a failed day simply retries:
 * PageSpeed refreshes past 20 hours, rank checks past 6 days, the domain
 * standing and backlinks past 27 days. PageSpeed and the standing run for
 * EVERY project with a site (the locked page's live proof needs them);
 * ranks and backlinks only for SEO subscribers. The vendor runners carry
 * their own spend cap.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? '';
  const given = request.headers.get('authorization') ?? '';
  if (!secret || given !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 404 });
  }

  const outcomes: Record<string, Record<string, string>> = {};
  for (const project of await listProjects()) {
    if (!project.siteUrl) continue;

    const forProject: Record<string, string> = {
      pagespeed: await runPageSpeed(project),
      standing: await runStanding(project),
    };
    if (project.seoActive) {
      forProject.ranks = await runRankChecks(project);
      forProject.backlinks = await runBacklinks(project);
    }
    outcomes[project.id] = forProject;
  }

  return NextResponse.json({ checked: Object.keys(outcomes).length, outcomes });
}
