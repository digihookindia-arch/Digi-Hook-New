import { fetchSiteStats, isStatsConfigured } from '@/lib/stats';
import type { PortalProject } from '@/lib/portalProjects';

function displayDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Visitors' page views over the last 30 days, from the studio's own
 * GoatCounter. Hidden entirely until the project has a stats site — and on
 * any fetch trouble, because a broken chart is worse than none.
 */
export async function TrafficPanel({ project }: { project: PortalProject }) {
  if (!isStatsConfigured() || !project.statsCode || !project.statsToken) return null;
  const stats = await fetchSiteStats(project.statsCode, project.statsToken);
  if (!stats) return null;

  // Hand-drawn sparkline: one polyline in a stretched viewBox. No chart
  // library — the design system's rules (flat, accent, no radius) hold here.
  const max = Math.max(1, ...stats.daily);
  const n = Math.max(2, stats.daily.length);
  const points = stats.daily
    .map((value, i) => `${(i / (n - 1)) * 100},${36 - (value / max) * 32}`)
    .join(' ');

  return (
    <section aria-labelledby="traffic-heading" className="border-2 border-text p-7">
      <h2
        id="traffic-heading"
        className="m-0 mb-5 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
      >
        Website traffic
      </h2>

      <div className="mb-1 font-heading text-[clamp(34px,4vw,48px)] font-extrabold leading-none tracking-[-0.04em]">
        {stats.pageviews.toLocaleString('en-IN')}
      </div>
      <p className="m-0 mb-5 text-[15px] leading-[1.6] text-neutral-800">
        page views in the last 30 days.
      </p>

      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Daily page views, ${displayDate(stats.from)} to ${displayDate(stats.to)}`}
        className="h-12 w-full"
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          className="text-accent"
        />
        <line
          x1="0"
          y1="39"
          x2="100"
          y2="39"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          className="text-neutral-300"
        />
      </svg>
      <p className="m-0 mt-3 text-[12.5px] leading-[1.6] text-neutral-700">
        {displayDate(stats.from)} – {displayDate(stats.to)} · measured on your
        website by our own analytics, no cookies involved.
      </p>
    </section>
  );
}
