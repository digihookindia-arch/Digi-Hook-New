import { randomUUID, randomInt } from 'crypto';
import { getDb } from './db';
import {
  parseAssets,
  parseMilestones,
  parseStages,
  type AssetItem,
  type Milestone,
  type WorkStage,
} from './delivery';

/**
 * Proposal storage. One row per proposal; the public page is reached by
 * `slug` (unguessable) and gated by `accessCode`.
 */

export type ProposalSection = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type ProposalLine = { item: string; detail: string };
export type ProposalPhase = { phase: string; duration: string; deliverable: string };
export type ProposalPrice = { item: string; amount: string; note?: string };

/** One row of a technical annexure table: feature, what it is, why it matters. */
export type AnnexureRow = { feature: string; what: string; why: string };
export type AnnexureTable = { title: string; note?: string; rows: AnnexureRow[] };

/**
 * The stack, named. Grounded in the approved copy on the public Technology
 * page (`content/technology.ts`) — the system prompt lists the permitted
 * technologies so a proposal cannot promise something the studio does not build
 * with.
 */
export type TechChoice = { name: string; role: string; why: string };
export type ProposalTechnology = { summary: string; stack: TechChoice[] };

/**
 * The shape Claude returns and the public page renders.
 *
 * `annexure` was added 2026-07-26, modelled on the client's own reference
 * proposal (Galaxy Super Speciality): plain-language tables of
 * feature / what it is / why it matters, grouped by topic (performance,
 * security, SEO…). Optional because proposals stored before then lack it,
 * and because Claude includes only the tables relevant to the project.
 */
export type ProposalContent = {
  title: string;
  summary: string;
  sections: ProposalSection[];
  scope: ProposalLine[];
  timeline: ProposalPhase[];
  pricing: ProposalPrice[];
  total: string;
  terms: string[];
  /** The named stack. Optional — proposals drafted before 2026-07-26 have none. */
  technology?: ProposalTechnology;
  annexure?: AnnexureTable[];
  /**
   * Support & maintenance paragraph. Optional for the same reason as
   * `annexure` — proposals drafted before 2026-07-26 have neither.
   *
   * Note what is *not* here: payment terms. Those render from the proposal's
   * `milestones`, the same rows the /status tab tracks, so the schedule the
   * client agrees to and the schedule the studio bills against cannot drift.
   */
  support?: string;
};

export type Proposal = {
  slug: string;
  client: string;
  accessCode: string;
  content: ProposalContent;
  /** The inputs the proposal was generated from, kept for re-generation. */
  brief: string;
  createdAt: string;
  updatedAt: string;
  /**
   * When the proposal was accepted — by the client on the page, or by the
   * studio after a call. Null until then. Gates the client's other two tabs.
   */
  acceptedAt: string | null;
  /**
   * When the studio published the asset list to the client. Null until then —
   * an accepted client sees a "coming within 24 hours" notice instead of the
   * seeded draft, because the seed is a prompt for the studio's edit, not a
   * list anyone has actually reviewed for this project.
   */
  assetsSharedAt: string | null;
  /*
   * Studio-maintained delivery records behind the /assets and /status tabs.
   * Deliberately outside `content`: Claude rewrites content on every revision,
   * and these track real-world state that a revision has no business touching.
   */
  assets: AssetItem[];
  milestones: Milestone[];
  stages: WorkStage[];
};

/** Six digits — easy to read out over the phone, hard to guess in bulk. */
export function newAccessCode(): string {
  return String(randomInt(100000, 1000000));
}

export function newSlug(): string {
  return randomUUID();
}

/** The on-disk shape. `content` is JSON; everything else is a plain column. */
type Row = {
  slug: string;
  client: string;
  access_code: string;
  content: string;
  brief: string;
  created_at: string;
  updated_at: string;
  assets: string;
  milestones: string;
  stages: string;
  accepted_at: string | null;
  assets_shared_at: string | null;
};

function toProposal(row: Row): Proposal {
  return {
    slug: row.slug,
    client: row.client,
    accessCode: row.access_code,
    content: JSON.parse(row.content) as ProposalContent,
    brief: row.brief,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acceptedAt: row.accepted_at ?? null,
    assetsSharedAt: row.assets_shared_at ?? null,
    // The parsers tolerate null and garbage — rows written before these columns
    // existed read back as empty lists rather than breaking the client's page.
    assets: parseAssets(row.assets ?? '[]'),
    milestones: parseMilestones(row.milestones ?? '[]'),
    stages: parseStages(row.stages ?? '[]'),
  };
}

/*
 * These stay async even though `node:sqlite` is synchronous. The callers are
 * server components and server actions that already await them, and keeping the
 * promise means storage can move again without touching every call site.
 */

export async function listProposals(): Promise<Proposal[]> {
  const rows = getDb()
    .prepare('SELECT * FROM proposals ORDER BY created_at DESC')
    .all() as Row[];
  return rows.map(toProposal);
}

export async function getProposal(slug: string): Promise<Proposal | null> {
  const row = getDb()
    .prepare('SELECT * FROM proposals WHERE slug = ?')
    .get(slug) as Row | undefined;
  return row ? toProposal(row) : null;
}

export async function saveProposal(proposal: Proposal): Promise<void> {
  getDb()
    .prepare(
      `INSERT INTO proposals
         (slug, client, access_code, content, brief, created_at, updated_at,
          assets, milestones, stages, accepted_at, assets_shared_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         client      = excluded.client,
         access_code = excluded.access_code,
         content     = excluded.content,
         brief       = excluded.brief,
         updated_at  = excluded.updated_at,
         assets      = excluded.assets,
         milestones  = excluded.milestones,
         stages      = excluded.stages,
         accepted_at = excluded.accepted_at,
         assets_shared_at = excluded.assets_shared_at`
    )
    .run(
      proposal.slug,
      proposal.client,
      proposal.accessCode,
      JSON.stringify(proposal.content),
      proposal.brief,
      proposal.createdAt,
      proposal.updatedAt,
      JSON.stringify(proposal.assets),
      JSON.stringify(proposal.milestones),
      JSON.stringify(proposal.stages),
      proposal.acceptedAt,
      proposal.assetsSharedAt
    );
}

/**
 * Marks a proposal accepted (or not). Its own narrow write for the same reason
 * as `saveDelivery` — acceptance is real-world state that a proposal revision
 * or delivery edit must not be able to flip as a side effect.
 */
export async function setProposalAccepted(
  slug: string,
  accepted: boolean
): Promise<void> {
  getDb()
    .prepare('UPDATE proposals SET accepted_at = ? WHERE slug = ?')
    .run(accepted ? new Date().toISOString() : null, slug);
}

/**
 * Publishes (or un-publishes) the asset list to the client. Separate from
 * `saveDelivery` on purpose: the studio edits the list many times before it is
 * fit to send, and saving a draft must not put it in front of the client.
 */
export async function setAssetsShared(
  slug: string,
  shared: boolean
): Promise<void> {
  getDb()
    .prepare('UPDATE proposals SET assets_shared_at = ? WHERE slug = ?')
    .run(shared ? new Date().toISOString() : null, slug);
}

/**
 * Writes only the delivery columns. Kept separate from `saveProposal` so the
 * dashboard's delivery editor structurally cannot overwrite `content` — the two
 * are edited on the same screen, and a stale copy of the proposal held by the
 * editor must not be able to undo a revision made beside it.
 */
export async function saveDelivery(
  slug: string,
  delivery: { assets: AssetItem[]; milestones: Milestone[]; stages: WorkStage[] }
): Promise<void> {
  getDb()
    .prepare(
      `UPDATE proposals
          SET assets = ?, milestones = ?, stages = ?, updated_at = ?
        WHERE slug = ?`
    )
    .run(
      JSON.stringify(delivery.assets),
      JSON.stringify(delivery.milestones),
      JSON.stringify(delivery.stages),
      new Date().toISOString(),
      slug
    );
}

export async function deleteProposal(slug: string): Promise<void> {
  getDb().prepare('DELETE FROM proposals WHERE slug = ?').run(slug);
}
