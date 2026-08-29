import {
  fetchSearchPerformance,
  isSearchConsoleConfigured,
  SEARCH_WINDOW_DAYS,
} from '@/lib/searchConsole';
import type { PortalProject } from '@/lib/portalProjects';
import { displayDate, pathOf, pct, RowsTable, Stat } from './bits';
import { Columns, Delta } from './charts';

/**
 * Search performance as an analyst would read it: a KPI row with movement
 * deltas against the previous 28 days, daily clicks and impressions as two
 * single-axis column charts (never one dual-axis chart), and the top
 * query/page tables. Prose is confined to captions; any gap states itself
 * plainly instead of dressing up as zero.
 */

const heading = (
  <h2 className="m-0 mb-5 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
    Search performance
  </h2>
);

function Note({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-2 border-text p-7">
      {heading}
      <p className="m-0 max-w-[58ch] text-[15px] leading-[1.65] text-neutral-800">{children}</p>
    </section>
  );
}

export async function SearchPerformancePanel({ project }: { project: PortalProject }) {
  if (!isSearchConsoleConfigured() || !project.gscProperty) {
    return (
      <Note>
        Connecting to Google Search Console — clicks, impressions and position
        data plot here the moment they are real. No placeholder numbers, ever.
      </Note>
    );
  }

  const data = await fetchSearchPerformance(project.gscProperty);
  if (!data) {
    return (
      <Note>
        Google&apos;s Search Console isn&apos;t reachable right now — this
        panel waits rather than plotting a number that could be wrong.
      </Note>
    );
  }

  const caption = (
    <p className="m-0 mt-5 text-[12.5px] leading-[1.6] text-neutral-700">
      Source: Google Search Console · {displayDate(data.period.from)} –{' '}
      {displayDate(data.period.to)} vs the {SEARCH_WINDOW_DAYS} days before ·
      Google publishes a few days behind · synced{' '}
      {new Date(data.fetchedAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })}
      .
    </p>
  );

  if (!data.totals) {
    return (
      <section className="border-2 border-text p-7">
        {heading}
        <p className="m-0 max-w-[58ch] text-[15px] leading-[1.65] text-neutral-800">
          No search impressions recorded in this window — normal for a newly
          connected property; the first series can take weeks to build.
        </p>
        {caption}
      </section>
    );
  }

  const totals = data.totals;
  const prev = data.previousTotals;

  return (
    <section aria-labelledby="search-performance" className="border-2 border-text p-7">
      <h2
        id="search-performance"
        className="m-0 mb-6 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
      >
        Search performance
      </h2>

      {/* KPI row with movement vs the previous window */}
      <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-x-6 gap-y-5">
        <Stat
          label="Clicks"
          value={totals.clicks.toLocaleString('en-IN')}
          sub={null}
          beside={<Delta now={totals.clicks} prev={prev?.clicks ?? null} />}
        />
        <Stat
          label="Impressions"
          value={totals.impressions.toLocaleString('en-IN')}
          sub={null}
          beside={<Delta now={totals.impressions} prev={prev?.impressions ?? null} />}
        />
        <Stat
          label="Click rate"
          value={pct(totals.ctr)}
          sub={prev ? `was ${pct(prev.ctr)}` : null}
        />
        <Stat
          label="Avg. position"
          value={totals.position.toFixed(1)}
          sub={null}
          beside={
            <Delta
              now={Math.round(totals.position * 10)}
              prev={prev ? Math.round(prev.position * 10) : null}
              lowerBetter
              format={(n) => (n / 10).toFixed(1)}
            />
          }
        />
      </div>

      {/* Daily series — two single-axis charts, never one dual-axis */}
      {data.daily.length > 1 ? (
        <div className="mb-7 flex flex-wrap gap-x-10 gap-y-6">
          <Columns
            heading="Clicks / day"
            headingValue={totals.clicks.toLocaleString('en-IN')}
            ariaLabel={`Daily clicks, ${displayDate(data.period.from)} to ${displayDate(data.period.to)}`}
            points={data.daily.map((d) => ({ label: displayDate(d.date), value: d.clicks }))}
          />
          <Columns
            heading="Impressions / day"
            headingValue={totals.impressions.toLocaleString('en-IN')}
            ariaLabel={`Daily impressions, ${displayDate(data.period.from)} to ${displayDate(data.period.to)}`}
            points={data.daily.map((d) => ({
              label: displayDate(d.date),
              value: d.impressions,
            }))}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-10 gap-y-6">
        <RowsTable
          caption="What people searched"
          keyHeader="Query"
          rows={data.topQueries}
          showPosition
          toKeyLabel={(key) => key}
        />
        <RowsTable
          caption="Where they landed"
          keyHeader="Page"
          rows={data.topPages}
          showPosition={false}
          toKeyLabel={pathOf}
        />
      </div>

      <p className="m-0 mt-5 text-[12.5px] leading-[1.6] text-neutral-700">
        &ldquo;Avg. position&rdquo; is Google&apos;s average across every search
        you appeared in — it moves with which searches happen, not only with
        rankings.
      </p>
      {caption}
    </section>
  );
}
