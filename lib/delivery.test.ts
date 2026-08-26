import {
  parseAssets,
  parseMilestones,
  parseStages,
  parseAmount,
  milestoneAmounts,
  totalPercent,
  seedStages,
  type Milestone,
} from '@/lib/delivery';

/**
 * The delivery lists reach a client-facing page and are written from a JSON
 * payload the dashboard posts, so these pin the two properties that matter:
 * a crafted payload cannot put a value into the database that the schema does
 * not define, and a total that cannot be split honestly produces no rupee
 * figure at all rather than a confident wrong one.
 */

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

const split = (percents: number[]): Milestone[] =>
  percents.map((percent, i) => ({
    label: `payment ${i + 1}`,
    percent,
    status: 'pending',
    note: '',
    amount: null,
  }));

/** A split with an exact rupee figure fixed on one row. */
const withAmount = (
  milestones: Milestone[],
  index: number,
  amount: number
): Milestone[] =>
  milestones.map((m, i) => (i === index ? { ...m, amount } : m));

console.log('\n— a posted payload cannot smuggle values past the schema —');

check('an unknown asset status falls back to pending',
  parseAssets([{ label: 'Logo', detail: '', status: 'secretly-approved' }])[0]?.status === 'pending');
check('an unknown milestone status falls back to pending',
  parseMilestones([{ label: 'Advance', percent: 20, status: 'refunded' }])[0]?.status === 'pending');
check('an unknown stage status falls back to pending',
  parseStages([{ label: 'Build', detail: '', status: 'shipped' }])[0]?.status === 'pending');
check('a percentage above 100 is clamped',
  parseMilestones([{ label: 'X', percent: 5000, status: 'paid' }])[0]?.percent === 100);
check('a negative percentage is clamped',
  parseMilestones([{ label: 'X', percent: -40, status: 'paid' }])[0]?.percent === 0);
check('a non-numeric percentage becomes 0',
  parseMilestones([{ label: 'X', percent: 'lots', status: 'paid' }])[0]?.percent === 0);
check('extra keys are stripped rather than stored',
  JSON.stringify(
    Object.keys(parseAssets([{ label: 'L', detail: 'd', status: 'received', isAdmin: true }])[0] ?? {}).sort()
  ) === JSON.stringify(['detail', 'label', 'status']));

console.log('\n— malformed input degrades to nothing, it does not throw —');

check('unlabelled rows are dropped', parseAssets([{ label: '   ', detail: 'x' }]).length === 0);
check('a non-array payload yields no rows', parseStages('not json at all').length === 0);
check('invalid JSON from the database yields no rows', parseMilestones('{oops').length === 0);
check('null rows do not throw',
  parseAssets([null, { label: 'Ok', detail: '', status: 'received' }]).length === 1);
check('the row count is capped',
  parseAssets(Array.from({ length: 200 }, (_, i) => ({ label: `A${i}`, detail: '', status: 'pending' }))).length === 40);
check('overlong text is truncated',
  parseAssets([{ label: 'L', detail: 'x'.repeat(9999), status: 'pending' }])[0]?.detail.length === 400);

console.log('\n— a total that cannot be split honestly yields no figure —');

check('a single rupee figure parses', parseAmount('₹30,000 (excluding GST)') === 30000);
check('a GST percentage does not confuse it', parseAmount('₹1,85,000 + 18% GST') === 185000);
check('a range refuses to guess', parseAmount('₹5,000 – ₹10,000') === null);
check('prose with no figure refuses', parseAmount('On application') === null);
check('a bare number still parses', parseAmount('45,000') === 45000);
check('an unsplittable total yields no amounts',
  milestoneAmounts('₹5,000 – ₹10,000', split([20, 30, 50])).every((a) => a === null));

console.log('\n— milestone amounts —');

check('the standard 20/30/50 split of ₹30,000',
  JSON.stringify(milestoneAmounts('₹30,000', split([20, 30, 50]))) ===
    JSON.stringify(['₹6,000', '₹9,000', '₹15,000']));
check('amounts are grouped the Indian way',
  milestoneAmounts('₹18,50,000', split([100]))[0] === '₹18,50,000');

const drifted = milestoneAmounts('₹1,00,001', split([33, 33, 34]));
const summed = drifted.reduce((total, a) => total + Number((a ?? '0').replace(/[₹,]/g, '')), 0);
check('rounding drift lands on the last row so the parts sum to the total exactly',
  summed === 100001, { drifted, summed });

check('percentages short of 100 are left alone rather than fudged up to the total',
  JSON.stringify(milestoneAmounts('₹30,000', split([20]))) === JSON.stringify(['₹6,000']));
check('totalPercent adds the split up', totalPercent(split([20, 30, 50])) === 100);

console.log('\n— exact rupee overrides —');

check('a fixed amount wins over the percent-derived figure',
  milestoneAmounts('₹30,000', withAmount(split([20, 30, 50]), 0, 7000))[0] === '₹7,000');
check('rows without an override still derive from the total beside a fixed one',
  milestoneAmounts('₹30,000', withAmount(split([20, 30, 50]), 0, 7000))[1] === '₹9,000');
check('a fixed amount shows a figure even when the total is a range',
  milestoneAmounts('₹5,000 – ₹10,000', withAmount(split([0]), 0, 7500))[0] === '₹7,500');
check('drift correction stays out of a schedule with a hand-set figure',
  JSON.stringify(milestoneAmounts('₹1,00,001', withAmount(split([33, 33, 34]), 0, 33000))) ===
    JSON.stringify(['₹33,000', '₹33,000', '₹34,000']));
check('rows stored before the amount column read back as derive-from-total',
  parseMilestones([{ label: 'Advance', percent: 20, status: 'pending', note: '' }])[0]?.amount === null);
check('a posted amount survives the parse, rounded to whole rupees',
  parseMilestones([{ label: 'X', percent: 0, status: 'pending', note: '', amount: 4999.6 }])[0]?.amount === 5000);
check('a negative posted amount is dropped, not clamped to a figure',
  parseMilestones([{ label: 'X', percent: 0, status: 'pending', note: '', amount: -500 }])[0]?.amount === null);
check('a garbage posted amount is dropped',
  parseMilestones([{ label: 'X', percent: 0, status: 'pending', note: '', amount: 'lots' }])[0]?.amount === null);

console.log('\n— stages seed from the proposal timeline —');

const stages = seedStages([
  { phase: 'Discovery', duration: '1 week', deliverable: 'Sitemap agreed.' },
  { phase: 'Build', duration: '3 weeks', deliverable: 'Pages built.' },
]);
check('one stage per timeline phase', stages.length === 2);
check('the phase name and deliverable carry over',
  stages[0]?.label === 'Discovery' && stages[0]?.detail === 'Sitemap agreed.');
check('every seeded stage starts as not started',
  stages.every((s) => s.status === 'pending'));

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
