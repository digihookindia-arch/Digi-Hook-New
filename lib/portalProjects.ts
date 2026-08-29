import { randomUUID } from 'crypto';
import { getDb } from './db';
import { cleanHttpUrl } from './ticketRules';
import { cleanGscProperty } from './searchConsole';

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
  /** The client's live website. Null hides the website-status card. */
  siteUrl: string | null;
  /** Complimentary server window: starts server_at, runs serverDays. */
  serverAt: string | null;
  serverDays: number;
  /** GoatCounter site code + API token. Null code hides the traffic panel. */
  statsCode: string | null;
  statsToken: string | null;
  /** Ongoing-SEO subscription: flips the SEO tab from locked preview to workspace. */
  seoActive: boolean;
  /** Search Console property the workspace reads (sc-domain: or URL-prefix). */
  gscProperty: string | null;
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
  site_url: string | null;
  server_at: string | null;
  server_days: number;
  stats_code: string | null;
  stats_token: string | null;
  seo_active: number;
  gsc_property: string | null;
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
    siteUrl: row.site_url ?? null,
    serverAt: row.server_at ?? null,
    serverDays: row.server_days ?? 365,
    statsCode: row.stats_code ?? null,
    statsToken: row.stats_token ?? null,
    seoActive: row.seo_active === 1,
    gscProperty: row.gsc_property ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * The client's site URL — the shared http(s) cleaner from the pure rules
 * module, re-exported under the name this module's callers already use.
 */
export { cleanHttpUrl as cleanSiteUrl } from './ticketRules';

/**
 * A GoatCounter site code. Strict on purpose — it is interpolated into a
 * Host header by the stats proxy, so nothing but lowercase alnum/hyphen may
 * pass.
 */
export function cleanStatsCode(value: unknown): string | null {
  const text = String(value ?? '').trim().toLowerCase();
  return /^[a-z0-9-]{1,63}$/.test(text) ? text : null;
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
    siteUrl: null,
    serverAt: null,
    serverDays: 365,
    statsCode: null,
    statsToken: null,
    seoActive: false,
    gscProperty: null,
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
    siteUrl?: unknown;
    serverAt?: string | null;
    serverDays?: number;
    statsCode?: unknown;
    statsToken?: unknown;
    seoActive?: boolean;
    gscProperty?: unknown;
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

  const serverDays = Number.isFinite(input.serverDays)
    ? Math.min(3650, Math.max(0, Math.floor(input.serverDays as number)))
    : 365;
  const serverAt =
    input.serverAt && /^\d{4}-\d{2}-\d{2}$/.test(input.serverAt) ? input.serverAt : null;
  const statsToken = String(input.statsToken ?? '').trim() || null;

  getDb()
    .prepare(
      `UPDATE portal_projects
          SET business_name = ?, live_at = ?, support_days = ?, total_inr = ?, paid_inr = ?,
              site_url = ?, server_at = ?, server_days = ?, stats_code = ?, stats_token = ?,
              seo_active = ?, gsc_property = ?, updated_at = ?
        WHERE id = ?`
    )
    .run(
      input.businessName.trim(),
      liveAt,
      supportDays,
      totalInr,
      paidInr,
      cleanHttpUrl(input.siteUrl),
      serverAt,
      serverDays,
      cleanStatsCode(input.statsCode),
      statsToken,
      input.seoActive ? 1 : 0,
      cleanGscProperty(input.gscProperty),
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
