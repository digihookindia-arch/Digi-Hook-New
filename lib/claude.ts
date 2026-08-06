import Anthropic from '@anthropic-ai/sdk';
import type { ProposalContent } from './proposals';

/**
 * Proposal drafting and editing with Claude.
 *
 * Uses structured outputs (`output_config.format`) so the model returns a typed
 * object rather than markdown — the public page renders it through the design
 * system's own components, so there is no markdown parser and no HTML to
 * sanitise.
 */

/*
 * Model is env-tunable because it is the biggest lever on cost. Per-draft cost
 * on a representative brief (~1,700 in / ~1,900 out):
 *
 *   claude-opus-5    $5 / $25 per MTok    ~$0.064   measured
 *   claude-sonnet-5  $2 / $10 per MTok    ~$0.021   measured, -67%
 *   claude-haiku-4-5 $1 / $5  per MTok    ~$0.011   published rates x observed tokens
 *
 * Haiku is the cheapest and the least capable; it has a harder time holding the
 * house voice and the pricing rules than the larger models do. Set
 * PROPOSAL_MODEL to move back up a tier.
 */
const MODEL = process.env.PROPOSAL_MODEL ?? 'claude-haiku-4-5';

/**
 * Effort tunes thinking depth, but Haiku 4.5 rejects the parameter outright —
 * sending it there is a 400 on every request. Newer tiers accept it.
 */
const SUPPORTS_EFFORT = !MODEL.startsWith('claude-haiku');
const EFFORT = process.env.PROPOSAL_EFFORT ?? 'medium';

/** Server-side only. Never expose this to the client. */
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to .env.local to draft proposals.'
    );
  }
  return new Anthropic();
}

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Structured-output schema. Every object needs `additionalProperties: false`
 * and an explicit `required` list — the API rejects schemas without them.
 */
const PROPOSAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'sections', 'scope', 'timeline', 'pricing', 'total', 'terms'],
  properties: {
    title: { type: 'string', description: 'Proposal title, naming the client.' },
    summary: {
      type: 'string',
      description:
        'Two or three sentences: the problem in the client’s words and what we will deliver.',
    },
    sections: {
      type: 'array',
      description: 'Explanatory sections — the understanding, the approach, what we need from them.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading', 'body'],
        properties: {
          heading: { type: 'string' },
          body: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    scope: {
      type: 'array',
      description: 'What is included, line by line.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item', 'detail'],
        properties: {
          item: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
    timeline: {
      type: 'array',
      description: 'Delivery stages. Total should land between two and four weeks.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['phase', 'duration', 'deliverable'],
        properties: {
          phase: { type: 'string' },
          duration: { type: 'string' },
          deliverable: { type: 'string' },
        },
      },
    },
    pricing: {
      type: 'array',
      description: 'Priced line items in rupees.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item', 'amount'],
        properties: {
          item: { type: 'string' },
          amount: { type: 'string' },
          note: { type: 'string' },
        },
      },
    },
    total: { type: 'string', description: 'Total in rupees, e.g. "₹30,000".' },
    terms: {
      type: 'array',
      description:
        'Short, plain-English terms. Do NOT include the payment split here — the proposal renders a payment schedule of its own from the studio-maintained milestones, and a second split in the terms would contradict it.',
      items: { type: 'string' },
    },
    technology: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'stack'],
      description:
        'The technology stack, named. Use only the technologies listed in the house stack — never name one that is not on that list.',
      properties: {
        summary: {
          type: 'string',
          description:
            'Two or three sentences naming the stack and what it buys this client. Plain English.',
        },
        stack: {
          type: 'array',
          description: 'One row per technology actually used on this project.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'role', 'why'],
            properties: {
              name: { type: 'string', description: 'e.g. "Next.js"' },
              role: {
                type: 'string',
                description: 'One or two words: Framework, Runtime, Database, Language, Styling, Hosting.',
              },
              why: {
                type: 'string',
                description:
                  'One plain-English sentence on what it means for this client specifically — not a generic definition.',
              },
            },
          },
        },
      },
    },
    support: {
      type: 'string',
      description:
        'Support & maintenance, two or three sentences: the 180 days of free post-launch support, what it covers, and that an annual plan is quoted separately after that.',
    },
    annexure: {
      type: 'array',
      description:
        'Technical annexure: 2 to 4 tables of the engineering included, grouped by topic. Include only tables relevant to this project.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'rows'],
        properties: {
          title: {
            type: 'string',
            description: 'Table heading, e.g. "Speed & performance" or "Security & reliability".',
          },
          note: {
            type: 'string',
            description: 'Optional one-line note under the heading.',
          },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['feature', 'what', 'why'],
              properties: {
                feature: { type: 'string', description: 'e.g. "Image optimisation"' },
                what: {
                  type: 'string',
                  description: 'What it is, in one plain-English sentence.',
                },
                why: {
                  type: 'string',
                  description: 'Why it matters to this business, in one sentence.',
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

const SYSTEM = `You write project proposals for Digi Hook, an IT solutions and creative agency in Noida, India.

House pricing — use these figures, do not invent others:
- Business website: ₹20,000 flat, covers 1 to 10 pages. Extra pages ₹2,000 each.
- Ecommerce website: ₹35,000 flat, includes the admin panel (inventory, payments, shipments, content management).
- Content management on a business website: +₹10,000.
- Ecommerce backend dashboard with SEO features: +₹5,000 to ₹10,000.
- Delivery takes 2 to 4 weeks depending on complexity.
- Every project includes 180 days of free post-launch support, covering bug fixes and minor corrections. An annual maintenance plan (updates, backups, monitoring, priority support) is optional and quoted separately.

All figures above exclude GST. Say so on the proposal: mark the total as
excluding GST, and include a term stating that GST applies on top at the
prevailing rate.

House technology stack — name these and nothing else. Every line is taken from
what the studio already publishes on its Technology page:
- Next.js (Framework) — decides where each page is assembled. Pages arrive ready to read, and search engines receive finished HTML rather than an empty shell.
- Node.js (Runtime) — runs the server-side work: forms, payments, integrations. One language across the stack means faster fixes.
- MongoDB (Database) — flexible documents rather than rigid tables, so a catalogue can gain a field without a painful migration.
- TypeScript (Language) — a type checker that catches whole categories of bugs while the code is written, not by a customer at checkout.
- Tailwind CSS (Styling) — design tokens defined once, so hundreds of pages stay consistent and the CSS visitors download stays small.
- Global edge hosting (Hosting) — automatic HTTPS, preview deploys per change, instant rollback, and servers near the visitor.
Rendering: SSR where freshness genuinely matters, ISR for catalogues that change
daily, static for everything else. Never a blanket default.
Only list the technologies this particular project actually uses — a brochure
site does not need a database explained at length. Explain each in one sentence
tied to what this client gets, never a textbook definition.

House voice: plain English, no jargon, no marketing adjectives. Every technical
choice is explained in a sentence a non-technical owner can follow. Numbers, not
adjectives — "loads in under 2.5 seconds", not "blazing fast".

Hard rules:
- Never invent client names, testimonials, case studies or performance statistics. The studio has none.
- Never promise a search ranking, a specific traffic number, or guaranteed results.
- Price only from the figures above. If the brief needs something outside them, say it will be scoped separately rather than guessing a number.
- Keep it tight. Cover the substance and stop — no filler sections, no padding, no repeated summaries.
- Deliver exactly what the brief asks for. Do not widen the scope with work the client did not request.
- Never state a payment split or instalment percentage anywhere — not in the terms, not in a section, not in a pricing note. The proposal page renders the payment schedule itself from figures the studio maintains, and any split you write would contradict it.

Technical annexure: include 2 to 4 tables detailing the engineering that ships
with the build, each row as feature / what it is / why it matters — every cell a
single sentence a non-technical owner can follow. "Speed & performance" and
"Security & reliability" fit almost every project (SSL, image optimisation,
caching, backups, input validation, uptime monitoring and the like); add an SEO
table only when search visibility is part of the scope, and an admin/dashboard
table only when the build includes one. Only include what this project actually
gets — the annexure is a factual inventory, not a brochure.`;

/**
 * A revision returns only the top-level fields it actually changes; everything
 * omitted is left alone. Regenerating the whole document to move one date cost
 * twice as much for no benefit.
 */
const PATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['changed'],
  properties: {
    changed: {
      type: 'object',
      additionalProperties: false,
      description:
        'Only the top-level fields this change affects, each complete and in full. Omit every field that stays the same.',
      properties: PROPOSAL_SCHEMA.properties,
    },
  },
} as const;

type ClaudeResult =
  | { ok: true; content: ProposalContent }
  | { ok: false; error: string };

/**
 * One request, with the recommended server-side refusal fallback. If the beta
 * is unavailable on this account the call is retried without it rather than
 * failing the whole draft.
 */
async function ask(userMessage: string, schema: object): Promise<
  { ok: true; parsed: unknown } | { ok: false; error: string }
> {
  const anthropic = client();

  const base = {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user' as const, content: userMessage }],
    output_config: {
      ...(SUPPORTS_EFFORT ? { effort: EFFORT } : {}),
      format: {
        type: 'json_schema' as const,
        schema,
      },
    },
  };

  let response;
  try {
    response = await anthropic.beta.messages.create({
      ...base,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    } as never);
  } catch {
    // Beta unavailable or rejected — fall back to a plain request.
    response = await anthropic.messages.create(base as never);
  }

  const message = response as Anthropic.Message;

  if (message.stop_reason === 'refusal') {
    return {
      ok: false,
      error:
        'Claude declined to draft this one. Rephrase the brief and try again, or write the proposal by hand.',
    };
  }

  const text = message.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') {
    return { ok: false, error: 'Claude returned no text to parse.' };
  }

  try {
    return { ok: true, parsed: JSON.parse(text.text) };
  } catch {
    return { ok: false, error: 'Claude returned something that was not valid JSON.' };
  }
}

/** Draft a proposal from the employee's brief. */
export async function draftProposal(input: {
  client: string;
  brief: string;
}): Promise<ClaudeResult> {
  const result = await ask(
    `Write a project proposal for this client.\n\nClient: ${input.client}\n\nBrief from our team:\n${input.brief}`,
    PROPOSAL_SCHEMA
  );
  if (!result.ok) return result;
  return { ok: true, content: result.parsed as ProposalContent };
}

/**
 * Revise an existing proposal against an instruction.
 *
 * Claude returns only the fields the instruction touches; the rest is carried
 * over unchanged from `current`. The proposal still has to be sent in full so
 * Claude can see what it is editing, but not written back out in full.
 */
export async function reviseProposal(input: {
  client: string;
  current: ProposalContent;
  instruction: string;
}): Promise<ClaudeResult> {
  const result = await ask(
    `Revise the proposal below for ${input.client}.\n\n` +
      `Change requested by our team:\n${input.instruction}\n\n` +
      `Return only the top-level fields this change actually alters, each complete and in full. ` +
      `Omit every field that stays the same.\n\n` +
      `Current proposal (JSON):\n${JSON.stringify(input.current)}`,
    PATCH_SCHEMA
  );
  if (!result.ok) return result;

  const { changed } = result.parsed as { changed?: Partial<ProposalContent> };
  if (!changed || Object.keys(changed).length === 0) {
    return {
      ok: false,
      error: 'Claude did not change anything. Try describing the change more specifically.',
    };
  }
  return { ok: true, content: { ...input.current, ...changed } };
}
