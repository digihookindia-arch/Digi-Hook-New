import { randomUUID } from 'crypto';
import { getDb } from './db';

/**
 * Portal engagements — the page a client sees after logging in. One row per
 * project: business name, the studio-set live date and support window, and a
 * simple payment summary (total / paid, balance derived). Every field is
 * entered from the dashboard; nothing here derives from proposals, on
 * purpose — the portal is its own surface.
 */

export type PortalProject = {
  id: string;
  clientId: string;
  businessName: string;
  /** ISO date YYYY-MM-DD, or null until the studio sets a go-live date. */
  liveAt: string | null;
  supportDays: number;
  /** Whole rupees. Null hides the payments panel — payments not set up yet. */
  totalInr: number | null;
  paidInr: number;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  client_id: string;
  business_name: string;
  live_at: string | null;
  support_days: number;
  total_inr: number | null;
  paid_inr: number;
  created_at: string;
  updated_at: string;
};

function toProject(row: Row): PortalProject {
  return {
    id: row.id,
    clientId: row.client_id,
    businessName: row.business_name,
    liveAt: row.live_at,
    supportDays: row.support_days ?? 180,
    totalInr: row.total_inr,
    paidInr: row.paid_inr ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createProject(input: {
  clientId: string;
  businessName: string;
}): Promise<PortalProject> {
  const now = new Date().toISOString();
  const project: PortalProject = {
    id: randomUUID(),
    clientId: input.clientId,
    businessName: input.businessName.trim(),
    liveAt: null,
    supportDays: 180,
    totalInr: null,
    paidInr: 0,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO portal_projects
         (id, client_id, business_name, live_at, support_days, total_inr, paid_inr, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      project.id,
      project.clientId,
      project.businessName,
      project.liveAt,
      project.supportDays,
      project.totalInr,
      project.paidInr,
      project.createdAt,
      project.updatedAt
    );
  return project;
}

export async function getProject(id: string): Promise<PortalProject | null> {
  const row = getDb()
    .prepare('SELECT * FROM portal_projects WHERE id = ?')
    .get(id) as Row | undefined;
  return row ? toProject(row) : null;
}

export async function listProjects(): Promise<PortalProject[]> {
  const rows = getDb()
    .prepare('SELECT * FROM portal_projects ORDER BY created_at DESC')
    .all() as Row[];
  return rows.map(toProject);
}

export async function listProjectsForClient(clientId: string): Promise<PortalProject[]> {
  const rows = getDb()
    .prepare('SELECT * FROM portal_projects WHERE client_id = ? ORDER BY created_at DESC')
    .all(clientId) as Row[];
  return rows.map(toProject);
}

/** A whole non-negative rupee figure, or the fallback when it is not one. */
function toAmount(value: unknown, fallback: number | null): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

/**
 * The one updater behind the dashboard's project form. Clamps rather than
 * trusts: support days to a sane range, amounts to non-negative integers,
 * and paid never above total when a total is set.
 */
export async function updateProjectDetails(
  id: string,
  input: {
    businessName: string;
    liveAt: string | null;
    supportDays: number;
    totalInr: number | null;
    paidInr: number;
  }
): Promise<void> {
  const supportDays = Number.isFinite(input.supportDays)
    ? Math.min(3650, Math.max(0, Math.floor(input.supportDays)))
    : 180;
  const liveAt =
    input.liveAt && /^\d{4}-\d{2}-\d{2}$/.test(input.liveAt) ? input.liveAt : null;
  const totalInr = toAmount(input.totalInr, null);
  let paidInr = toAmount(input.paidInr, 0) ?? 0;
  if (totalInr !== null && paidInr > totalInr) paidInr = totalInr;

  getDb()
    .prepare(
      `UPDATE portal_projects
          SET business_name = ?, live_at = ?, support_days = ?, total_inr = ?, paid_inr = ?, updated_at = ?
        WHERE id = ?`
    )
    .run(
      input.businessName.trim(),
      liveAt,
      supportDays,
      totalInr,
      paidInr,
      new Date().toISOString(),
      id
    );
}

/** Tickets survive on purpose — there is no FK, and history should outlive a cleanup. */
export async function deleteProject(id: string): Promise<void> {
  getDb().prepare('DELETE FROM portal_projects WHERE id = ?').run(id);
}

/** Balance due, never negative; null while no total is set. */
export function balanceInr(project: PortalProject): number | null {
  if (project.totalInr === null) return null;
  return Math.max(0, project.totalInr - project.paidInr);
}
