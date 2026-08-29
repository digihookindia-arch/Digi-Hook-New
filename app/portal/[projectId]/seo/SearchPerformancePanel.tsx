import {
  fetchSearchPerformance,
  isSearchConsoleConfigured,
  SEARCH_WINDOW_DAYS,
} from '@/lib/searchConsole';
import type { PortalProject } from '@/lib/portalProjects';
import { displayDate, pathOf, pct, RowsTable, Stat } from './bits';

/**
 * The workspace's Google panel: clicks, impressions, CTR and average
 * position over the last 28 days of finished data, with the previous window
 * alongside, plus top queries and pages. The spec rules live here: every
 * figure names its source, period and sync time — and any gap (not yet
 * connected, Google unreachable, malformed payload) is said plainly instead
 * of being dressed up as zero.
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
        We&apos;re completing the connection to Google Search Console for your
        site. Your clicks, impressions and average position will appear here
        the moment they are real — this panel never shows placeholder numbers.
      </Note>
    );
  }

  const data = await fetchSearchPerformance(project.gscProperty);
  if (!data) {
    return (
      <Note>
        Google&apos;s Search Console isn&apos;t reachable right now, so this
        panel is waiting rather than showing a number that could be wrong.
        Check back in a little while.
      </Note>
    );
  }

  const previously = (value: string | undefined) =>
    value === undefined ? null : `previous ${SEARCH_WINDOW_DAYS} days: ${value}`;
  const caption = (
    <p className="m-0 mt-5 text-[12.5px] leading-[1.6] text-neutral-700">
      Source: Google Search Console · {displayDate(data.period.from)} –{' '}
      {displayDate(data.period.to)} (Google publishes its data a few days
      behind) · last synced{' '}
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
          Google recorded no search impressions for your site in this window.
          For a newly connected property that is normal — data starts
          gathering from the connection onwards, and the first numbers can
          take a few weeks to show.
        </p>
        {caption}
      </section>
    );
  }

  return (
    <section aria-labelledby="search-performance" className="border-2 border-text p-7">
      <h2
        id="search-performance"
        className="m-0 mb-6 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
      >
        Search performance
      </h2>

      <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-x-6 gap-y-5">
        <Stat
          label="Clicks"
          value={data.totals.clicks.toLocaleString('en-IN')}
          sub={previously(data.previousTotals?.clicks.toLocaleString('en-IN'))}
        />
        <Stat
          label="Impressions"
          value={data.totals.impressions.toLocaleString('en-IN')}
          sub={previously(data.previousTotals?.impressions.toLocaleString('en-IN'))}
        />
        <Stat
          label="Click rate"
          value={pct(data.totals.ctr)}
          sub={previously(data.previousTotals ? pct(data.previousTotals.ctr) : undefined)}
        />
        <Stat
          label="Avg. position"
          value={data.totals.position.toFixed(1)}
          sub={previously(data.previousTotals?.position.toFixed(1))}
        />
      </div>

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

      <p className="m-0 mt-6 text-[12.5px] leading-[1.6] text-neutral-700">
        &ldquo;Avg. position&rdquo; is Google&apos;s average across every search
        your site appeared in — it moves with which searches happen, not only
        with your rankings.
      </p>
      {caption}
    </section>
  );
}
