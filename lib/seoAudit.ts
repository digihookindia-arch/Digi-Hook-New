/**
 * The pure half of the site auditor: robots parsing, URL normalisation, the
 * per-page and cross-page checks, and the fingerprint diffing that turns two
 * runs into "new / persistent / resolved". Grown out of scripts/seo-check.mjs
 * (which audits this site's own sitemap) into something that can look at any
 * client's site — so unlike the script, it tolerates other people's HTML:
 * attribute order varies, quotes vary, and most findings are warnings, not
 * failures.
 *
 * Deliberately free of fetch, node:sqlite and node:crypto — the crawl loop
 * and storage live in lib/seoAudits.ts, same split as ticketRules/tickets.
 */

/* ── caps ──────────────────────────────────────────────────────────────── */

/** Spec limit: up to 100 pages per weekly pass. */
export const AUDIT_PAGE_CAP = 100;

/**
 * Issues stored per run. A site in real trouble can produce thousands; the
 * severity counts stay exact, and the stored list is marked truncated so the
 * report never pretends the cap is the total.
 */
export const AUDIT_ISSUE_CAP = 400;

/* ── issues ────────────────────────────────────────────────────────────── */

export type IssueSeverity = 'error' | 'warning' | 'notice';

export type AuditIssue = {
  /**
   * Stable identity across runs — check plus the page (plus a discriminator
   * where one page can carry several, e.g. one per broken target). Two runs
   * are compared on these, so nothing volatile (counts, wording) may go in.
   */
  fingerprint: string;
  severity: IssueSeverity;
  check: string;
  /** Page path the issue sits on. */
  path: string;
  /** One client-readable sentence. */
  detail: string;
};

/** Client-facing wording for each check, shared by portal and dashboard. */
export const CHECK_LABELS: Record<string, string> = {
  unreachable: 'Page could not be loaded',
  'robots-blocked': 'Crawling is blocked by robots.txt',
  'missing-title': 'Missing page title',
  'noindex-in-sitemap': 'Page asks Google not to index it, but is in the sitemap',
  'broken-link': 'Broken internal link',
  'missing-description': 'Missing meta description',
  'long-title': 'Title too long for search results',
  'long-description': 'Description too long for search results',
  'duplicate-title': 'Same title on several pages',
  'duplicate-description': 'Same description on several pages',
  'h1-count': 'Page needs exactly one main heading',
  'heading-skip': 'Heading levels skip a step',
  'images-alt': 'Images without alt text',
  'canonical-missing': 'No canonical URL declared',
  'canonical-mismatch': 'Canonical points at a different page',
  'mixed-content': 'Insecure http:// assets on an https page',
  'bad-jsonld': 'Structured data does not parse',
  'sitemap-redirect': 'Sitemap lists a redirecting URL',
  'thin-content': 'Very little text on the page',
  'no-lang': 'No language declared on <html>',
  'no-og-image': 'No social-share image',
  orphan: 'No internal link reaches this page',
};

export const SEVERITY_ORDER: IssueSeverity[] = ['error', 'warning', 'notice'];

export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  error: 'Critical',
  warning: 'Warning',
  notice: 'Notice',
};

/* ── robots.txt ────────────────────────────────────────────────────────── */

export type RobotsRules = {
  /** Disallow patterns for the most specific matching user-agent group. */
  disallow: string[];
  /** Allow patterns from the same group — they outrank a shorter disallow. */
  allow: string[];
  /** Sitemap: lines from anywhere in the file. */
  sitemaps: string[];
};

/**
 * The subset of robots.txt this crawler honours: the group for our own
 * user-agent token if one exists, else the `*` group, plus every Sitemap
 * line. Group parsing follows the standard: consecutive user-agent lines
 * share the rules that follow them.
 */
export function parseRobots(text: string, userAgent: string): RobotsRules {
  const groups: { agents: string[]; disallow: string[]; allow: string[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let openingAgents = false;
  const sitemaps: string[] = [];

  for (const rawLine of String(text ?? '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === 'sitemap') {
      if (value) sitemaps.push(value);
    } else if (field === 'user-agent') {
      if (!openingAgents || !current) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      openingAgents = true;
    } else if (field === 'disallow' || field === 'allow') {
      openingAgents = false;
      if (current && value) current[field].push(value);
    } else {
      openingAgents = false;
    }
  }

  const token = userAgent.toLowerCase();
  const own = groups.find((g) => g.agents.some((a) => a !== '*' && token.includes(a)));
  const wildcard = groups.find((g) => g.agents.includes('*'));
  const group = own ?? wildcard;
  return {
    disallow: group?.disallow ?? [],
    allow: group?.allow ?? [],
    sitemaps,
  };
}

/** One robots pattern (with * wildcards and $ anchors) against one path. */
function robotsPatternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${source}${anchored ? '$' : ''}`).test(path);
}

/**
 * May this path be fetched? Longest matching pattern wins, Allow beating
 * Disallow on a tie — the same precedence Google documents.
 */
export function robotsAllows(rules: RobotsRules, path: string): boolean {
  let verdict = true;
  let strongest = -1;
  for (const pattern of rules.disallow) {
    if (pattern.length > strongest && robotsPatternMatches(pattern, path)) {
      verdict = false;
      strongest = pattern.length;
    }
  }
  for (const pattern of rules.allow) {
    if (pattern.length >= strongest && robotsPatternMatches(pattern, path)) {
      verdict = true;
      strongest = pattern.length;
    }
  }
  return verdict;
}

/* ── URLs ──────────────────────────────────────────────────────────────── */

/** File extensions that are never HTML pages — not worth a fetch. */
const ASSET_EXTENSION =
  /\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|json|xml|txt|pdf|zip|gz|mp3|mp4|webm|mov|woff2?|ttf|otf|eot)$/i;

/**
 * An internal link target as a crawlable path, or null for anything that is
 * not this site's own page: other hosts, other protocols, assets, fragments.
 * Queries are stripped on purpose — faceted and tracking URLs would otherwise
 * eat the whole page cap as "different" pages.
 */
export function normalizeAuditPath(href: string, baseUrl: string): string | null {
  const raw = String(href ?? '').trim();
  if (!raw || raw.startsWith('#')) return null;
  if (/^(?:mailto|tel|javascript|data):/i.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw, baseUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.host !== new URL(baseUrl).host) return null;
  if (ASSET_EXTENSION.test(url.pathname)) return null;
  const path = url.pathname.replace(/\/{2,}/g, '/');
  return path === '' ? '/' : path;
}

/** href values from a page, in order, unresolved. */
export function extractLinks(html: string): string[] {
  return [...String(html ?? '').matchAll(/<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi)].map(
    (m) => m[1] ?? ''
  );
}

/** <loc> entries of a sitemap or sitemap index, and whether it IS an index. */
export function parseSitemapXml(xml: string): { locs: string[]; isIndex: boolean } {
  const text = String(xml ?? '');
  return {
    locs: [...text.matchAll(/<loc>\s*([^<\s][^<]*?)\s*<\/loc>/g)].map((m) => m[1] ?? ''),
    isIndex: /<sitemapindex[\s>]/.test(text),
  };
}

/* ── per-page analysis ─────────────────────────────────────────────────── */

export type PageFacts = {
  path: string;
  /** 0 means the fetch itself failed. */
  status: number;
  /** True when a 200 text/html response was actually parsed. */
  analyzed: boolean;
  fromSitemap: boolean;
  /** Path the URL 3xx-ed to, when it moved; null when it answered in place. */
  redirectedTo: string | null;
  title: string | null;
  description: string | null;
  canonical: string | null;
  noindex: boolean;
  h1Count: number;
  /** First skip in the heading ladder, e.g. "h2 to h4"; null when clean. */
  headingSkip: string | null;
  imagesWithoutAlt: number;
  words: number;
  lang: string | null;
  hasOgImage: boolean;
  jsonLdInvalid: boolean;
  mixedContent: number;
  /** Normalised same-site paths this page links to. */
  internalPaths: string[];
};

/**
 * content="…" from a <meta> matching the given name/property, tolerant of
 * attribute order and quote style — client sites are not our templates.
 */
function metaContent(html: string, attr: 'name' | 'property', value: string): string | null {
  const tags = html.match(/<meta\s[^>]*>/gi) ?? [];
  const wanted = new RegExp(`${attr}\\s*=\\s*["']${value}["']`, 'i');
  for (const tag of tags) {
    if (!wanted.test(tag)) continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (content) return (content[1] ?? '').trim();
  }
  return null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Everything the checks need from one HTML document. Pure string work. */
export function analyzePage(
  html: string,
  pageUrl: string
): Omit<PageFacts, 'path' | 'status' | 'analyzed' | 'fromSitemap' | 'redirectedTo'> {
  const text = String(html ?? '');

  const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? decodeEntities(titleMatch[1] ?? '').replace(/\s+/g, ' ').trim()
    : null;

  const canonicalTag = (text.match(/<link\s[^>]*>/gi) ?? []).find((tag) =>
    /rel\s*=\s*["']canonical["']/i.test(tag)
  );
  const canonicalHref = canonicalTag?.match(/href\s*=\s*["']([^"']*)["']/i)?.[1]?.trim();

  const robotsMeta = metaContent(text, 'name', 'robots');

  const headings = [...text.matchAll(/<h([1-6])[\s>]/gi)].map((m) => Number(m[1] ?? 0));
  let headingSkip: string | null = null;
  let previous = 0;
  for (const level of headings) {
    if (previous && level > previous + 1) {
      headingSkip = `h${previous} to h${level}`;
      break;
    }
    previous = level;
  }

  const jsonLdInvalid = [
    ...text.matchAll(
      /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ].some((m) => {
    try {
      JSON.parse(m[1] ?? '');
      return false;
    } catch {
      return true;
    }
  });

  const isHttps = pageUrl.startsWith('https:');
  const mixedContent = isHttps
    ? (text.match(/(?:src|srcset)\s*=\s*["']http:\/\//gi) ?? []).length
    : 0;

  const words = text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const internalPaths = [
    ...new Set(
      extractLinks(text)
        .map((href) => normalizeAuditPath(href, pageUrl))
        .filter((p): p is string => p !== null)
    ),
  ];

  return {
    title: title || null,
    description: metaContent(text, 'name', 'description'),
    canonical: canonicalHref || null,
    noindex: /noindex/i.test(robotsMeta ?? ''),
    h1Count: (text.match(/<h1[\s>]/gi) ?? []).length,
    headingSkip,
    imagesWithoutAlt: (text.match(/<img(?![^>]*\salt\s*=)[^>]*>/gi) ?? []).length,
    words: words === '' ? 0 : words.split(' ').length,
    lang: text.match(/<html[^>]*\slang\s*=\s*["']([^"']*)["']/i)?.[1]?.trim() || null,
    hasOgImage: Boolean(metaContent(text, 'property', 'og:image')),
    jsonLdInvalid,
    mixedContent,
    internalPaths,
  };
}

/* ── checks ────────────────────────────────────────────────────────────── */

const issue = (
  severity: IssueSeverity,
  check: string,
  path: string,
  detail: string,
  extra = ''
): AuditIssue => ({
  fingerprint: extra ? `${check}|${path}|${extra}` : `${check}|${path}`,
  severity,
  check,
  path,
  detail,
});

/** Trailing-slash-insensitive path equality, for canonical comparisons. */
function samePath(a: string, b: string): boolean {
  const trim = (p: string) => (p.length > 1 ? p.replace(/\/$/, '') : p);
  return trim(a) === trim(b);
}

/** The checks one page can answer for itself. */
export function pageIssues(page: PageFacts, siteOrigin: string): AuditIssue[] {
  const found: AuditIssue[] = [];
  const at = page.path;

  if (page.status === 0 || page.status >= 400) {
    found.push(
      issue(
        'error',
        'unreachable',
        at,
        page.status === 0
          ? 'The page did not respond at all.'
          : `The page answers with HTTP ${page.status}.`
      )
    );
    return found; // A page that does not load has no content to check.
  }

  if (page.fromSitemap && page.redirectedTo !== null) {
    found.push(
      issue(
        'warning',
        'sitemap-redirect',
        at,
        `The sitemap lists this URL but it redirects to ${page.redirectedTo}.`
      )
    );
  }

  if (!page.analyzed) return found; // Non-HTML or unparsed: status was the check.

  if (page.noindex && page.fromSitemap) {
    found.push(
      issue(
        'error',
        'noindex-in-sitemap',
        at,
        'The page is marked noindex yet the sitemap asks Google to index it.'
      )
    );
  }

  if (!page.title) {
    found.push(issue('error', 'missing-title', at, 'The page has no <title>.'));
  } else if (page.title.length > 60) {
    found.push(
      issue(
        'warning',
        'long-title',
        at,
        `The title is ${page.title.length} characters — Google truncates around 60.`
      )
    );
  }

  if (!page.description) {
    found.push(
      issue(
        'warning',
        'missing-description',
        at,
        'No meta description — Google writes its own snippet instead.'
      )
    );
  } else if (page.description.length > 160) {
    found.push(
      issue(
        'warning',
        'long-description',
        at,
        `The description is ${page.description.length} characters — truncated around 160.`
      )
    );
  }

  if (page.h1Count !== 1) {
    found.push(
      issue(
        'warning',
        'h1-count',
        at,
        page.h1Count === 0
          ? 'The page has no <h1> main heading.'
          : `The page has ${page.h1Count} <h1> headings — search engines expect one.`
      )
    );
  }

  if (page.headingSkip) {
    found.push(
      issue('warning', 'heading-skip', at, `Heading levels jump from ${page.headingSkip}.`)
    );
  }

  if (page.imagesWithoutAlt > 0) {
    found.push(
      issue(
        'warning',
        'images-alt',
        at,
        `${page.imagesWithoutAlt} image${page.imagesWithoutAlt === 1 ? '' : 's'} without alt text.`
      )
    );
  }

  if (!page.canonical) {
    found.push(
      issue('warning', 'canonical-missing', at, 'The page declares no canonical URL.')
    );
  } else {
    try {
      const canonical = new URL(page.canonical, siteOrigin + page.path);
      const servedPath = page.redirectedTo ?? page.path;
      if (canonical.origin !== siteOrigin || !samePath(canonical.pathname, servedPath)) {
        found.push(
          issue(
            'warning',
            'canonical-mismatch',
            at,
            `The canonical points at ${canonical.href} instead of this page.`
          )
        );
      }
    } catch {
      found.push(
        issue('warning', 'canonical-mismatch', at, 'The canonical URL does not parse.')
      );
    }
  }

  if (page.mixedContent > 0) {
    found.push(
      issue(
        'warning',
        'mixed-content',
        at,
        `${page.mixedContent} asset${page.mixedContent === 1 ? '' : 's'} loaded over plain http:// on an https page.`
      )
    );
  }

  if (page.jsonLdInvalid) {
    found.push(
      issue('warning', 'bad-jsonld', at, 'A structured-data block is not valid JSON.')
    );
  }

  if (page.words < 200) {
    found.push(
      issue(
        'notice',
        'thin-content',
        at,
        `Only about ${page.words} words of text on the page.`
      )
    );
  }

  if (!page.lang) {
    found.push(
      issue('notice', 'no-lang', at, 'The <html> element declares no language.')
    );
  }

  if (!page.hasOgImage) {
    found.push(
      issue(
        'notice',
        'no-og-image',
        at,
        'No og:image — shares on WhatsApp and social show no preview picture.'
      )
    );
  }

  return found;
}

/**
 * Checks that only make sense across the whole crawl: duplicated metadata,
 * internal links onto broken pages, and sitemap pages nothing links to.
 * Orphans are only judged when the crawl finished under the page cap — a
 * truncated crawl has not seen every link, so silence there is honest.
 */
export function crossPageIssues(pages: PageFacts[], crawlCompleted: boolean): AuditIssue[] {
  const found: AuditIssue[] = [];
  const analyzed = pages.filter((p) => p.analyzed);

  for (const [key, check] of [
    ['title', 'duplicate-title'],
    ['description', 'duplicate-description'],
  ] as const) {
    const groups = new Map<string, string[]>();
    for (const page of analyzed) {
      const value = page[key];
      if (!value) continue;
      groups.set(value, [...(groups.get(value) ?? []), page.path]);
    }
    for (const [value, paths] of groups) {
      if (paths.length < 2) continue;
      const shown = paths.slice(0, 3).join(', ');
      found.push(
        issue(
          'warning',
          check,
          paths[0]!,
          `${paths.length} pages share the same ${key}: ${shown}${paths.length > 3 ? ` and ${paths.length - 3} more` : ''}.`,
          value.slice(0, 60)
        )
      );
    }
  }

  const statusByPath = new Map(pages.map((p) => [p.path, p.status]));
  for (const page of analyzed) {
    for (const target of page.internalPaths) {
      const status = statusByPath.get(target);
      if (status === undefined || (status !== 0 && status < 400)) continue;
      found.push(
        issue(
          'error',
          'broken-link',
          page.path,
          `Links to ${target}, which ${status === 0 ? 'does not respond' : `returns HTTP ${status}`}.`,
          target
        )
      );
    }
  }

  if (crawlCompleted) {
    const linked = new Set(analyzed.flatMap((p) => p.internalPaths));
    for (const page of analyzed) {
      if (page.fromSitemap && page.path !== '/' && !linked.has(page.path)) {
        found.push(
          issue(
            'notice',
            'orphan',
            page.path,
            'The sitemap knows this page, but no crawled page links to it.'
          )
        );
      }
    }
  }

  return found;
}

/* ── summaries and diffs ───────────────────────────────────────────────── */

export type AuditSummary = {
  siteUrl: string;
  pages: number;
  /** True when the queue ran dry before the page cap — the crawl saw it all. */
  completed: boolean;
  /** True when the stored issue list was capped; counts stay exact. */
  truncated: boolean;
  counts: Record<IssueSeverity, number>;
  issues: AuditIssue[];
};

const severityRank: Record<IssueSeverity, number> = { error: 0, warning: 1, notice: 2 };

/** Deduplicates, counts and orders the findings of one run. */
export function buildSummary(
  siteUrl: string,
  pages: PageFacts[],
  crawlCompleted: boolean
): AuditSummary {
  const seen = new Set<string>();
  const issues: AuditIssue[] = [];
  for (const candidate of [
    ...pages.flatMap((p) => pageIssues(p, new URL(siteUrl).origin)),
    ...crossPageIssues(pages, crawlCompleted),
  ]) {
    if (seen.has(candidate.fingerprint)) continue;
    seen.add(candidate.fingerprint);
    issues.push(candidate);
  }

  issues.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      a.check.localeCompare(b.check) ||
      a.path.localeCompare(b.path)
  );

  const counts: Record<IssueSeverity, number> = { error: 0, warning: 0, notice: 0 };
  for (const found of issues) counts[found.severity]++;

  return {
    siteUrl,
    pages: pages.length,
    completed: crawlCompleted,
    truncated: issues.length > AUDIT_ISSUE_CAP,
    counts,
    issues: issues.slice(0, AUDIT_ISSUE_CAP),
  };
}

/**
 * What changed between two runs, on fingerprints: fresh problems, and ones
 * that went away. Derived at read time, never stored — there is no state to
 * fall out of date. With no previous run everything is simply current.
 */
export function diffAudits(
  current: AuditIssue[],
  previous: AuditIssue[] | null
): { newFingerprints: Set<string>; resolvedCount: number } {
  if (!previous) return { newFingerprints: new Set(), resolvedCount: 0 };
  const before = new Set(previous.map((i) => i.fingerprint));
  const now = new Set(current.map((i) => i.fingerprint));
  return {
    newFingerprints: new Set(current.map((i) => i.fingerprint).filter((f) => !before.has(f))),
    resolvedCount: [...before].filter((f) => !now.has(f)).length,
  };
}
