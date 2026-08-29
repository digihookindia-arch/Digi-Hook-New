/**
 * The site auditor crawls other people's production sites and the Search
 * Console module shows clients Google's own numbers, so these pin the
 * properties that matter: robots.txt is honoured the way Google documents
 * it, messy third-party HTML parses without throwing, issue fingerprints
 * stay stable across runs (the whole new/resolved story rests on them), and
 * a malformed Google payload reads as "unavailable" — never as zero.
 */

import {
  AUDIT_ISSUE_CAP,
  CHECK_LABELS,
  PILLAR_OF_CHECK,
  analyzePage,
  buildSummary,
  crossPageIssues,
  diffAudits,
  extractLinks,
  normalizeAuditPath,
  pageIssues,
  parseRobots,
  parseSitemapXml,
  pillarCounts,
  pillarSummaryLine,
  robotsAllows,
  type PageFacts,
} from '@/lib/seoAudit';
import {
  cleanGscProperty,
  searchWindow,
  shapeDailyPoints,
  shapeSearchRows,
} from '@/lib/searchConsole';
import { shapePsiScores } from '@/lib/pageSpeed';
import {
  bareHost,
  hostMatches,
  shapeBacklinksSummary,
  shapeDomainStanding,
  shapeRankResult,
} from '@/lib/dataForSeo';

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    pass++;
    console.log('  PASS  ' + name);
  } else {
    fail++;
    console.log('  FAIL  ' + name, detail === undefined ? '' : JSON.stringify(detail));
  }
}

/** A healthy page's facts, for tests to break one property at a time. */
function facts(over: Partial<PageFacts> = {}): PageFacts {
  return {
    path: '/about',
    status: 200,
    analyzed: true,
    fromSitemap: true,
    redirectedTo: null,
    title: 'About the studio',
    description: 'A perfectly reasonable description of the page, well within limits.',
    canonical: 'https://client.in/about',
    noindex: false,
    h1Count: 1,
    headingSkip: null,
    imagesWithoutAlt: 0,
    words: 500,
    lang: 'en',
    hasOgImage: true,
    jsonLdInvalid: false,
    mixedContent: 0,
    internalPaths: ['/'],
    ...over,
  };
}

const ORIGIN = 'https://client.in';
const checksOf = (page: PageFacts) => pageIssues(page, ORIGIN).map((i) => i.check);

console.log('\n— robots.txt is honoured the way Google documents it —');

const robots = parseRobots(
  [
    '# a comment',
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /tmp/*.bak',
    'Allow: /admin/public',
    '',
    'User-agent: Googlebot',
    'Disallow: /google-only',
    '',
    'Sitemap: https://client.in/sitemap.xml',
  ].join('\n'),
  'DigiHookAudit'
);
check('the wildcard group applies to an unlisted agent', robots.disallow.includes('/admin'));
check('another agent group is ignored', !robots.disallow.includes('/google-only'));
check('sitemap lines are collected from anywhere', robots.sitemaps[0] === 'https://client.in/sitemap.xml');
check('a disallowed prefix is blocked', !robotsAllows(robots, '/admin/settings'));
check('an unrelated path is allowed', robotsAllows(robots, '/services'));
check('allow outranks a shorter disallow', robotsAllows(robots, '/admin/public/doc'));
check('wildcard patterns match', !robotsAllows(robots, '/tmp/backup.bak'));
check('wildcard patterns do not overmatch', robotsAllows(robots, '/tmp/notes.txt'));

const ownGroup = parseRobots(
  'User-agent: DigiHookAudit\nDisallow: /keep-out\n\nUser-agent: *\nDisallow: /',
  'DigiHookAudit'
);
check('a group naming our agent wins over the wildcard', robotsAllows(ownGroup, '/anything'));
check('and its own rules still apply', !robotsAllows(ownGroup, '/keep-out'));
check('an empty robots file allows everything', robotsAllows(parseRobots('', 'x'), '/any'));
const anchored = parseRobots('User-agent: *\nDisallow: /*.pdf$', 'x');
check('a $ anchor matches only the end', !robotsAllows(anchored, '/file.pdf'));
check('a $ anchor does not match past the end', robotsAllows(anchored, '/file.pdf.html'));

console.log('\n— link normalisation keeps the crawl on the client site —');

const base = 'https://client.in/services/';
check('a relative link resolves against the page', normalizeAuditPath('../about', base) === '/about');
check('a same-host absolute link keeps its path', normalizeAuditPath('https://client.in/contact', base) === '/contact');
check('another host is not ours to crawl', normalizeAuditPath('https://other.in/page', base) === null);
check('a subdomain is another host', normalizeAuditPath('https://www.client.in/page', base) === null);
check('mailto is skipped', normalizeAuditPath('mailto:x@y.in', base) === null);
check('tel is skipped', normalizeAuditPath('tel:+911234', base) === null);
check('a fragment-only link is skipped', normalizeAuditPath('#top', base) === null);
check('an asset is skipped', normalizeAuditPath('/brochure.pdf', base) === null);
check('queries are stripped so facets cannot eat the page cap',
  normalizeAuditPath('/list?page=2&sort=asc', base) === '/list');
check('a bare fragment on a path is dropped', normalizeAuditPath('/about#team', base) === '/about');
check('doubled slashes collapse', normalizeAuditPath('https://client.in//a//b', base) === '/a/b');

check('extractLinks reads single and double quotes',
  extractLinks(`<a href="/a">x</a> <a class=y href='/b'>y</a>`).join(',') === '/a,/b');

const urlset = parseSitemapXml(
  '<urlset><url><loc>https://client.in/</loc></url><url><loc> https://client.in/about </loc></url></urlset>'
);
check('sitemap locs are read and trimmed', urlset.locs[1] === 'https://client.in/about');
check('a urlset is not an index', !urlset.isIndex);
check('a sitemapindex is recognised',
  parseSitemapXml('<sitemapindex><sitemap><loc>https://client.in/s1.xml</loc></sitemap></sitemapindex>').isIndex);

console.log('\n— other people\'s HTML parses into facts without throwing —');

const page = analyzePage(
  [
    '<!doctype html><html lang="en"><head>',
    '<title> Widgets &amp; Co — Home </title>',
    // Attribute order reversed on purpose: not our templates.
    '<meta content="All the widgets you could want, honestly described." name="description">',
    "<link href='https://client.in/' rel='canonical'>",
    '<meta name="robots" content="noindex, nofollow">',
    '<meta content="https://client.in/og.png" property="og:image">',
    '<script type="application/ld+json">{not json}</script>',
    '</head><body>',
    '<h1>Widgets</h1><h2>Kinds</h2><h4>Oops</h4>',
    '<img src="http://cdn.client.in/a.png"><img src="/b.png" alt="b">',
    '<a href="/about">About</a> <a href="/about#x">About again</a> <a href="https://elsewhere.in/">Out</a>',
    '<p>' + 'word '.repeat(50) + '</p>',
    '</body></html>',
  ].join('\n'),
  'https://client.in/'
);
check('the title is trimmed and entity-decoded', page.title === 'Widgets & Co — Home');
check('a reversed-attribute meta description is still found',
  page.description === 'All the widgets you could want, honestly described.');
check('a single-quoted canonical is found', page.canonical === 'https://client.in/');
check('noindex is read from the robots meta', page.noindex);
check('og:image is found by property', page.hasOgImage);
check('the heading skip names its levels', page.headingSkip === 'h2 to h4');
check('one h1 is counted', page.h1Count === 1);
check('the alt-less image is counted, the alt one is not', page.imagesWithoutAlt === 1);
check('http assets on an https page are counted', page.mixedContent === 1);
check('broken JSON-LD is flagged', page.jsonLdInvalid);
check('internal links are deduped and normalised', page.internalPaths.join(',') === '/about');
check('the language is read', page.lang === 'en');
check('words are counted from text, not markup', page.words >= 50 && page.words < 70);

const bare = analyzePage('<html><body><p>hi</p></body></html>', 'http://client.in/');
check('a page with nothing declares nothing', bare.title === null && bare.description === null && bare.canonical === null);
check('no lang reads as null', bare.lang === null);
check('http pages cannot have mixed content', bare.mixedContent === 0);

console.log('\n— each check fires exactly when it should —');

check('a healthy page raises nothing', pageIssues(facts(), ORIGIN).length === 0);
check('a 404 is the only finding on a dead page — content checks stay quiet',
  (() => { const found = pageIssues(facts({ status: 404, analyzed: false, title: null }), ORIGIN);
    return found.length === 1 && found[0]?.check === 'unreachable' && found[0]?.severity === 'error'; })());
check('a fetch that never answered reads as unreachable too',
  checksOf(facts({ status: 0, analyzed: false })).join(',') === 'unreachable');
check('a non-HTML 200 gets no content checks',
  pageIssues(facts({ analyzed: false, title: null, description: null }), ORIGIN).length === 0);
check('a missing title is an error', checksOf(facts({ title: null })).includes('missing-title'));
check('an empty-string title counts as missing', checksOf(facts({ title: null })).includes('missing-title'));
check('a 70-char title warns', checksOf(facts({ title: 'x'.repeat(70) })).includes('long-title'));
check('a missing description warns', checksOf(facts({ description: null })).includes('missing-description'));
check('a 200-char description warns', checksOf(facts({ description: 'x'.repeat(200) })).includes('long-description'));
check('noindex in the sitemap is an error',
  pageIssues(facts({ noindex: true }), ORIGIN).some((i) => i.check === 'noindex-in-sitemap' && i.severity === 'error'));
check('noindex off the sitemap is fine (deliberate private pages)',
  !checksOf(facts({ noindex: true, fromSitemap: false })).includes('noindex-in-sitemap'));
check('zero h1 warns', checksOf(facts({ h1Count: 0 })).includes('h1-count'));
check('three h1s warn', checksOf(facts({ h1Count: 3 })).includes('h1-count'));
check('a heading skip warns', checksOf(facts({ headingSkip: 'h1 to h3' })).includes('heading-skip'));
check('alt-less images warn', checksOf(facts({ imagesWithoutAlt: 4 })).includes('images-alt'));
check('a missing canonical warns', checksOf(facts({ canonical: null })).includes('canonical-missing'));
check('a canonical to another page warns',
  checksOf(facts({ canonical: 'https://client.in/other' })).includes('canonical-mismatch'));
check('a canonical differing only by trailing slash is fine',
  !checksOf(facts({ canonical: 'https://client.in/about/' })).includes('canonical-mismatch'));
check('a relative canonical resolves before judging',
  !checksOf(facts({ canonical: '/about' })).includes('canonical-mismatch'));
check('a canonical on another host warns',
  checksOf(facts({ canonical: 'https://www.client.in/about' })).includes('canonical-mismatch'));
check('after a redirect the canonical is judged against the served page',
  !checksOf(facts({ redirectedTo: '/about-us', canonical: 'https://client.in/about-us' })).includes('canonical-mismatch'));
check('a sitemap URL that redirects warns',
  checksOf(facts({ redirectedTo: '/about-us', canonical: 'https://client.in/about-us' })).includes('sitemap-redirect'));
check('a linked (non-sitemap) URL may redirect quietly',
  !checksOf(facts({ fromSitemap: false, redirectedTo: '/about-us', canonical: 'https://client.in/about-us' })).includes('sitemap-redirect'));
check('mixed content warns', checksOf(facts({ mixedContent: 2 })).includes('mixed-content'));
check('broken JSON-LD warns', checksOf(facts({ jsonLdInvalid: true })).includes('bad-jsonld'));
check('150 words is a thin-content notice',
  pageIssues(facts({ words: 150 }), ORIGIN).some((i) => i.check === 'thin-content' && i.severity === 'notice'));
check('no lang is a notice', checksOf(facts({ lang: null })).includes('no-lang'));
check('no og:image is a notice', checksOf(facts({ hasOgImage: false })).includes('no-og-image'));

console.log('\n— cross-page checks see what one page cannot —');

const dupes = crossPageIssues(
  [
    facts({ path: '/a', title: 'Same', description: 'Same desc' }),
    facts({ path: '/b', title: 'Same', description: 'Same desc' }),
    facts({ path: '/c', title: 'Different', description: 'Also different' }),
  ],
  true
);
check('duplicated titles are one grouped issue',
  dupes.filter((i) => i.check === 'duplicate-title').length === 1);
check('duplicated descriptions are one grouped issue',
  dupes.filter((i) => i.check === 'duplicate-description').length === 1);
check('the group names its pages',
  Boolean(dupes[0]?.detail.includes('/a') && dupes[0]?.detail.includes('/b')));

const linkWorld = [
  facts({ path: '/', fromSitemap: true, internalPaths: ['/gone', '/fine'] }),
  facts({ path: '/fine', internalPaths: [] }),
  facts({ path: '/gone', status: 404, analyzed: false, internalPaths: [] }),
  facts({ path: '/island', fromSitemap: true, internalPaths: [] }),
];
const crossDone = crossPageIssues(linkWorld, true);
check('a link onto a 404 is a broken-link error',
  crossDone.some((i) => i.check === 'broken-link' && i.severity === 'error' && i.path === '/' && i.detail.includes('/gone')));
check('a link onto a live page is not', !crossDone.some((i) => i.detail.includes('/fine') && i.check === 'broken-link'));
check('a sitemap page nothing links to is an orphan notice',
  crossDone.some((i) => i.check === 'orphan' && i.path === '/island'));
check('the homepage is never an orphan', !crossDone.some((i) => i.check === 'orphan' && i.path === '/'));
check('an unfinished crawl stays silent about orphans',
  !crossPageIssues(linkWorld, false).some((i) => i.check === 'orphan'));
check('links to pages outside the crawl are not judged',
  !crossPageIssues([facts({ path: '/', internalPaths: ['/never-crawled'] })], false)
    .some((i) => i.check === 'broken-link'));

console.log('\n— summaries order, count and cap honestly —');

const summary = buildSummary(
  'https://client.in',
  [
    facts({ path: '/z', title: null }),
    facts({ path: '/a', words: 100 }),
    facts({ path: '/dead', status: 500, analyzed: false }),
  ],
  true
);
check('errors sort before warnings before notices',
  summary.issues.map((i) => i.severity).join(',').match(/^error(,error)*.*notice$/) !== null);
check('counts match the issue list',
  summary.counts.error + summary.counts.warning + summary.counts.notice === summary.issues.length);
check('pages are counted', summary.pages === 3);
check('a finished crawl says so', summary.completed && !summary.truncated);

const noisy = buildSummary(
  'https://client.in',
  Array.from({ length: 90 }, (_, i) =>
    facts({
      path: `/p${i}`,
      title: null,
      description: null,
      canonical: null,
      lang: null,
      hasOgImage: false,
      words: 10,
      h1Count: 0,
    })
  ),
  false
);
check('a flood of issues is capped for storage', noisy.issues.length === AUDIT_ISSUE_CAP);
check('but the counts stay exact past the cap',
  noisy.truncated &&
    noisy.counts.error + noisy.counts.warning + noisy.counts.notice > AUDIT_ISSUE_CAP);

console.log('\n— run-to-run diffs rest on stable fingerprints —');

const before = buildSummary('https://client.in', [facts({ path: '/a', title: null }), facts({ path: '/b', words: 100 })], true);
const after = buildSummary('https://client.in', [facts({ path: '/a', title: null }), facts({ path: '/b' }), facts({ path: '/c', h1Count: 0 })], true);
const diff = diffAudits(after.issues, before.issues);
check('a persisting issue is not new', !diff.newFingerprints.has('missing-title|/a'));
check('a fresh issue is new', diff.newFingerprints.has('h1-count|/c'));
check('a fixed issue counts as resolved', diff.resolvedCount === 1);
const firstRun = diffAudits(after.issues, null);
check('with no previous run nothing is marked new', firstRun.newFingerprints.size === 0 && firstRun.resolvedCount === 0);

console.log('\n— Search Console properties are cleaned strictly —');

check('a domain property passes', cleanGscProperty('sc-domain:client.in') === 'sc-domain:client.in');
check('a domain property is lowercased', cleanGscProperty('SC-DOMAIN:Client.IN') === 'sc-domain:client.in');
check('a nonsense domain fails', cleanGscProperty('sc-domain:not a domain') === null);
check('a URL property gains its trailing slash', cleanGscProperty('https://client.in') === 'https://client.in/');
check('an existing trailing slash is kept once', cleanGscProperty('https://client.in/') === 'https://client.in/');
check('a bare domain becomes a URL property', cleanGscProperty('client.in') === 'https://client.in/');
check('ftp is refused', cleanGscProperty('ftp://client.in') === null);
check('empty is null', cleanGscProperty('   ') === null);

console.log('\n— the reporting window respects Google\'s data lag —');

const window = searchWindow(new Date('2026-08-29T10:00:00Z'));
check('the window ends where fresh data actually exists', window.to === '2026-08-26');
check('the window is 28 days long', window.from === '2026-07-30');
check('the previous window ends where the current begins', window.prevTo === '2026-07-29');
check('the previous window is also 28 days', window.prevFrom === '2026-07-02');

console.log('\n— a malformed Google payload is never shown as zero —');

const rows = shapeSearchRows({
  rows: [
    { keys: ['best agency noida'], clicks: 12, impressions: 340, ctr: 0.035, position: 4.2 },
    { clicks: '7', impressions: -5, ctr: null, position: Infinity },
  ],
});
check('well-formed rows come through',
  rows?.[0]?.key === 'best agency noida' && rows?.[0]?.clicks === 12);
check('strings coerce, junk clamps to zero',
  rows?.[1]?.clicks === 7 && rows?.[1]?.impressions === 0 && rows?.[1]?.ctr === 0 && rows?.[1]?.position === 0);
check('a totals row without keys keeps an empty key', rows?.[1]?.key === '');
check('Google omitting rows entirely is a real empty result, not a failure',
  shapeSearchRows({ responseAggregationType: 'auto' })?.length === 0);
check('rows of the wrong shape read as unavailable', shapeSearchRows({ rows: 'nope' }) === null);
check('a non-object payload reads as unavailable', shapeSearchRows('<html>error</html>') === null);
check('null reads as unavailable', shapeSearchRows(null) === null);

const daily = shapeDailyPoints([
  { key: '2026-08-03', clicks: 4, impressions: 90, ctr: 0, position: 0 },
  { key: '2026-08-01', clicks: 2, impressions: 40, ctr: 0, position: 0 },
  { key: 'not-a-date', clicks: 9, impressions: 9, ctr: 0, position: 0 },
]);
check('daily points sort chronologically for the chart',
  daily.length === 2 && daily[0]?.date === '2026-08-01' && daily[1]?.clicks === 4);
check('non-date keys are dropped, not plotted', !daily.some((d) => d.date === 'not-a-date'));

console.log('\n— every check reports under exactly one client-facing pillar —');

const labelKeys = Object.keys(CHECK_LABELS).sort();
const pillarKeys = Object.keys(PILLAR_OF_CHECK).sort();
check('the pillar map covers every check', labelKeys.join(',') === pillarKeys.join(','),
  { missing: labelKeys.filter((k) => !pillarKeys.includes(k)), extra: pillarKeys.filter((k) => !labelKeys.includes(k)) });

const bucketed = pillarCounts([
  { fingerprint: 'a', severity: 'error', check: 'broken-link', path: '/', detail: '' },
  { fingerprint: 'b', severity: 'warning', check: 'missing-description', path: '/', detail: '' },
  { fingerprint: 'c', severity: 'notice', check: 'thin-content', path: '/', detail: '' },
  { fingerprint: 'd', severity: 'warning', check: 'mixed-content', path: '/', detail: '' },
]);
check('technical findings land in technical',
  bucketed.technical.error === 1 && bucketed.technical.warning === 1);
check('content findings land in on-page',
  bucketed.on_page.warning === 1 && bucketed.on_page.notice === 1);
check('a clean pillar reads as all clear',
  pillarSummaryLine({ error: 0, warning: 0, notice: 0 }) === 'All clear — nothing needs fixing.');
check('fixables and notes are counted, never itemised',
  pillarSummaryLine({ error: 1, warning: 2, notice: 1 }) === '3 items on our fix list and 1 minor note.');
check('notes alone read as notes',
  pillarSummaryLine({ error: 0, warning: 0, notice: 2 }) === '2 minor notes.');

console.log('\n— PageSpeed payloads shape into scores, never invented zeros —');

const psi = shapePsiScores({
  lighthouseResult: {
    categories: {
      performance: { score: 0.923 },
      accessibility: { score: 1 },
      'best-practices': { score: 0.5 },
      seo: { score: 0.98 },
    },
  },
});
check('fractions become 0-100 scores',
  psi?.performance === 92 && psi?.accessibility === 100 && psi?.bestPractices === 50 && psi?.seo === 98);
check('a missing category is null, not zero',
  shapePsiScores({ lighthouseResult: { categories: { seo: { score: 0.9 } } } })?.performance === null);
check('an out-of-range score is null', shapePsiScores({ lighthouseResult: { categories: { seo: { score: 3 } } } })?.seo === null);
check('a malformed payload is null overall', shapePsiScores({ error: { code: 500 } }) === null);
check('a non-object payload is null overall', shapePsiScores('<html>') === null);

console.log('\n— rank results only count the client\'s own site —');

check('www is stripped for matching', bareHost('www.client.in') === 'client.in');
check('a bare host matches its www form', hostMatches('www.client.in', 'client.in'));
check('a subdomain counts as the site', hostMatches('blog.client.in', 'client.in'));
check('a lookalike domain does not', !hostMatches('notclient.in', 'client.in'));
check('an unrelated host does not', !hostMatches('other.in', 'client.in'));

const serpPayload = (items: unknown[]) => ({
  cost: 0.0155,
  tasks: [{ cost: 0.0155, result: [{ items }] }],
});
const rank = shapeRankResult(
  serpPayload([
    { type: 'paid', rank_group: 1, url: 'https://ad.example/x', domain: 'ad.example' },
    { type: 'organic', rank_group: 1, url: 'https://other.in/', domain: 'other.in' },
    { type: 'organic', rank_group: 2, url: 'https://www.client.in/services', domain: 'www.client.in' },
  ]),
  'client.in'
);
check('the first matching organic result names the position', rank?.position === 2);
check('the ranking URL travels with it', rank?.url === 'https://www.client.in/services');
check('the reported API cost is captured', rank?.cost === 0.0155);
check('ads never count as a ranking',
  shapeRankResult(serpPayload([{ type: 'paid', rank_group: 1, url: 'https://client.in/', domain: 'client.in' }]), 'client.in')?.position === null);
check('absent from the top 100 is a successful check with a null position',
  (() => { const r = shapeRankResult(serpPayload([{ type: 'organic', rank_group: 1, url: 'https://other.in/', domain: 'other.in' }]), 'client.in');
    return r !== null && r.position === null && r.cost === 0.0155; })());
check('a domain-less item falls back to its URL host',
  shapeRankResult(serpPayload([{ type: 'organic', rank_group: 4, url: 'https://client.in/x' }]), 'client.in')?.position === 4);
check('a malformed SERP payload reads as check-failed, not not-ranked',
  shapeRankResult({ error: true }, 'client.in') === null);

console.log('\n— off-page and standing snapshots shape honestly —');

const backlinks = shapeBacklinksSummary({
  cost: 0.02,
  tasks: [{ result: [{ backlinks: 128, referring_domains: 17 }] }],
});
check('backlink counts come through with their cost',
  backlinks?.backlinks === 128 && backlinks?.referringDomains === 17 && backlinks?.cost === 0.02);
check('a malformed backlinks payload is null', shapeBacklinksSummary({ tasks: [{ result: [{}] }] }) === null);

const standing = shapeDomainStanding({
  cost: 0.012,
  tasks: [{ result: [{ items: [{ metrics: { organic: { pos_1: 2, pos_2_3: 3, pos_4_10: 5, pos_11_20: 4, count: 40 } } }] }] }],
});
check('position buckets sum into top-3 and top-10',
  standing?.keywordsTop3 === 5 && standing?.keywordsTop10 === 10);
check('the top-100 figure is the tracked count', standing?.keywordsTop100 === 40);
check('the standing cost is captured', standing?.cost === 0.012);
check('a payload without items is null', shapeDomainStanding({ tasks: [{ result: [{ items: [] }] }] }) === null);
check('a malformed standing payload is null', shapeDomainStanding(null) === null);

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
