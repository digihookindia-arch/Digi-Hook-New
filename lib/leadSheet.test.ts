import { mapSheetRows, parseCsv, humanise } from '@/lib/leadSheet';

/**
 * The column mapping is the part most likely to be wrong — a Meta lead form's
 * headers are whatever the form was built with, and they change whenever
 * somebody edits it. These pin the properties that matter: a row without a
 * dedupe key never imports (or it would arrive again tomorrow, and the person
 * would be messaged again with it), header formatting does not decide whether
 * a lead is seen, and Meta's own seeded test submission never becomes a person
 * in the pipeline.
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

/**
 * The studio's real Meta lead form, header for header. The live sheet also
 * carries the ad / adset / form id columns; none of them are mapped, so
 * leaving them out here changes nothing and keeps the fixtures readable.
 */
const HEADER = [
  'id',
  'created_time',
  'platform',
  'campaign_name',
  'which_type_of_website_do_you_need?',
  'do_you_already_have_a_domain_name?',
  'preferred_timeline_for_launching_the_website?',
  'any_special_features_you_are_looking_for?',
  'email',
  'full_name',
  'phone_number',
  'lead_status',
];

/** A row in that column order. */
const row = (
  id: string,
  name: string,
  type = 'business_website',
  phone = '+919812345678'
) => [
  id,
  '2026-09-07T04:00:00Z',
  'ig',
  'Sept Leads',
  type,
  'yes',
  'within_2_weeks',
  'Online booking',
  'x@example.com',
  name,
  phone,
  'CREATED',
];

console.log('\n— a normal sheet —');
{
  const { leads, skipped } = mapSheetRows([
    HEADER,
    row('l_1', 'Ketan Shah'),
    row('l_2', 'Richa', 'business_website', '9812345678'),
  ]);
  check('every complete row becomes a lead', leads.length === 2, leads.length);
  check('nothing is skipped', skipped === 0, skipped);
  check('the dedupe key is carried', leads[0]?.externalId === 'l_1');
  check('the name is read', leads[0]?.name === 'Ketan Shah');
  check('the phone is read', leads[1]?.phone === '9812345678', leads[1]?.phone);
}

console.log('\n— the form answers become a brief —');
{
  const { leads } = mapSheetRows([HEADER, row('l_1', 'Ketan Shah', 'e-commerce_website')]);
  const first = leads[0];
  check('all four questions come through', first?.answers.length === 4, first?.answers);
  check(
    '  machine values are humanised',
    first?.answers[0]?.value === 'E commerce website',
    first?.answers[0]
  );
  check(
    '  and are labelled for a human to read',
    first?.answers[0]?.label === 'Type of website',
    first?.answers[0]
  );
  check(
    '  the timeline comes through',
    first?.answers[2]?.value === 'Within 2 weeks',
    first?.answers[2]
  );
  check('the ad platform is kept for attribution', first?.platform === 'ig');
  check('the campaign is kept', first?.campaign === 'Sept Leads');
  // Meta's own lifecycle column. Importing it as a status would put "CREATED"
  // where the studio's sales status belongs, and the sheet is read-only, so
  // nothing we ever did could move it off that value.
  check('lead_status is NOT imported', !JSON.stringify(first).includes('CREATED'), first);
}

console.log('\n— unanswered questions —');
{
  // Optional questions come back blank, and a blank line in a brief reads as a
  // gap in the form rather than as an answer.
  const sparse = row('l_6', 'Meera');
  sparse[5] = '';
  sparse[7] = '';
  const { leads } = mapSheetRows([HEADER, sparse]);
  check(
    'blank answers are dropped, not rendered empty',
    leads[0]?.answers.length === 2,
    leads[0]?.answers
  );
  check(
    'and the answered ones keep their labels',
    leads[0]?.answers.map((a) => a.label).join('|') === 'Type of website|Timeline',
    leads[0]?.answers
  );
}

console.log('\n— headers as people actually write them —');
{
  // Meta writes snake_case; a person tidying the sheet writes title case.
  // Either must find the same columns.
  const { leads } = mapSheetRows([
    [
      'ID',
      'Created Time',
      'Platform',
      'Campaign Name',
      'Which type of website do you need?',
      'Do you already have a domain name?',
      'Preferred timeline for launching the website?',
      'Any special features you are looking for?',
      'Email',
      'Full Name',
      'Phone Number',
      'Lead Status',
    ],
    row('l_9', 'Halilur'),
  ]);
  check(
    'case and spacing in headers do not matter',
    leads[0]?.name === 'Halilur' && leads[0]?.email === 'x@example.com',
    leads[0]
  );
  check('and the questions still map', leads[0]?.answers.length === 4, leads[0]?.answers);
}

console.log('\n— the seeded test lead —');
{
  const { leads, testLeads, skipped } = mapSheetRows([
    HEADER,
    row('l_1', 'Ketan Shah'),
    // Meta ships every form with one of these. It has an id and a name, so the
    // sentinel is the only thing keeping it out of the pipeline.
    [
      't_1',
      '',
      '',
      '',
      '<test lead: dummy data for which_type_of_website_do_you_need',
      '',
      '',
      '',
      '',
      '<test lead: dummy data for full_name',
      '',
      '',
    ],
  ]);
  check('the real lead imports', leads.length === 1, leads.length);
  check('the seeded test lead is ignored', testLeads === 1, testLeads);
  check('and is not miscounted as a broken row', skipped === 0, skipped);
}

console.log('\n— rows that must not import —');
{
  const { leads, skipped } = mapSheetRows([
    HEADER,
    row('', 'No Id Person'),
    row('l_3', ''),
    // A Sheets export routinely ends with one of these. Nobody needs to look
    // into it, so it must not be reported as an unusable row.
    new Array(12).fill(''),
    row('l_4', 'Good Lead'),
  ]);
  check('a row with no id is refused', !leads.some((l) => l.name === 'No Id Person'));
  check('a row with no name is refused', !leads.some((l) => l.externalId === 'l_3'));
  check(
    'only the usable row survives',
    leads.length === 1 && leads[0]?.externalId === 'l_4',
    leads.map((l) => l.externalId)
  );
  check('the two damaged rows are counted', skipped === 2, skipped);
  check('  and the wholly blank one is not', skipped === 2, skipped);
}

console.log('\n— degenerate sheets —');
{
  check('an empty sheet yields nothing', mapSheetRows([]).leads.length === 0);
  check('headers with no rows yield nothing', mapSheetRows([HEADER]).leads.length === 0);
  check(
    'the headers are reported back for diagnosis',
    mapSheetRows([HEADER]).headers.length === HEADER.length
  );

  // A ragged export is normal: Sheets omits trailing empty cells.
  const { leads, skipped } = mapSheetRows([
    HEADER,
    ['l_5', '2026-09-07', 'ig', 'Sept Leads', 'business_website'],
  ]);
  check('a truncated row does not throw', leads.length === 0 && skipped === 1, {
    leads,
    skipped,
  });
  check('  (having no name, it is refused rather than half-imported)', leads.length === 0);
}

console.log('\n— the CSV the public export actually returns —');
{
  const csv = [
    '"id","full_name","email","phone_number","any_special_features_you_are_looking_for?"',
    '"l_7","Sameer Kumar","s@example.com","+919812345678","Booking, payments, and a blog"',
  ].join('\n');
  const { leads } = mapSheetRows(parseCsv(csv));
  check(
    'quoted commas do not split a cell',
    leads[0]?.answers[0]?.value === 'Booking, payments, and a blog',
    leads[0]?.answers
  );
  check('and the lead is otherwise intact', leads[0]?.name === 'Sameer Kumar');
  check(
    'a sheet without the ad columns reports nothing rather than inventing it',
    leads[0]?.campaign === '' && leads[0]?.createdAt === null,
    leads[0]
  );
}

console.log('\n— humanise —');
{
  check('underscores become spaces', humanise('within_2_weeks') === 'Within 2 weeks');
  check('hyphens too', humanise('e-commerce_website') === 'E commerce website');
  check('free text is left alone', humanise('Online booking') === 'Online booking');
  check('blank stays blank', humanise('   ') === '');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
