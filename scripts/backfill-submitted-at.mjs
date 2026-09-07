#!/usr/bin/env node
/**
 * Recovers the real submission time for leads imported before `submitted_at`
 * existed.
 *
 * Those rows show the moment they were imported, which for a backfilled sheet
 * is the same minute for every one of them — so the dashboard listed seventy
 * leads all apparently submitted together, and sorted them by an accident of
 * import order.
 *
 * Nothing is fetched: the sheet's own `created_time` was already stored in each
 * row's summary as the "Submitted" line, so this reads it back out and
 * normalises it to a UTC instant. Rows that already carry a `submitted_at`, or
 * whose summary has no usable timestamp, are left exactly as they are.
 *
 *   node scripts/backfill-submitted-at.mjs [--commit]
 *
 * Without --commit it prints what it would change and writes nothing.
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, '');
}

const commit = process.argv.includes('--commit');
const file = resolve(process.env.SQLITE_PATH ?? 'data/digihook.db');
const db = new DatabaseSync(file);

/** Same rule as lib/leadCrm.ts — kept in step deliberately, not imported. */
function parseInstant(raw) {
  const value = (raw ?? '').trim();
  if (!value) return null;
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const parsed = new Date(zoned ? value.replace(' ', 'T') : `${value.replace(' ', 'T')}+05:30`);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getUTCFullYear();
  if (year < 2000 || year > 2100) return null;
  return parsed.toISOString();
}

const rows = db
  .prepare(
    `SELECT id, created_at, summary FROM enquiries
      WHERE submitted_at IS NULL OR submitted_at = ''`
  )
  .all();

let fixed = 0;
let skipped = 0;
const update = db.prepare('UPDATE enquiries SET submitted_at = ? WHERE id = ?');

for (const row of rows) {
  let submitted = null;
  try {
    const summary = JSON.parse(row.summary);
    const line = summary.find((entry) => entry.label === 'Submitted');
    submitted = parseInstant(line?.value);
  } catch {
    // A summary that will not parse is not a reason to stop; the row keeps
    // falling back to created_at, which is what it did before this ran.
  }

  // No usable timestamp means we genuinely do not know when they enquired.
  // created_at is the honest stand-in, and writing it explicitly would only
  // dress a guess up as a fact — so leave the column null and let the read
  // path fall back.
  if (!submitted) {
    skipped++;
    continue;
  }

  const drift = Math.round(
    (new Date(row.created_at).getTime() - new Date(submitted).getTime()) / 86_400_000
  );
  console.log(
    `${row.id.slice(0, 8)}  imported ${row.created_at.slice(0, 10)}  ` +
      `submitted ${submitted.slice(0, 10)}  (${drift} days earlier)`
  );

  if (commit) update.run(submitted, row.id);
  fixed++;
}

console.log(
  `\n${commit ? 'Updated' : 'Would update'} ${fixed} row(s); ` +
    `${skipped} left alone (no usable timestamp).`
);
if (!commit) console.log('Re-run with --commit to write.');
