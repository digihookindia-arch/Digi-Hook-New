import {
  DEFAULT_GST_PERCENT,
  cleanGstPercent,
  formatInr,
  gstOn,
  gstShares,
  toPaise,
} from '@/lib/money';

/**
 * GST reaches a client's invoice and a payment gateway, so these pin the two
 * properties that matter: the rows of a schedule add up to the tax on the
 * whole (a client adds the column up), and a schedule that cannot be split
 * honestly produces no figure at all rather than a confident wrong one.
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

const sum = (values: (number | null)[]) =>
  values.reduce((total: number, n) => total + (n ?? 0), 0);

console.log('\ngstOn');
{
  const g = gstOn(20000);
  check('adds 18% by default', g.gst === 3600 && g.total === 23600, g);
  check('reports the rate it used', g.gstPercent === DEFAULT_GST_PERCENT);
  check('an explicit rate is honoured', gstOn(10000, 5).total === 10500);
  check('a zero rate leaves the figure alone', gstOn(10000, 0).total === 10000);
  check('rounds tax to whole rupees', Number.isInteger(gstOn(20833, 18).gst));
  check('subtotal is rounded before tax', gstOn(999.4, 18).subtotal === 999);
}

console.log('\ncleanGstPercent');
{
  check('passes a real rate through', cleanGstPercent(18) === 18);
  check('accepts a numeric string', cleanGstPercent('12') === 12);
  check('rounds a fractional rate', cleanGstPercent(17.6) === 18);
  check('clamps a negative rate to zero', cleanGstPercent(-5) === 0);
  check('clamps an absurd rate', cleanGstPercent(900) === 40);
  check('nonsense falls back to the default', cleanGstPercent('lots') === 18);
  check('null falls back to the default', cleanGstPercent(null) === 18);
}

console.log('\ngstShares');
{
  // 20/30/50 of ₹1,00,001 — deliberately odd, so per-row rounding drifts.
  const subtotals = [20000, 30000, 50001];
  const shares = gstShares(subtotals, 18);
  const whole = gstOn(sum(subtotals), 18).gst;
  check('rows add up to the tax on the whole', sum(shares) === whole, {
    shares,
    whole,
  });
  check('every row has a figure', shares.every((n) => n !== null), shares);
  check(
    'only the last row absorbs the difference',
    shares[0] === 3600 && shares[1] === 5400,
    shares
  );

  const partial = gstShares([20000, null, 50000], 18);
  check('a row with no subtotal has no tax', partial[1] === null, partial);
  check(
    'an incomplete schedule is left un-reconciled',
    partial[0] === 3600 && partial[2] === 9000,
    partial
  );

  check('an empty schedule is empty', gstShares([], 18).length === 0);
  check('a zero rate produces zeros', sum(gstShares([1000, 2000], 0)) === 0);
}

console.log('\nformatInr and toPaise');
{
  check('groups in the Indian system', formatInr(185000) === '₹1,85,000', formatInr(185000));
  check('rounds to whole rupees', formatInr(999.6) === '₹1,000', formatInr(999.6));
  check('zero renders as zero', formatInr(0) === '₹0');
  check('paise are whole', toPaise(23600) === 2360000);
  check('paise round the rupee first', toPaise(999.6) === 100000);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
