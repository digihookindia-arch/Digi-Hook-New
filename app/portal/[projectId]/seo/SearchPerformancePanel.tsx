import {
  fetchSearchPerformance,
  isSearchConsoleConfigured,
  SEARCH_WINDOW_DAYS,
  type SearchRow,
} from '@/lib/searchConsole';
import type { PortalProject } from '@/lib/portalProjects';

/**
 * The workspace's Google panel: clicks, impressions, CTR and average
 * position over the last 28 days of finished data, with the previous window
 * alongside, plus top queries and pages. The spec rules live here: every
 * figure names its source, period and sync time — and any gap (not yet
 * connected, Google unreachable, malformed payload) is said plainly instead
 * of being dressed up as zero.
 */

function displayDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

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

function Stat({
  label,
  value,
  previous,
}: {
  label: string;
  value: string;
  previous: string | null;
}) {
  return (
    <div className="border-l-2 border-neutral-300 pl-4">
      <div className="mb-1 text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
        {label}
      </div>
      <div className="font-heading text-[clamp(26px,3vw,36px)] font-extrabold leading-none tracking-[-0.03em]">
        {value}
      </div>
      {previous ? (
        <div className="mt-1.5 text-[12.5px] leading-none text-neutral-700">
          previous {SEARCH_WINDOW_DAYS} days: {previous}
        </div>
      ) : null}
    </div>
  );
}

function RowsTable({
  caption,
  keyHeader,
  rows,
  showPosition,
  toKeyLabel,
}: {
  caption: string;
  keyHeader: string;
  rows: SearchRow[];
  showPosition: boolean;
  toKeyLabel: (key: string) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="min-w-0 flex-[1_1_300px]">
      <h3 className="m-0 mb-3 text-[13px] font-bold uppercase leading-none tracking-[0.08em]">
        {caption}
      </h3>
      <table className="w-full border-collapse text-[13.5px] leading-[1.5]">
        <thead>
          <tr className="border-b-2 border-text text-left">
            <th className="py-2 pr-3 font-semibold">{keyHeader}</th>
            <th className="py-2 pr-3 text-right font-semibold">Clicks</th>
            <th className="py-2 pr-3 text-right font-semibold">Seen</th>
            {showPosition ? <th className="py-2 text-right font-semibold">Pos.</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row) => (
            <tr key={row.key} className="border-b border-neutral-300 align-top">
              <td className="max-w-0 truncate py-2 pr-3" title={toKeyLabel(row.key)}>
                {toKeyLabel(row.key)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{row.clicks.toLocaleString('en-IN')}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{row.impressions.toLocaleString('en-IN')}</td>
              {showPosition ? (
                <td className="py-2 text-right tabular-nums">{row.position.toFixed(1)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

  const pct = (ctr: number) => `${(ctr * 100).toFixed(1)}%`;
  const pathOf = (key: string) => {
    try {
      return new URL(key).pathname || '/';
    } catch {
      return key;
    }
  };
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
          previous={data.previousTotals ? data.previousTotals.clicks.toLocaleString('en-IN') : null}
        />
        <Stat
          label="Impressions"
          value={data.totals.impressions.toLocaleString('en-IN')}
          previous={
            data.previousTotals ? data.previousTotals.impressions.toLocaleString('en-IN') : null
          }
        />
        <Stat
          label="Click rate"
          value={pct(data.totals.ctr)}
          previous={data.previousTotals ? pct(data.previousTotals.ctr) : null}
        />
        <Stat
          label="Avg. position"
          value={data.totals.position.toFixed(1)}
          previous={data.previousTotals ? data.previousTotals.position.toFixed(1) : null}
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

      {data.pagesInSearch > 0 ? (
        <p className="m-0 mt-6 text-[14px] leading-[1.6] text-neutral-800">
          <span className="font-semibold">{data.pagesInSearch.toLocaleString('en-IN')}</span>{' '}
          {data.pagesInSearch === 1 ? 'page' : 'pages'} of your site appeared in
          Google results this window
          {data.pagesInSearch >= 1000 ? ' (counted up to 1,000)' : ''}.
        </p>
      ) : null}

      <p className="m-0 mt-2 text-[12.5px] leading-[1.6] text-neutral-700">
        &ldquo;Avg. position&rdquo; is Google&apos;s average across every search
        your site appeared in — it moves with which searches happen, not only
        with your rankings.
      </p>
      {caption}
    </section>
  );
}
