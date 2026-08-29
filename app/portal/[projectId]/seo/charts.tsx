import type { IssueSeverity } from '@/lib/seoAudit';

/**
 * The SEO tab's chart primitives — flat, token-coloured, server-rendered,
 * no chart library and no client JS (native title tooltips carry the
 * per-mark values). Built to the dataviz method with the house system as
 * its parameters: one hue for magnitude, accent + de-emphasis grey where
 * one part is the point, thin marks with 2px surface gaps, radius 0,
 * values and labels always in ink tokens — never in the mark colour.
 *
 * Charts here never invent data: a caller with nothing to plot renders an
 * honest note instead of an empty chart.
 */

/* ── severity + emphasis palette (validated, see dataviz skill) ────────── */

/**
 * Ordered severity: the fixable classes wear the accent hue dark→mid; the
 * advisory class wears the de-emphasis grey on purpose — notices are
 * context, not alarms. Identity is never colour-alone: every stacked bar
 * ships its labelled counts as the legend.
 */
export const SEVERITY_CHART: Record<
  IssueSeverity,
  { chip: string; label: string }
> = {
  error: { chip: 'bg-accent-700', label: 'Critical' },
  warning: { chip: 'bg-accent-500', label: 'Warnings' },
  notice: { chip: 'bg-neutral-500', label: 'Notices' },
};

export type BarSegment = {
  label: string;
  value: number;
  /** A bg-* token class — the segment fill. */
  chip: string;
};

/* ── stacked horizontal bar + labelled legend ──────────────────────────── */

/**
 * Part-to-whole in one glance: proportional segments over a neutral track,
 * 2px surface gaps, counts printed in ink beside their chips. Zero-value
 * segments keep their legend entry (an honest zero) but paint nothing.
 */
export function StackedBar({
  segments,
  ariaLabel,
}: {
  segments: BarSegment[];
  ariaLabel: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex h-3.5 w-full gap-[2px] bg-neutral-200"
      >
        {total > 0
          ? segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <div
                  key={s.label}
                  title={`${s.label}: ${s.value.toLocaleString('en-IN')}`}
                  className={s.chip}
                  style={{ width: `${(s.value / total) * 100}%` }}
                />
              ))
          : null}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <span
            key={s.label}
            className="inline-flex items-center gap-1.5 text-[12.5px] leading-none text-neutral-800"
          >
            <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 ${s.chip}`} />
            {s.label}{' '}
            <span className="font-semibold tabular-nums">{s.value.toLocaleString('en-IN')}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── column chart (single series) ──────────────────────────────────────── */

export type ColumnPoint = { label: string; value: number };

/**
 * One measure over time as thin columns — single hue, baseline anchored,
 * 2px gaps, the peak annotated in ink (selective direct labels), every
 * column carrying its value as a native tooltip. One axis by design; two
 * measures means two of these side by side, never a dual axis.
 */
export function Columns({
  points,
  ariaLabel,
  heading,
  headingValue,
}: {
  points: ColumnPoint[];
  ariaLabel: string;
  /** Small ink title above the plot, e.g. "Clicks / day". */
  heading: string;
  /** The headline figure printed beside the heading, e.g. the total. */
  headingValue: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));

  return (
    <div className="min-w-0 flex-[1_1_260px]">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
          {heading}
        </span>
        <span className="font-heading text-[17px] font-bold leading-none tracking-[-0.02em]">
          {headingValue}
        </span>
      </div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative flex h-24 items-end gap-[2px] border-b border-neutral-300"
      >
        <span className="absolute right-0 top-0 text-[10.5px] leading-none text-neutral-600">
          peak {max.toLocaleString('en-IN')}
        </span>
        {points.map((p, i) => (
          <div
            key={`${p.label}-${i}`}
            title={`${p.label}: ${p.value.toLocaleString('en-IN')}`}
            className="min-w-0 max-w-10 flex-1 bg-accent"
            style={{ height: `${(p.value / max) * 100}%` }}
          />
        ))}
      </div>
      {points.length > 1 ? (
        <div className="mt-1 flex justify-between text-[10.5px] leading-none text-neutral-600">
          <span>{points[0]!.label}</span>
          <span>{points[points.length - 1]!.label}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ── stacked columns (severity over runs) ──────────────────────────────── */

export type StackedColumnPoint = {
  label: string;
  values: Record<IssueSeverity, number>;
};

/** Issue counts per audit pass, stacked by severity — the fixing-over-time read. */
export function SeverityColumns({
  points,
  ariaLabel,
}: {
  points: StackedColumnPoint[];
  ariaLabel: string;
}) {
  const totals = points.map((p) => p.values.error + p.values.warning + p.values.notice);
  const max = Math.max(1, ...totals);
  const order: IssueSeverity[] = ['notice', 'warning', 'error']; // bottom-up: error sits on the baseline

  return (
    <div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative flex h-24 items-end gap-[3px] border-b border-neutral-300"
      >
        <span className="absolute right-0 top-0 text-[10.5px] leading-none text-neutral-600">
          peak {max}
        </span>
        {points.map((p, i) => (
          <div
            key={`${p.label}-${i}`}
            title={`${p.label}: ${p.values.error} critical, ${p.values.warning} warnings, ${p.values.notice} notices`}
            className="flex min-w-0 max-w-10 flex-1 flex-col-reverse gap-[2px]"
            style={{ height: `${(totals[i]! / max) * 100}%` }}
          >
            {totals[i] === 0 ? (
              <div className="h-[2px] bg-neutral-300" />
            ) : (
              order.map((severity) =>
                p.values[severity] > 0 ? (
                  <div
                    key={severity}
                    className={SEVERITY_CHART[severity].chip}
                    style={{ flexGrow: p.values[severity] }}
                  />
                ) : null
              )
            )}
          </div>
        ))}
      </div>
      {points.length > 1 ? (
        <div className="mt-1 flex justify-between text-[10.5px] leading-none text-neutral-600">
          <span>{points[0]!.label}</span>
          <span>{points[points.length - 1]!.label}</span>
        </div>
      ) : null}
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {(['error', 'warning', 'notice'] as const).map((severity) => (
          <span
            key={severity}
            className="inline-flex items-center gap-1.5 text-[12.5px] leading-none text-neutral-800"
          >
            <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 ${SEVERITY_CHART[severity].chip}`} />
            {SEVERITY_CHART[severity].label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── rank sparkline ────────────────────────────────────────────────────── */

/**
 * One keyword's position over its checks. The axis is inverted — rank 1 at
 * the top, the way anyone reads a ranking — and "not in top 100" plots on
 * the floor with its tooltip saying 100+ rather than pretending a number.
 */
export function RankSpark({
  points,
}: {
  points: { label: string; position: number | null }[];
}) {
  if (points.length < 2) return null;
  const n = points.length;
  const y = (position: number | null) => {
    const p = Math.min(100, position ?? 100);
    return 2 + ((p - 1) / 99) * 24; // viewBox 0..28, rank 1 near the top
  };
  const coords = points.map(
    (p, i) => `${(i / (n - 1)) * 100},${y(p.position).toFixed(1)}`
  );
  const last = points[n - 1]!;

  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Position over ${n} checks, latest ${last.position ?? '100+'}`}
      className="h-7 w-24"
    >
      <title>
        {points.map((p) => `${p.label}: ${p.position ?? '100+'}`).join(' · ')}
      </title>
      <line x1="0" y1="27" x2="100" y2="27" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" className="text-neutral-300" />
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        className="text-accent"
      />
      <circle
        cx={100}
        cy={y(last.position)}
        r="2.5"
        vectorEffect="non-scaling-stroke"
        className="fill-accent"
      />
    </svg>
  );
}

/* ── delta tag ─────────────────────────────────────────────────────────── */

/**
 * Movement in one glyph + magnitude, ink-coloured — direction lives in the
 * glyph (and the accessible text), never in colour alone. `lowerBetter`
 * flips the read for positions, where 14 → 8 is a climb.
 */
export function Delta({
  now,
  prev,
  lowerBetter = false,
  format = (n: number) => n.toLocaleString('en-IN'),
}: {
  now: number | null;
  prev: number | null;
  lowerBetter?: boolean;
  format?: (n: number) => string;
}) {
  if (now === null || prev === null || now === prev) {
    return (
      <span className="whitespace-nowrap text-[12.5px] leading-none text-neutral-600">
        {now !== null && prev !== null ? '· steady' : '—'}
      </span>
    );
  }
  const magnitude = Math.abs(now - prev);
  const improved = lowerBetter ? now < prev : now > prev;
  return (
    <span className="whitespace-nowrap text-[12.5px] font-semibold leading-none text-neutral-800">
      <span aria-hidden="true">{improved ? '▲' : '▼'}</span>
      <span className="sr-only">{improved ? 'improved by' : 'down by'}</span>{' '}
      {format(magnitude)}
    </span>
  );
}
