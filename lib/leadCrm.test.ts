import {
  byFollowUp,
  cleanFollowUp,
  followUpState,
  formatFollowUp,
  istNow,
} from '@/lib/leadCrm';

/**
 * The bug this file exists to catch is a follow-up drifting by five and a half
 * hours because something re-derived it in the server's zone. Every check here
 * fixes "now" explicitly, so the suite says the same thing on a laptop in Noida
 * and on a VPS in UTC.
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

console.log('\n— what the date picker posts —');
{
  check('a plain datetime-local value is kept verbatim',
    cleanFollowUp('2026-09-10T10:30') === '2026-09-10T10:30');
  check('seconds are trimmed, not rejected',
    cleanFollowUp('2026-09-10T10:30:00') === '2026-09-10T10:30');
  check('surrounding space is ignored',
    cleanFollowUp('  2026-09-10T10:30  ') === '2026-09-10T10:30');

  // Clearing the field is a real action, not a failed one.
  check('empty means no follow-up', cleanFollowUp('') === null);
  check('and so does absent', cleanFollowUp(null) === null && cleanFollowUp(undefined) === null);
}

console.log('\n— input that must be refused —');
{
  check('a date with no time', cleanFollowUp('2026-09-10') === null);
  check('free text', cleanFollowUp('thursday morning') === null);
  check('a 25th hour', cleanFollowUp('2026-09-10T25:00') === null);
  check('a 60th minute', cleanFollowUp('2026-09-10T10:60') === null);
  check('month 13', cleanFollowUp('2026-13-01T10:00') === null);
  check('31 February', cleanFollowUp('2026-02-31T10:00') === null, cleanFollowUp('2026-02-31T10:00'));
  check('30 February in a leap year is still not a day',
    cleanFollowUp('2028-02-30T10:00') === null);
  check('29 February in a leap year is', cleanFollowUp('2028-02-29T10:00') === '2028-02-29T10:00');
  // A mistyped year is the one that silently sorts to the top forever.
  check('a year that is obviously a typo', cleanFollowUp('0202-09-10T10:00') === null);
}

console.log('\n— now, in Noida —');
{
  // 2026-09-07T23:45 UTC is already the 8th, 5:15am, in India. A server that
  // reported its own midnight here would call tomorrow's calls "today".
  check('UTC late evening is already tomorrow morning in IST',
    istNow(new Date('2026-09-07T23:45:00Z')) === '2026-09-08T05:15',
    istNow(new Date('2026-09-07T23:45:00Z')));
  check('and the offset is exactly 5h30m',
    istNow(new Date('2026-01-01T00:00:00Z')) === '2026-01-01T05:30');
  // No daylight saving in India, so mid-summer must be identical.
  check('midsummer is the same offset — India has no DST',
    istNow(new Date('2026-06-21T00:00:00Z')) === '2026-06-21T05:30');
}

console.log('\n— overdue, today, upcoming —');
{
  const now = '2026-09-10T11:00';
  check('no date set', followUpState(null, now) === 'none');
  check('this morning, already past', followUpState('2026-09-10T10:30', now) === 'overdue');
  check('later this afternoon', followUpState('2026-09-10T16:00', now) === 'today');
  check('tomorrow', followUpState('2026-09-11T09:00', now) === 'upcoming');
  check('last week', followUpState('2026-09-03T09:00', now) === 'overdue');

  // The point of comparing on the minute: a list that only turns red at
  // midnight is useless to somebody working through a morning call sheet.
  check('overdue is decided on the minute, not the day',
    followUpState('2026-09-10T10:59', now) === 'overdue', followUpState('2026-09-10T10:59', now));
  check('the exact minute has not passed yet',
    followUpState('2026-09-10T11:00', now) === 'today');
  check('unparseable is treated as unset, never as due',
    followUpState('thursday', now) === 'none');
}

console.log('\n— how it reads on screen —');
{
  check('morning', formatFollowUp('2026-09-10T10:30') === 'Thu 10 Sep, 10:30 am',
    formatFollowUp('2026-09-10T10:30'));
  check('afternoon', formatFollowUp('2026-09-10T16:05') === 'Thu 10 Sep, 4:05 pm',
    formatFollowUp('2026-09-10T16:05'));
  check('midnight is 12 am, not 0 am',
    formatFollowUp('2026-09-10T00:15') === 'Thu 10 Sep, 12:15 am',
    formatFollowUp('2026-09-10T00:15'));
  check('noon is 12 pm, not 0 pm',
    formatFollowUp('2026-09-10T12:00') === 'Thu 10 Sep, 12:00 pm',
    formatFollowUp('2026-09-10T12:00'));
  check('nothing set prints nothing', formatFollowUp(null) === '');
}

console.log('\n— the call sheet order —');
{
  const now = '2026-09-10T11:00';
  const rows = [
    { id: 'none', followUpAt: null },
    { id: 'tomorrow', followUpAt: '2026-09-11T09:00' },
    { id: 'overdue-old', followUpAt: '2026-09-03T09:00' },
    { id: 'later-today', followUpAt: '2026-09-10T16:00' },
    { id: 'overdue-recent', followUpAt: '2026-09-10T10:30' },
  ];
  const order = byFollowUp(rows, now).map((r) => r.id);
  check('overdue first, oldest of those first',
    order.join(' > ') === 'overdue-old > overdue-recent > later-today > tomorrow > none',
    order);

  // An unscheduled lead is the one most likely to be forgotten, so it sinks
  // rather than vanishing.
  check('leads with no date are kept, at the bottom',
    order.includes('none') && order[order.length - 1] === 'none');
  check('the input array is not mutated',
    rows[0]?.id === 'none', rows.map((r) => r.id));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
