import { mapSheetRows } from '@/lib/leadSheet';

/**
 * The column mapping is the part most likely to be wrong — a Meta lead form's
 * headers are whatever the form was built with, and they change whenever
 * somebody edits it. These pin the two properties that matter: a row without a
 * dedupe key never imports (or it would arrive again tomorrow, and be messaged
 * again with it), and header formatting does not decide whether a lead is
 * seen.
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

// The defaults the code ships with, which is what an unconfigured install uses.
const HEADER = ['id', 'created_time', 'full_name', 'email', 'phone_number'];

console.log('\n— a normal sheet —');
{
  const { leads, skipped } = mapSheetRows([
    HEADER,
    ['l_1', '2026-09-07T04:00:00Z', 'Ketan Shah', 'ketan@example.com', '+919873674517'],
    ['l_2', '2026-09-07T05:00:00Z', 'Richa', 'richa@example.com', '9812345678'],
  ]);
  check('every complete row becomes a lead', leads.length === 2, leads.length);
  check('nothing is skipped', skipped === 0);
  check('the dedupe key is carried', leads[0]?.externalId === 'l_1');
  check('the name is read', leads[0]?.name === 'Ketan Shah');
  check('the phone is read', leads[1]?.phone === '9812345678');
}

console.log('\n— headers as people actually write them —');
{
  const { leads } = mapSheetRows([
    ['ID', 'Created Time', 'Full Name', 'E-mail', 'Phone Number'],
    ['l_9', '2026-09-07', 'Halilur', 'h@example.com', '9812345678'],
  ]);
  // "E-mail" does not match the configured "email" once punctuation is
  // stripped, so the address is simply absent rather than mis-assigned.
  check('case and spacing in headers do not matter',
    leads[0]?.name === 'Halilur' && leads[0]?.externalId === 'l_9', leads[0]);
}

console.log('\n— rows that must not import —');
{
  const { leads, skipped } = mapSheetRows([
    HEADER,
    ['', '2026-09-07', 'No Id Person', 'x@example.com', '9812345678'],
    ['l_3', '2026-09-07', '', 'y@example.com', '9812345678'],
    ['', '', '', '', ''],
    ['l_4', '2026-09-07', 'Good Lead', 'z@example.com', '9812345678'],
  ]);
  check('a row with no id is refused', !leads.some((l) => l.name === 'No Id Person'));
  check('a row with no name is refused', !leads.some((l) => l.externalId === 'l_3'));
  check('only the usable row survives', leads.length === 1 && leads[0]?.externalId === 'l_4', leads);
  check('a wholly blank row is not counted as a problem', skipped === 2, skipped);
}

console.log('\n— degenerate sheets —');
{
  check('an empty sheet yields nothing', mapSheetRows([]).leads.length === 0);
  check('headers with no rows yield nothing', mapSheetRows([HEADER]).leads.length === 0);
  check('the headers are reported back for diagnosis',
    mapSheetRows([HEADER]).headers.length === 5);

  // A ragged export is normal: Sheets omits trailing empty cells.
  const { leads } = mapSheetRows([HEADER, ['l_5', '2026-09-07', 'Short Row']]);
  check('a short row does not throw and keeps what it has',
    leads[0]?.name === 'Short Row' && leads[0]?.email === '', leads[0]);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
