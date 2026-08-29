import { isRankDataConfigured } from '@/lib/dataForSeo';
import { fetchSearchPerformance, isSearchConsoleConfigured } from '@/lib/searchConsole';
import { latestAudit } from '@/lib/seoAudits';
import { pillarCounts, pillarSummaryLine, type PillarCounts } from '@/lib/seoAudit';
import {
  latestPageSpeed,
  latestRanks,
  latestStanding,
  listOffpage,
  type StandingSnapshot,
} from '@/lib/seoRecords';
import type { PortalProject } from '@/lib/portalProjects';
import { displayDate, pathOf, PsiRow, Stat } from './bits';

/**
 * The workspace's four pillars — Google ranking, technical, on-page,
 * off-page — each summarised for the client: statuses, counts and real
 * numbers with their sources, never itemised issue lists (those live in
 * the studio dashboard; the work log is the client-facing evidence).
 * Every gap states itself plainly instead of dressing up as zero.
 */

function kicker(id: string, text: string) {
  return (
    <h2
      id={id}
      className="m-0 mb-5 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
    >
      {text}
    </h2>
  );
}

const noteClass = 'm-0 max-w-[58ch] text-[15px] leading-[1.65] text-neutral-800';
const captionClass = 'm-0 mt-5 text-[12.5px] leading-[1.6] text-neutral-700';

/** "Your site appears in Google's top 100 for N searches…" — shared line. */
export function standingLine(standing: StandingSnapshot): string {
  return `Your site appears in Google's top 100 for ${standing.keywordsTop100.toLocaleString('en-IN')} ${
    standing.keywordsTop100 === 1 ? 'search' : 'searches'
  } — ${standing.keywordsTop10.toLocaleString('en-IN')} of them on page one.`;
}

/** How one keyword moved against its ~30-day baseline, in plain words. */
function movementLabel(
  latest: number | null,
  baseline: { position: number | null } | null
): string {
  if (!baseline) return '—';
  if (latest !== null && baseline.position !== null) {
    const diff = baseline.position - latest;
    if (diff > 0) return `up ${diff}`;
    if (diff < 0) return `down ${-diff}`;
    return 'steady';
  }
  if (latest !== null && baseline.position === null) return 'into the top 100';
  if (latest === null && baseline.position !== null) return 'out of the top 100';
  return 'steady';
}

export async function RankingPanel({ project }: { project: PortalProject }) {
  const [ranks, standing, search] = await Promise.all([
    latestRanks(project.id),
    latestStanding(project.id),
    isSearchConsoleConfigured() && project.gscProperty
      ? fetchSearchPerformance(project.gscProperty)
      : Promise.resolve(null),
  ]);
  const checked = ranks.filter((rank) => rank.latest !== null);
  const latestDate = checked
    .map((rank) => rank.latest!.checkedOn)
    .sort()
    .at(-1);

  return (
    <section aria-labelledby="seo-ranking" className="border-2 border-text p-7">
      {kicker('seo-ranking', 'Google ranking')}

      {!isRankDataConfigured() ? (
        <p className={noteClass}>
          We&apos;re connecting live rank tracking for your keywords. Positions
          appear here the moment real checks run — this panel never shows
          placeholder numbers.
        </p>
      ) : ranks.length === 0 ? (
        <p className={noteClass}>
          We&apos;re finalising your target keyword list. Once it is agreed,
          every keyword&apos;s position — and how it moves — is tracked here
          weekly.
        </p>
      ) : checked.length === 0 ? (
        <p className={noteClass}>
          Your keyword list is set — the first rank check runs this week.
        </p>
      ) : (
        <table className="w-full border-collapse text-[13.5px] leading-[1.5]">
          <thead>
            <tr className="border-b-2 border-text text-left">
              <th className="py-2 pr-3 font-semibold">Keyword</th>
              <th className="py-2 pr-3 text-right font-semibold">Today</th>
              <th className="py-2 pr-3 text-right font-semibold">~30 days ago</th>
              <th className="py-2 pr-3 text-right font-semibold">Change</th>
              <th className="py-2 text-right font-semibold">Page</th>
            </tr>
          </thead>
          <tbody>
            {ranks.map((rank) => (
              <tr key={rank.keyword.id} className="border-b border-neutral-300 align-top">
                <td className="py-2 pr-3">{rank.keyword.keyword}</td>
                <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                  {rank.latest ? (rank.latest.position ?? '100+') : '—'}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {rank.baseline ? (rank.baseline.position ?? '100+') : '—'}
                </td>
                <td className="py-2 pr-3 text-right">
                  {rank.latest ? movementLabel(rank.latest.position, rank.baseline) : '—'}
                </td>
                <td
                  className="max-w-0 truncate py-2 text-right text-neutral-700"
                  title={rank.latest?.foundUrl ?? ''}
                >
                  {rank.latest?.foundUrl ? pathOf(rank.latest.foundUrl) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {checked.length > 0 && checked.some((rank) => !rank.baseline) ? (
        <p className="m-0 mt-3 text-[13px] leading-[1.6] text-neutral-700">
          &ldquo;—&rdquo; in the comparison column means tracking is younger
          than a month there — the movement figure starts once 30 days of
          history exist.
        </p>
      ) : null}

      {standing ? (
        <p className="m-0 mt-5 text-[14px] leading-[1.6] text-neutral-800">
          {standingLine(standing)}
        </p>
      ) : null}
      {search?.totals ? (
        <p className="m-0 mt-2 text-[13px] leading-[1.6] text-neutral-700">
          Google Search Console average position:{' '}
          <span className="font-semibold">{search.totals.position.toFixed(1)}</span> — Google&apos;s
          own average across every search you appeared in, a different measure
          from the fixed-location checks above.
        </p>
      ) : null}

      <p className={captionClass}>
        {checked.length > 0 && latestDate
          ? `Checked ${displayDate(latestDate)} · location: ${project.rankLocation || 'India'} · mobile · source: live Google results via DataForSEO.`
          : 'Source: live Google results via DataForSEO · checked weekly once tracking is live.'}
      </p>
    </section>
  );
}

export async function TechnicalPanel({ project }: { project: PortalProject }) {
  const [psi, audit] = await Promise.all([
    latestPageSpeed(project.id),
    latestAudit(project.id),
  ]);
  const counts: PillarCounts | null =
    audit?.status === 'done' && audit.summary ? pillarCounts(audit.summary.issues) : null;

  return (
    <section aria-labelledby="seo-technical" className="border-2 border-text p-7">
      {kicker('seo-technical', 'Technical SEO')}

      {psi ? (
        <>
          <PsiRow scores={psi.scores} />
          <p className="m-0 mt-3 text-[12.5px] leading-[1.6] text-neutral-700">
            Scores by Google PageSpeed Insights (pagespeed.web.dev) · mobile ·
            measured {displayDate(psi.fetchedAt)}.
          </p>
        </>
      ) : (
        <p className={noteClass}>
          Google is measuring your site — the PageSpeed scores land here
          shortly.
        </p>
      )}

      <p className="m-0 mt-5 text-[14.5px] leading-[1.6] text-neutral-800">
        <span className="font-semibold">Our weekly crawl:</span>{' '}
        {counts
          ? pillarSummaryLine(counts.technical)
          : 'the first pass over your site runs within the week.'}
      </p>
      {audit?.status === 'done' ? (
        <p className={captionClass}>
          {audit.pages} pages checked {displayDate(audit.finishedAt ?? audit.startedAt)} ·
          crawling, links, security and indexability · respects your robots.txt.
        </p>
      ) : null}
    </section>
  );
}

export async function OnPagePanel({ project }: { project: PortalProject }) {
  const [audit, search] = await Promise.all([
    latestAudit(project.id),
    isSearchConsoleConfigured() && project.gscProperty
      ? fetchSearchPerformance(project.gscProperty)
      : Promise.resolve(null),
  ]);
  const counts: PillarCounts | null =
    audit?.status === 'done' && audit.summary ? pillarCounts(audit.summary.issues) : null;

  return (
    <section aria-labelledby="seo-onpage" className="border-2 border-text p-7">
      {kicker('seo-onpage', 'On-page SEO')}

      <p className="m-0 text-[14.5px] leading-[1.6] text-neutral-800">
        <span className="font-semibold">Titles, descriptions, headings and content:</span>{' '}
        {counts
          ? pillarSummaryLine(counts.on_page)
          : 'the first check over your pages runs within the week.'}
      </p>

      {search && search.pagesInSearch > 0 ? (
        <p className="m-0 mt-4 text-[14px] leading-[1.6] text-neutral-800">
          <span className="font-semibold">
            {search.pagesInSearch.toLocaleString('en-IN')}
          </span>{' '}
          {search.pagesInSearch === 1 ? 'page' : 'pages'} of your site appeared
          in Google results in the last 28 days
          {search.pagesInSearch >= 1000 ? ' (counted up to 1,000)' : ''}.
        </p>
      ) : null}

      <p className={captionClass}>
        Optimisation work on specific pages is agreed under deliverables and
        logged below, with its reasoning.
      </p>
    </section>
  );
}

export async function OffpagePanel({ project }: { project: PortalProject }) {
  const snapshots = await listOffpage(project.id, 2);
  const [latest, previous] = snapshots;

  return (
    <section aria-labelledby="seo-offpage" className="border-2 border-text p-7">
      {kicker('seo-offpage', 'Off-page SEO')}

      {!isRankDataConfigured() ? (
        <p className={noteClass}>
          We&apos;re connecting the link index for your site. Your backlink and
          referring-domain counts appear here once the first real snapshot
          lands.
        </p>
      ) : !latest ? (
        <p className={noteClass}>
          The first off-page snapshot lands with the next monthly pass.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-x-6 gap-y-5">
            <Stat
              label="Backlinks"
              value={latest.backlinks.toLocaleString('en-IN')}
              sub={previous ? `last snapshot: ${previous.backlinks.toLocaleString('en-IN')}` : null}
            />
            <Stat
              label="Referring domains"
              value={latest.referringDomains.toLocaleString('en-IN')}
              sub={
                previous
                  ? `last snapshot: ${previous.referringDomains.toLocaleString('en-IN')}`
                  : null
              }
            />
          </div>
          <p className={captionClass}>
            Source: DataForSEO link index · snapshot {displayDate(latest.checkedOn)} ·
            refreshed monthly. Link building we do ourselves is logged in the
            work record with its evidence.
          </p>
        </>
      )}
    </section>
  );
}
