import { istDate, istDateTime, istShort, istTime, istToday, onDate } from '@/lib/when';

/**
 * These run on a laptop in India and on a VPS in UTC and must agree. Every
 * check therefore uses a value whose IST rendering differs from its UTC one —
 * a late-evening instant — because a test built on a midday timestamp passes
 * whether or not the zone was ever set.
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

console.log('\n— an instant, in Noida —');
{
  // 17:36 UTC is 23:06 the same day in Noida. Renders identically either way
  // on the date, so it is the weaker of the two cases.
  const evening = '2026-09-07T17:36:00Z';
  check('the time converts', istTime(evening) === '11:06 pm', istTime(evening));
  check('the date holds', istDate(evening) === '7 Sep 2026', istDate(evening));

  // 20:30 UTC is already 2am the NEXT day in Noida. This is the case that
  // catches a missing timeZone: a UTC server would say the 7th.
  const lateNight = '2026-09-07T20:30:00Z';
  check('a late-night instant rolls to the next day in IST',
    istDate(lateNight) === '8 Sep 2026', istDate(lateNight));
  check('and its time is 2:00 am', istTime(lateNight) === '2:00 am', istTime(lateNight));
  check('date and time together',
    istDateTime(lateNight) === '8 Sep 2026, 2:00 am', istDateTime(lateNight));
  check('the short form drops the year',
    istShort(lateNight) === '8 Sep, 2:00 am', istShort(lateNight));

  // The studio's own data: the newest lead in the sheet.
  check('a real lead timestamp reads as the studio saw it',
    istDateTime('2026-09-07T09:36:15.000Z') === '7 Sep 2026, 3:06 pm',
    istDateTime('2026-09-07T09:36:15.000Z'));
}

console.log('\n— a plain date is not moved —');
{
  // The trap: running a YYYY-MM-DD through an instant formatter shifts it.
  check('a due date renders as itself', onDate('2026-09-07') === '7 Sep 2026',
    onDate('2026-09-07'));
  check('the first of a month does not slip backwards',
    onDate('2026-01-01') === '1 Jan 2026', onDate('2026-01-01'));
  check('nor does the first of a year',
    onDate('2026-12-31') === '31 Dec 2026', onDate('2026-12-31'));
  check('a longer ISO string is trimmed to its day',
    onDate('2026-09-07T23:59:59Z') === '7 Sep 2026', onDate('2026-09-07T23:59:59Z'));
}

console.log('\n— today, in Noida —');
{
  // 19:00 UTC on the 7th is already the 8th in India. Defaulting a date to
  // "today" from toISOString would file an evening's work on the day before.
  check('a September evening is already tomorrow',
    istToday(new Date('2026-09-07T19:00:00Z')) === '2026-09-08',
    istToday(new Date('2026-09-07T19:00:00Z')));
  check('an afternoon is still today',
    istToday(new Date('2026-09-07T12:00:00Z')) === '2026-09-07');
  check('and the boundary is 18:30 UTC exactly',
    istToday(new Date('2026-09-07T18:29:00Z')) === '2026-09-07' &&
      istToday(new Date('2026-09-07T18:30:00Z')) === '2026-09-08');
}

console.log('\n— input that cannot be read —');
{
  // "Invalid Date" on a client's invoice is worse than an empty cell.
  for (const [name, fn] of [
    ['istDate', istDate],
    ['istDateTime', istDateTime],
    ['istShort', istShort],
    ['istTime', istTime],
    ['onDate', onDate],
  ] as const) {
    check(`  ${name}: null is blank`, fn(null) === '');
    check(`  ${name}: empty is blank`, fn('') === '');
    check(`  ${name}: nonsense is blank, never "Invalid Date"`, fn('not a date') === '');
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
