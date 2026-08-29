import { randomUUID } from 'crypto';
import { getDb } from './db';

/**
 * Renewal-reminder bookkeeping for the daily cron: which reminder band a
 * window is in, and whether that band has already fired for this exact end
 * date. The end date is part of the dedupe key, so extending a window
 * re-arms the ladder for the new date automatically.
 */

export type ReminderKind = 'support' | 'server';

/**
 * The band that applies right now, or null when the window has more than 30
 * days left. Bands, not dates: a cron that was down on day 30 still sends
 * the 30-day reminder on day 29 — and only that one, never a backlog of
 * every band above it.
 */
export function dueThreshold(daysLeft: number): number | null {
  for (const threshold of [1, 7, 15, 30]) {
    if (daysLeft <= threshold) return threshold;
  }
  return null;
}

export async function wasReminded(
  projectId: string,
  kind: ReminderKind,
  threshold: number,
  endsOn: string
): Promise<boolean> {
  const row = getDb()
    .prepare(
      `SELECT 1 FROM reminder_log
        WHERE project_id = ? AND kind = ? AND threshold = ? AND ends_on = ?`
    )
    .get(projectId, kind, threshold, endsOn);
  return Boolean(row);
}

/** Recorded only after the email actually went — a failed send retries tomorrow. */
export async function recordReminder(
  projectId: string,
  kind: ReminderKind,
  threshold: number,
  endsOn: string
): Promise<void> {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO reminder_log (id, project_id, kind, threshold, ends_on, sent_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(randomUUID(), projectId, kind, threshold, endsOn, new Date().toISOString());
}
