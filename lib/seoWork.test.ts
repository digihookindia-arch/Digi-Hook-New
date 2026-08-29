/**
 * The SEO work record is the part of the subscription a client actually
 * reads, so these pin its honesty rules: vague activity entries are refused
 * at the door, month arithmetic is exact at year and leap boundaries (the
 * report's Google window depends on it), pending-approval durations are
 * counted plainly, and a report cannot be published without a real
 * executive summary.
 */

import {
  ACTIVITY_FIELD_MAX,
  assembleReportData,
  cleanActivity,
  isMonthKey,
  monthBounds,
  monthLabel,
  parseDeliverableStatus,
  parseSeoCategory,
  previousMonthKey,
  publishProblem,
  REPORT_TOP_ROWS,
  REPORT_ACTIVITY_CAP,
  waitingDays,
  type SeoReportData,
} from '@/lib/seoWork';

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

console.log('\n— vague activity entries are refused at the door —');

const good = cleanActivity({
  category: 'on_page',
  work: '  Rewrote the services page title and description around "web design Noida"  ',
  reason: 'The old title duplicated the homepage and neither ranked.',
  evidence: 'https://client.in/services',
  result: '',
  happenedOn: '2026-08-12',
});
check('a real entry passes', 'activity' in good);
if ('activity' in good) {
  check('whitespace is collapsed and trimmed', !good.activity.work.startsWith(' ') && !good.activity.work.includes('  '));
  check('the category is kept', good.activity.category === 'on_page');
  check('the date is kept', good.activity.happenedOn === '2026-08-12');
  check('an empty result is allowed — results come later', good.activity.result === '');
}
check('"On-page SEO completed" is refused as vague',
  'error' in cleanActivity({ category: 'on_page', work: 'On-page SEO done', reason: 'Because it was needed for the site.', evidence: '', result: '', happenedOn: '' }));
check('a missing reason is refused',
  'error' in cleanActivity({ category: 'technical', work: 'Fixed every broken internal link the audit found on the site.', reason: 'ok', evidence: '', result: '', happenedOn: '' }));
const longEntry = cleanActivity({
  category: 'content',
  work: 'x'.repeat(2000) + ' real work described here',
  reason: 'a perfectly reasonable explanation',
  evidence: '',
  result: '',
  happenedOn: 'not-a-date',
});
check('over-long fields are capped', 'activity' in longEntry && longEntry.activity.work.length <= ACTIVITY_FIELD_MAX);
check('a bad date reads as null (storage stamps today)', 'activity' in longEntry && longEntry.activity.happenedOn === null);
check('an unknown category falls back to other', parseSeoCategory('growth-hacking') === 'other');
check('a known category parses', parseSeoCategory('technical') === 'technical');

console.log('\n— deliverable statuses and pending durations —');

check('a known status parses', parseDeliverableStatus('waiting_client') === 'waiting_client');
check('an unknown status is null, not a guess', parseDeliverableStatus('blocked') === null);
check('nothing waiting reads as null', waitingDays(null) === null);
check('same-day waiting is 0 days', waitingDays('2026-08-29T08:00:00Z', new Date('2026-08-29T18:00:00Z')) === 0);
check('three days is three days', waitingDays('2026-08-26T10:00:00Z', new Date('2026-08-29T11:00:00Z')) === 3);
check('garbage since reads as null', waitingDays('not-a-time') === null);

console.log('\n— month arithmetic is exact at the boundaries —');

check('a month key validates', isMonthKey('2026-03'));
check('a 13th month does not', !isMonthKey('2026-13'));
check('junk does not', !isMonthKey('march-2026'));

const march = monthBounds('2026-03');
check('March runs 01 to 31', march.from === '2026-03-01' && march.to === '2026-03-31');
check('its comparison month is February, 28 days', march.prevFrom === '2026-02-01' && march.prevTo === '2026-02-28');
check('its exclusive end is April 1st', march.endExclusive === '2026-04-01');
const january = monthBounds('2026-01');
check('January compares against last year\'s December',
  january.prevFrom === '2025-12-01' && january.prevTo === '2025-12-31');
const leapMarch = monthBounds('2028-03');
check('a leap February keeps its 29th', leapMarch.prevTo === '2028-02-29');
check('the default report month is the one that just finished',
  previousMonthKey(new Date('2026-01-15T12:00:00Z')) === '2025-12');
check('and it crosses the year boundary correctly',
  previousMonthKey(new Date('2026-08-29T12:00:00Z')) === '2026-07');
check('a month labels itself readably', monthLabel('2026-03') === 'March 2026');

console.log('\n— the report snapshot keeps its honesty rules —');

const baseData: SeoReportData = {
  search: {
    property: 'sc-domain:client.in',
    totals: { clicks: 10, impressions: 300, ctr: 0.03, position: 8.2 },
    previousTotals: null,
    topQueries: Array.from({ length: 30 }, (_, i) => ({ key: `q${i}`, clicks: i, impressions: i, ctr: 0, position: 1 })),
    topPages: [],
    pagesInSearch: 12,
  },
  audit: null,
  activities: Array.from({ length: 150 }, (_, i) => ({
    category: 'technical' as const,
    work: `work ${i}`,
    reason: 'r',
    evidence: '',
    result: '',
    happenedOn: '2026-08-01',
  })),
  deliverablesDone: [{ title: 'Two optimised pages', status: 'done' }],
  deliverablesOpen: [],
};
const assembled = assembleReportData(baseData);
check('top query lists are capped for storage', assembled.search!.topQueries.length === REPORT_TOP_ROWS);
check('activity lists are capped for storage', assembled.activities.length === REPORT_ACTIVITY_CAP);
check('unreadable search data stays null — never zeros',
  assembleReportData({ ...baseData, search: null }).search === null);
check('deliverables pass through', assembled.deliverablesDone[0]?.title === 'Two optimised pages');

check('publishing without a summary is refused', publishProblem({ summary: '' }) !== null);
check('a token summary is still refused', publishProblem({ summary: 'Good month.' }) !== null);
check('a real summary publishes',
  publishProblem({ summary: 'Clicks grew steadily on the back of the services-page rewrite; February focuses on the location pages.' }) === null);

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
