import { randomUUID, randomInt } from 'crypto';
import { getDb } from './db';
import { cleanGstin, cleanStateCode } from './gst';
import { DEFAULT_GST_PERCENT, cleanGstPercent } from './money';
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
  /**
   * The budget agreed with the client before drafting, e.g. "₹25,000" or
   * "20-25k". Passed to Claude so the price is a real figure instead of a
   * guess from the house list. Empty when the team left it blank — the
   * house price applies as before.
   */
  budget: string;
  /**
   * Where this client's proposal-ready and proposal-accepted emails go, and the
   * number to reach them on. Seeded from the enquiry when the proposal was
   * drafted from one, entered by hand otherwise. Empty means nothing can be
   * sent — the dashboard says so rather than failing silently at send time.
   *
   * Held on the proposal rather than read back through the enquiry every time:
   * a client who corrects their address mid-project must not have that change
   * silently reverted by the original brief.
   */
  clientEmail: string;
  clientPhone: string;
  /**
   * The GST rate this proposal is billed at, as a whole percent.
   *
   * Every figure in `content` is exclusive of GST, so this is what turns a
   * quoted price into a payable one on the Payment tab and on a receipt. It
   * lives on the row rather than in a constant because the rate that applied
   * when a client signed is a fact about that proposal — a later change to the
   * prevailing rate must not restate what was already agreed. Rows stored
   * before this column read back as 18%, which is what they were priced at.
   */
  gstPercent: number;
  /**
   * Billing identity, used only by the GST tax invoice.
   *
   * `clientState` is a GST state code (see `lib/gst.ts`) and is the place of
   * supply — it decides CGST/SGST versus IGST, so a proposal without one
   * cannot be invoiced and the dashboard says which field is missing rather
   * than the system picking a state. `clientGstin` is optional: an unregistered
   * client is a perfectly ordinary B2C supply.
   */
  clientAddress: string;
  clientGstin: string;
  clientState: string | null;
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
  budget: string | null;
  client_email: string | null;
  client_phone: string | null;
  gst_percent: number | null;
  client_address: string | null;
  client_gstin: string | null;
  client_state: string | null;
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
    // Rows written before these columns existed read back as ''.
    budget: row.budget ?? '',
    clientEmail: row.client_email ?? '',
    clientPhone: row.client_phone ?? '',
    gstPercent: cleanGstPercent(row.gst_percent ?? DEFAULT_GST_PERCENT),
    clientAddress: row.client_address ?? '',
    clientGstin: row.client_gstin ?? '',
    clientState: row.client_state ?? null,
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
          assets, milestones, stages, accepted_at, assets_shared_at, budget,
          client_email, client_phone, gst_percent, client_address,
          client_gstin, client_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
         assets_shared_at = excluded.assets_shared_at,
         budget      = excluded.budget,
         client_email = excluded.client_email,
         client_phone = excluded.client_phone,
         gst_percent  = excluded.gst_percent,
         client_address = excluded.client_address,
         client_gstin = excluded.client_gstin,
         client_state = excluded.client_state`
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
      proposal.assetsSharedAt,
      proposal.budget,
      proposal.clientEmail,
      proposal.clientPhone,
      // Cleaned rather than bound raw: SQLite refuses an undefined parameter
      // outright, and a proposal object assembled from an older shape (a
      // restored backup, a fixture) would otherwise fail to save at all
      // instead of taking the default rate the read path already assumes.
      cleanGstPercent(proposal.gstPercent),
      proposal.clientAddress ?? '',
      proposal.clientGstin ?? '',
      proposal.clientState ?? null
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
 * Sets the client's billing identity — the address, GSTIN and state that a tax
 * invoice needs. Its own narrow write, like the others: this is what a client's
 * accountant reads off the invoice, and a proposal revision regenerating
 * `content` has no business touching it.
 */
export async function setProposalBilling(
  slug: string,
  billing: { address: string; gstin: string; state: string | null }
): Promise<void> {
  getDb()
    .prepare(
      'UPDATE proposals SET client_address = ?, client_gstin = ?, client_state = ? WHERE slug = ?'
    )
    .run(
      billing.address.trim().slice(0, 400),
      cleanGstin(billing.gstin) ?? '',
      cleanStateCode(billing.state),
      slug
    );
}

/**
 * Corrects the client's contact details. Its own narrow write, like the two
 * above: a proposal revision regenerates `content` from Claude, and must never
 * be able to overwrite the address a client asked us to use.
 */
export async function setProposalContact(
  slug: string,
  contact: { email: string; phone: string }
): Promise<void> {
  getDb()
    .prepare('UPDATE proposals SET client_email = ?, client_phone = ? WHERE slug = ?')
    .run(contact.email.trim(), contact.phone.trim(), slug);
}

/**
 * Sets the GST rate this proposal bills at. Its own narrow write, like the
 * three above: the rate is money, and a proposal revision that regenerates
 * `content` has no business changing what the client is taxed.
 */
export async function setProposalGst(slug: string, percent: number): Promise<void> {
  getDb()
    .prepare('UPDATE proposals SET gst_percent = ? WHERE slug = ?')
    .run(cleanGstPercent(percent), slug);
}

/**
 * Marks one milestone paid, in place, after a payment has actually settled.
 *
 * Narrower than `saveDelivery` on purpose. The studio's delivery editor holds
 * a whole copy of the three lists in React state; if a client pays while that
 * screen is open, a save from it would otherwise revert the row that was just
 * settled. This touches one field of one row and leaves everything else as it
 * was found — including a row already marked paid by hand, which stays paid.
 *
 * Position is identity in the milestones array (see `lib/delivery.ts`), so an
 * index past the end is a no-op rather than an append.
 */
export async function markMilestonePaid(
  slug: string,
  index: number
): Promise<void> {
  const proposal = await getProposal(slug);
  if (!proposal) return;
  const milestone = proposal.milestones[index];
  if (!milestone || milestone.status === 'paid') return;

  const milestones = proposal.milestones.map((m, i) =>
    i === index ? { ...m, status: 'paid' as const } : m
  );
  getDb()
    .prepare('UPDATE proposals SET milestones = ?, updated_at = ? WHERE slug = ?')
    .run(JSON.stringify(milestones), new Date().toISOString(), slug);
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
