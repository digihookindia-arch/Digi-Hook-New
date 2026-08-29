import type { SearchRow } from '@/lib/searchConsole';
import type { PsiScores } from '@/lib/pageSpeed';

/**
 * Presentation shared by the live search panel and the monthly report page —
 * one look for the same numbers wherever they appear.
 */

export function displayDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function Stat({
  label,
  value,
  sub,
  beside,
}: {
  label: string;
  value: string;
  /** The comparison line under the number; null hides it. */
  sub: string | null;
  /** Rendered on the number's baseline — usually a movement Delta tag. */
  beside?: React.ReactNode;
}) {
  return (
    <div className="border-l-2 border-neutral-300 pl-4">
      <div className="mb-1 text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
        {label}
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="font-heading text-[clamp(26px,3vw,36px)] font-extrabold leading-none tracking-[-0.03em]">
          {value}
        </span>
        {beside ?? null}
      </div>
      {sub ? (
        <div className="mt-1.5 text-[12.5px] leading-none text-neutral-700">{sub}</div>
      ) : null}
    </div>
  );
}

export function RowsTable({
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

/**
 * The four Lighthouse scores as measured by Google PageSpeed — shared by
 * the locked page and the technical pillar so both read identically. A
 * null score renders as an em dash, never as zero.
 */
export function PsiRow({ scores }: { scores: PsiScores }) {
  const blocks: [string, number | null][] = [
    ['SEO', scores.seo],
    ['Performance', scores.performance],
    ['Best practices', scores.bestPractices],
    ['Accessibility', scores.accessibility],
  ];
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-x-6 gap-y-5">
      {blocks.map(([label, score]) => (
        <Stat key={label} label={label} value={score === null ? '—' : String(score)} sub="out of 100" />
      ))}
    </div>
  );
}

export const pct = (ctr: number) => `${(ctr * 100).toFixed(1)}%`;

export const pathOf = (key: string) => {
  try {
    return new URL(key).pathname || '/';
  } catch {
    return key;
  }
};
