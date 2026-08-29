/**
 * Google PageSpeed Insights (pagespeed.web.dev) for the SEO tab — the four
 * Lighthouse scores, from Google itself, shown to every client as "where
 * your site stands today".
 *
 * A PSI run takes 15–25 seconds, so this is NEVER called during a page
 * render: the cron (and the dashboard's Measure-now button) store snapshots
 * via lib/seoRecords.ts and pages read the latest row. The API is free —
 * 25k requests/day with a free key; keyless works at this volume, but
 * PAGESPEED_API_KEY raises the anonymous rate limits when set.
 */

const API = 'https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed';
const KEY = process.env.PAGESPEED_API_KEY ?? '';

export type PsiScores = {
  /** 0–100, or null when Lighthouse skipped that category. */
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
};

/** One category's 0–1 fraction → 0–100, or null for anything not a score. */
function toScore(category: unknown): number | null {
  const score = (category as { score?: unknown } | undefined)?.score;
  const n = Number(score);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return Math.round(n * 100);
}

/**
 * The API payload → the four scores, or null when the payload is not a
 * Lighthouse result at all — which must read as "no measurement", never as
 * a row of zeros.
 */
export function shapePsiScores(payload: unknown): PsiScores | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const categories = (payload as { lighthouseResult?: { categories?: unknown } })
    .lighthouseResult?.categories;
  if (typeof categories !== 'object' || categories === null) return null;
  const of = (key: string) => toScore((categories as Record<string, unknown>)[key]);
  return {
    performance: of('performance'),
    accessibility: of('accessibility'),
    bestPractices: of('best-practices'),
    seo: of('seo'),
  };
}

/**
 * One live measurement of a URL, mobile strategy — the slow call the
 * snapshot store wraps. Null on any failure.
 */
export async function fetchPsiScores(url: string): Promise<PsiScores | null> {
  const params = new URLSearchParams({ url, strategy: 'mobile' });
  for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
    params.append('category', category);
  }
  if (KEY) params.set('key', KEY);

  try {
    const res = await fetch(`${API}?${params}`, {
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.error('[psi] answered', res.status, 'for', url);
      return null;
    }
    return shapePsiScores(await res.json());
  } catch (err) {
    console.error('[psi] unreachable for', url, err);
    return null;
  }
}
