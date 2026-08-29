import { isRankDataConfigured } from '@/lib/dataForSeo';
import { fetchSearchPerformance, isSearchConsoleConfigured } from '@/lib/searchConsole';
import { listAudits } from '@/lib/seoAudits';
import {
  pillarCounts,
  pillarSummaryLine,
  type IssueSeverity,
  type PillarCounts,
} from '@/lib/seoAudit';
import {
  latestPageSpeed,
  latestRanks,
  latestStanding,
  listOffpage,
  type StandingSnapshot,
} from '@/lib/seoRecords';
import type { PortalProject } from '@/lib/portalProjects';
import { ScoreRow } from '@/components/ScoreRings';
import { displayDate, pathOf, PsiRow, Stat } from './bits';
import { Columns, Delta, RankSpark, SEVERITY_CHART, StackedBar, SeverityColumns } from './charts';

/**
 * The four pillars, chart-first: a keyword table with sparklines and
 * movement glyphs, the Lighthouse rings, severity bars, issue-count trend
 * columns and off-page KPIs. Clients read marks and counts, not
 * paragraphs — and never itemised issue lists (those are dashboard-only).
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

const severitySegments = (counts: Record<IssueSeverity, number>) => [
  { label: SEVERITY_CHART.error.label, value: counts.error, chip: SEVERITY_CHART.error.chip },
  {
    label: SEVERITY_CHART.warning.label,
    value: counts.warning,
    chip: SEVERITY_CHART.warning.chip,
  },
  {
    label: SEVERITY_CHART.notice.label,
    value: counts.notice,
    chip: SEVERITY_CHART.notice.chip,
  },
];

/** Severity counts as a bar, or the all-clear line when there is nothing to plot. */
function SeverityRead({
  counts,
  ariaLabel,
}: {
  counts: Record<IssueSeverity, number>;
  ariaLabel: string;
}) {
  if (counts.error + counts.warning + counts.notice === 0) {
    return (
      <p className="m-0 text-[14.5px] font-semibold leading-[1.5]">
        All clear — nothing needs fixing.
      </p>
    );
  }
  return (
    <div>
      <StackedBar segments={severitySegments(counts)} ariaLabel={ariaLabel} />
      <p className="m-0 mt-2 text-[13px] leading-[1.55] text-neutral-700">
        {pillarSummaryLine(counts)}
      </p>
    </div>
  );
}

/** The domain's visibility split — page one in accent, the long tail in grey. */
function StandingBar({ standing }: { standing: StandingSnapshot }) {
  return (
    <StackedBar
      ariaLabel={`Search visibility: ${standing.keywordsTop3} searches in the top 3, ${standing.keywordsTop10 - standing.keywordsTop3} more on page one, ${Math.max(0, standing.keywordsTop100 - standing.keywordsTop10)} further back in the top 100`}
      segments={[
        { label: 'Top 3', value: standing.keywordsTop3, chip: 'bg-accent-700' },
        {
          label: 'Rest of page one',
          value: Math.max(0, standing.keywordsTop10 - standing.keywordsTop3),
          chip: 'bg-accent-500',
        },
        {
          label: 'Positions 11–100',
          value: Math.max(0, standing.keywordsTop100 - standing.keywordsTop10),
          chip: 'bg-neutral-500',
        },
      ]}
    />
  );
}

export { StandingBar };

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
          Connecting live rank tracking — positions plot here the moment real
          checks run. No placeholder numbers, ever.
        </p>
      ) : ranks.length === 0 ? (
        <p className={noteClass}>
          Target keyword list in progress — once agreed, every keyword&apos;s
          position and its movement is tracked here weekly.
        </p>
      ) : checked.length === 0 ? (
        <p className={noteClass}>
          Keyword list set — the first rank check runs this week.
        </p>
      ) : (
        <table className="w-full border-collapse text-[13.5px] leading-[1.5]">
          <thead>
            <tr className="border-b-2 border-text text-left">
              <th className="py-2 pr-3 font-semibold">Keyword</th>
              <th className="py-2 pr-3 text-right font-semibold">Today</th>
              <th className="py-2 pr-3 text-right font-semibold">~30d ago</th>
              <th className="py-2 pr-3 text-right font-semibold">Change</th>
              <th className="py-2 pr-3 text-right font-semibold">Trend</th>
              <th className="py-2 text-right font-semibold">Page</th>
            </tr>
          </thead>
          <tbody>
            {ranks.map((rank) => (
              <tr key={rank.keyword.id} className="border-b border-neutral-300 align-middle">
                <td className="py-2 pr-3">{rank.keyword.keyword}</td>
                <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                  {rank.latest ? (rank.latest.position ?? '100+') : '—'}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-neutral-700">
                  {rank.baseline ? (rank.baseline.position ?? '100+') : '—'}
                </td>
                <td className="py-2 pr-3 text-right">
                  <Delta
                    now={rank.latest?.position ?? (rank.latest ? 101 : null)}
                    prev={rank.baseline ? (rank.baseline.position ?? 101) : null}
                    lowerBetter
                  />
                </td>
                <td className="py-2 pr-3 text-right">
                  <RankSpark
                    points={rank.history.map((check) => ({
                      label: displayDate(check.checkedOn),
                      position: check.position,
                    }))}
                  />
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

      {standing ? (
        <div className="mt-6">
          <div className="mb-2 text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
            Search visibility · {standing.keywordsTop100.toLocaleString('en-IN')} searches show
            your site in the top 100
          </div>
          <StandingBar standing={standing} />
        </div>
      ) : null}

      {search?.totals ? (
        <p className="m-0 mt-4 text-[13px] leading-[1.6] text-neutral-700">
          Search Console average position:{' '}
          <span className="font-semibold text-text">{search.totals.position.toFixed(1)}</span> —
          Google&apos;s average across every appearance; a different measure
          from the fixed-location checks above.
        </p>
      ) : null}

      <p className={captionClass}>
        {checked.length > 0 && latestDate
          ? `Checked ${displayDate(latestDate)} · ${project.rankLocation || 'India'} · mobile · live Google results via DataForSEO · "—" = under 30 days of history.`
          : 'Source: live Google results via DataForSEO · weekly once tracking is live.'}
      </p>
    </section>
  );
}

export async function TechnicalPanel({ project }: { project: PortalProject }) {
  const [psi, runs] = await Promise.all([
    latestPageSpeed(project.id),
    listAudits(project.id, 8),
  ]);
  const done = runs.filter((run) => run.status === 'done' && run.summary).reverse();
  const latest = done[done.length - 1] ?? null;
  const counts: PillarCounts | null = latest ? pillarCounts(latest.summary!.issues) : null;
  const fullScores =
    psi &&
    psi.scores.performance !== null &&
    psi.scores.accessibility !== null &&
    psi.scores.bestPractices !== null &&
    psi.scores.seo !== null;

  return (
    <section aria-labelledby="seo-technical" className="border-2 border-text p-7">
      {kicker('seo-technical', 'Technical SEO')}

      {psi ? (
        <>
          {fullScores ? (
            <ScoreRow
              scores={{
                performance: psi.scores.performance!,
                accessibility: psi.scores.accessibility!,
                bestPractices: psi.scores.bestPractices!,
                seo: psi.scores.seo!,
              }}
              size="clamp(64px, 9vw, 96px)"
              labelSize="10.5px"
              className="max-w-[520px]"
            />
          ) : (
            <PsiRow scores={psi.scores} />
          )}
          <p className="m-0 mt-3 text-[12.5px] leading-[1.6] text-neutral-700">
            Google PageSpeed Insights (pagespeed.web.dev) · mobile · measured{' '}
            {displayDate(psi.fetchedAt)}.
          </p>
        </>
      ) : (
        <p className={noteClass}>
          Google is measuring your site — the PageSpeed scores land here
          shortly.
        </p>
      )}

      <div className="mt-6">
        <div className="mb-2 text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
          Weekly crawl · technical checks
        </div>
        {counts ? (
          <SeverityRead
            counts={counts.technical}
            ariaLabel="Technical findings by severity"
          />
        ) : (
          <p className={noteClass}>The first pass over your site runs within the week.</p>
        )}
      </div>

      {done.length > 1 ? (
        <div className="mt-6">
          <div className="mb-2 text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
            Findings per pass · last {done.length} audits
          </div>
          <SeverityColumns
            ariaLabel={`Issue counts across the last ${done.length} audit passes`}
            points={done.map((run) => ({
              label: displayDate(run.startedAt),
              values: {
                error: run.errors,
                warning: run.warnings,
                notice: run.notices,
              },
            }))}
          />
        </div>
      ) : null}

      {latest ? (
        <p className={captionClass}>
          {latest.pages} pages checked {displayDate(latest.finishedAt ?? latest.startedAt)} ·
          crawling, links, security, indexability · respects your robots.txt.
        </p>
      ) : null}
    </section>
  );
}

export async function OnPagePanel({ project }: { project: PortalProject }) {
  const [runs, search] = await Promise.all([
    listAudits(project.id, 1),
    isSearchConsoleConfigured() && project.gscProperty
      ? fetchSearchPerformance(project.gscProperty)
      : Promise.resolve(null),
  ]);
  const latest = runs.find((run) => run.status === 'done' && run.summary) ?? null;
  const counts: PillarCounts | null = latest ? pillarCounts(latest.summary!.issues) : null;

  return (
    <section aria-labelledby="seo-onpage" className="border-2 border-text p-7">
      {kicker('seo-onpage', 'On-page SEO')}

      <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
        <div className="min-w-0 flex-[2_1_280px]">
          <div className="mb-2 text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
            Titles · descriptions · headings · content
          </div>
          {counts ? (
            <SeverityRead counts={counts.on_page} ariaLabel="On-page findings by severity" />
          ) : (
            <p className={noteClass}>The first check over your pages runs within the week.</p>
          )}
        </div>
        {search && search.pagesInSearch > 0 ? (
          <Stat
            label="Pages in Google results"
            value={search.pagesInSearch.toLocaleString('en-IN')}
            sub="last 28 days"
          />
        ) : null}
      </div>

      <p className={captionClass}>
        Page-level optimisation is agreed under deliverables and logged below
        with its reasoning.
      </p>
    </section>
  );
}

export async function OffpagePanel({ project }: { project: PortalProject }) {
  const snapshots = await listOffpage(project.id, 12);
  const [latest, previous] = snapshots;
  const series = [...snapshots].reverse();

  return (
    <section aria-labelledby="seo-offpage" className="border-2 border-text p-7">
      {kicker('seo-offpage', 'Off-page SEO')}

      {!isRankDataConfigured() ? (
        <p className={noteClass}>
          Connecting the link index — backlink and referring-domain counts plot
          here once the first real snapshot lands.
        </p>
      ) : !latest ? (
        <p className={noteClass}>The first off-page snapshot lands with the next monthly pass.</p>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-x-6 gap-y-5">
            <Stat
              label="Backlinks"
              value={latest.backlinks.toLocaleString('en-IN')}
              sub={previous ? `was ${previous.backlinks.toLocaleString('en-IN')}` : null}
              beside={<Delta now={latest.backlinks} prev={previous?.backlinks ?? null} />}
            />
            <Stat
              label="Referring domains"
              value={latest.referringDomains.toLocaleString('en-IN')}
              sub={
                previous ? `was ${previous.referringDomains.toLocaleString('en-IN')}` : null
              }
              beside={
                <Delta
                  now={latest.referringDomains}
                  prev={previous?.referringDomains ?? null}
                />
              }
            />
          </div>

          {series.length > 2 ? (
            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-6">
              <Columns
                heading="Referring domains / snapshot"
                headingValue={latest.referringDomains.toLocaleString('en-IN')}
                ariaLabel={`Referring domains across ${series.length} monthly snapshots`}
                points={series.map((s) => ({
                  label: displayDate(s.checkedOn),
                  value: s.referringDomains,
                }))}
              />
            </div>
          ) : null}

          <p className={captionClass}>
            Source: DataForSEO link index · snapshot {displayDate(latest.checkedOn)} ·
            monthly. Link building we do is logged in the work record with
            evidence.
          </p>
        </>
      )}
    </section>
  );
}
