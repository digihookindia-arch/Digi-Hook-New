#!/usr/bin/env node
/**
 * Corrects the welcome stamps left by the backfill, and releases the leads
 * that should have been messaged.
 *
 * Two separate wrongs, both from `welcomed_at` having meant two things:
 *
 * 1. **The backlog is marked as thanked and was not.** The backfill set
 *    `welcomed_at`, which the lead page reads as "Thank-you sent" — so the
 *    dashboard claimed every imported stranger had heard from the studio.
 *    Moves those to `welcome_skipped_at`, which says what actually happened.
 *
 * 2. **Leads that arrived after the backfill were skipped too**, because the
 *    crontab was still running `?backfill=1`. Clearing both stamps puts them
 *    back in line for the next sync, which will now message them.
 *
 * Safe to assume nothing was ever sent: the WhatsApp template was rejecting
 * every message over a parameter mismatch, and the send log confirms it.
 *
 *   node scripts/fix-welcome-stamps.mjs [--after 2026-09-07T11] [--commit]
 *
 * `--after` is the import cutoff separating the backfill batch from later
 * arrivals; rows created at or before it are treated as backlog. Without
 * `--commit` it reports and writes nothing.
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, '');
}

const argv = process.argv.slice(2);
const commit = argv.includes('--commit');
const afterFlag = argv.indexOf('--after');
const cutoff = afterFlag !== -1 ? argv[afterFlag + 1] : '2026-09-07T11';

const db = new DatabaseSync(resolve(process.env.SQLITE_PATH ?? 'data/digihook.db'));

const backlog = db
  .prepare(
    `SELECT id FROM enquiries
      WHERE source = 'sheet' AND welcomed_at IS NOT NULL AND created_at <= ?`
  )
  .all(cutoff);

const later = db
  .prepare(
    `SELECT id, name, created_at FROM enquiries
      WHERE source = 'sheet' AND created_at > ?
        AND (welcomed_at IS NOT NULL OR welcome_skipped_at IS NOT NULL)`
  )
  .all(cutoff);

console.log(`cutoff: ${cutoff}`);
console.log(`  backlog to re-label as "not messaged": ${backlog.length}`);
console.log(`  later arrivals to release for messaging: ${later.length}`);
for (const row of later) {
  console.log(`    ${row.id.slice(0, 8)}  imported ${row.created_at.slice(0, 16)}`);
}

if (!commit) {
  console.log('\nNothing written. Re-run with --commit.');
} else {
  const relabel = db.prepare(
    'UPDATE enquiries SET welcome_skipped_at = welcomed_at, welcomed_at = NULL WHERE id = ?'
  );
  const release = db.prepare(
    'UPDATE enquiries SET welcomed_at = NULL, welcome_skipped_at = NULL WHERE id = ?'
  );
  for (const row of backlog) relabel.run(row.id);
  for (const row of later) release.run(row.id);
  console.log(`\nRe-labelled ${backlog.length}, released ${later.length}.`);
}

const state = db
  .prepare(
    `SELECT
       SUM(CASE WHEN welcomed_at IS NOT NULL THEN 1 ELSE 0 END) AS messaged,
       SUM(CASE WHEN welcome_skipped_at IS NOT NULL THEN 1 ELSE 0 END) AS skipped,
       SUM(CASE WHEN welcomed_at IS NULL AND welcome_skipped_at IS NULL
                 AND source = 'sheet' THEN 1 ELSE 0 END) AS awaiting
     FROM enquiries`
  )
  .get();

console.log('\nstate now:');
console.log(`  actually messaged:      ${state.messaged ?? 0}`);
console.log(`  imported, not messaged: ${state.skipped ?? 0}`);
console.log(`  awaiting a welcome:     ${state.awaiting ?? 0}`);
