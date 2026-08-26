import type {
  AnnexureRow,
  AnnexureTable,
  ProposalContent,
  ProposalLine,
  ProposalPhase,
  ProposalPrice,
  ProposalSection,
  ProposalTechnology,
  TechChoice,
} from './proposals';

/**
 * Validates a hand-typed proposal document posted from the dashboard's direct
 * editor — the manual alternative to `reviseProposal` in `lib/claude.ts`.
 *
 * Same defensive posture as `lib/delivery.ts`: this is read on the client-facing
 * page, and it arrives as a JSON payload from a browser, so every field is
 * re-validated here rather than trusted, exactly like the enquiry form and the
 * delivery editor. A malformed row degrades to "dropped", never a 500 in front
 * of a client.
 */

const MAX_ROWS = 60;
const MAX_SHORT = 200;
const MAX_LONG = 4000;

function text(value: unknown, limit = MAX_LONG): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value.slice(0, MAX_ROWS) : [];
}

function strings(value: unknown, limit = MAX_SHORT): string[] {
  return list(value)
    .map((v) => text(v, limit))
    .filter((s) => s.length > 0);
}

function parseSections(value: unknown): ProposalSection[] {
  return list(value)
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      const section: ProposalSection = {
        heading: text(row.heading, MAX_SHORT),
        body: text(row.body),
      };
      const bullets = strings(row.bullets);
      if (bullets.length > 0) section.bullets = bullets;
      return section;
    })
    .filter((s) => s.heading.length > 0);
}

function parseScope(value: unknown): ProposalLine[] {
  return list(value)
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      return { item: text(row.item, MAX_SHORT), detail: text(row.detail) };
    })
    .filter((s) => s.item.length > 0);
}

function parseTimeline(value: unknown): ProposalPhase[] {
  return list(value)
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      return {
        phase: text(row.phase, MAX_SHORT),
        duration: text(row.duration, MAX_SHORT),
        deliverable: text(row.deliverable),
      };
    })
    .filter((t) => t.phase.length > 0);
}

function parsePricing(value: unknown): ProposalPrice[] {
  return list(value)
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      const line: ProposalPrice = {
        item: text(row.item, MAX_SHORT),
        amount: text(row.amount, MAX_SHORT),
      };
      const note = text(row.note);
      if (note) line.note = note;
      return line;
    })
    .filter((p) => p.item.length > 0);
}

function parseTechnology(value: unknown): ProposalTechnology | undefined {
  const row = (value ?? {}) as Record<string, unknown>;
  const summary = text(row.summary);
  const stack: TechChoice[] = list(row.stack)
    .map((r) => {
      const t = (r ?? {}) as Record<string, unknown>;
      return {
        name: text(t.name, MAX_SHORT),
        role: text(t.role, MAX_SHORT),
        why: text(t.why),
      };
    })
    .filter((t) => t.name.length > 0);

  // Optional field — an empty summary and no rows means the studio cleared
  // it, so it must come back out as `undefined`, not an empty shell object,
  // the same way a proposal drafted before 2026-07-26 has none at all.
  if (!summary && stack.length === 0) return undefined;
  return { summary, stack };
}

function parseAnnexure(value: unknown): AnnexureTable[] | undefined {
  const tables: AnnexureTable[] = list(value)
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      const table: AnnexureTable = {
        title: text(row.title, MAX_SHORT),
        rows: list(row.rows)
          .map((rr) => {
            const rowValue = (rr ?? {}) as Record<string, unknown>;
            const annexRow: AnnexureRow = {
              feature: text(rowValue.feature, MAX_SHORT),
              what: text(rowValue.what),
              why: text(rowValue.why),
            };
            return annexRow;
          })
          .filter((rr) => rr.feature.length > 0),
      };
      const note = text(row.note);
      if (note) table.note = note;
      return table;
    })
    .filter((t) => t.title.length > 0);

  return tables.length > 0 ? tables : undefined;
}

export type ContentDraft = {
  content: ProposalContent;
  errors: string[];
};

/**
 * Parses and validates a posted proposal document. Never throws — a malformed
 * or missing field is reported in `errors` rather than crashing the action, so
 * the studio gets a plain-English reason back on the form instead of a 500.
 */
export function parseProposalContent(input: unknown): ContentDraft {
  const row = (input ?? {}) as Record<string, unknown>;
  const errors: string[] = [];

  const title = text(row.title, MAX_SHORT);
  if (!title) errors.push('The proposal needs a title.');

  const summary = text(row.summary);
  if (!summary) errors.push('The proposal needs a short summary.');

  const total = text(row.total, MAX_SHORT);
  if (!total) errors.push('Enter a total, even as a range.');

  const support = text(row.support);

  const content: ProposalContent = {
    title,
    summary,
    sections: parseSections(row.sections),
    scope: parseScope(row.scope),
    timeline: parseTimeline(row.timeline),
    pricing: parsePricing(row.pricing),
    total,
    terms: strings(row.terms, MAX_LONG),
    technology: parseTechnology(row.technology),
    annexure: parseAnnexure(row.annexure),
    ...(support ? { support } : {}),
  };

  return { content, errors };
}
