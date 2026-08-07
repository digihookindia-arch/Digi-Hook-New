import {
  BRANCHES,
  BUDGET_RULES,
  CONTACT_TIME_QUESTION,
  getQuestions,
} from '@/content/quote';
import { isEmail } from '@/lib/enquiry';

/**
 * Pure validation for /get-quote submissions. Mirrors lib/enquiry.ts's rule:
 * the server re-derives the question set from the posted websiteType and
 * prunes the answers to exactly those keys — posted extras are dropped, and
 * option ids are checked against the schema so a hand-crafted POST cannot
 * store arbitrary strings.
 */

export type QuoteAnswerValue = string | string[];
export type QuoteAnswers = Record<string, QuoteAnswerValue>;

export type QuoteSource = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  landingUrl?: string;
  referrer?: string;
};

const CONTACT_FIELDS = ['name', 'business', 'email', 'phone'] as const;
const TEXT_ANSWER_MAX_LENGTH = 2000;

function isNonEmpty(value: unknown): value is QuoteAnswerValue {
  if (typeof value === 'string') return value !== '';
  if (Array.isArray(value)) return value.length > 0 && value.every((v) => typeof v === 'string');
  return false;
}

export function validateAndPruneQuoteAnswers(
  raw: unknown
): { ok: false; error: string } | { ok: true; answers: QuoteAnswers } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Missing answers.' };
  }
  const input = raw as Record<string, unknown>;

  const websiteType = input.websiteType;
  if (typeof websiteType !== 'string' || !(websiteType in BRANCHES)) {
    return { ok: false, error: 'Invalid websiteType.' };
  }

  const pruned: QuoteAnswers = {};

  for (const question of getQuestions(websiteType)) {
    const value = input[question.key];
    if (!isNonEmpty(value)) return { ok: false, error: `Missing ${question.key}.` };
    if (question.mode === 'multi') {
      const ids = Array.isArray(value) ? value : [value];
      const allowed = new Set(question.options.map((o) => o.id));
      if (!ids.every((id) => allowed.has(id))) {
        return { ok: false, error: `Invalid ${question.key}.` };
      }
      pruned[question.key] = ids;
    } else if (question.mode === 'text') {
      if (Array.isArray(value) || value.trim() === '') {
        return { ok: false, error: `Missing ${question.key}.` };
      }
      pruned[question.key] = value.trim().slice(0, TEXT_ANSWER_MAX_LENGTH);
    } else {
      if (Array.isArray(value) || !question.options.some((o) => o.id === value)) {
        return { ok: false, error: `Invalid ${question.key}.` };
      }
      pruned[question.key] = value;
    }
  }

  const rule = BUDGET_RULES[websiteType];
  if (!rule) return { ok: false, error: 'Invalid websiteType.' };
  const budgetAgreed = input.budgetAgreed;
  if (budgetAgreed !== 'yes' && budgetAgreed !== 'custom') {
    return { ok: false, error: 'Missing budgetAgreed.' };
  }
  pruned.budgetAgreed = budgetAgreed;
  if (budgetAgreed === 'yes') {
    // Visitor accepted the displayed range — record it as their budget.
    pruned.budget = `${rule.min}-${rule.max}`;
  } else {
    const budgetRaw = input.budget;
    if (typeof budgetRaw !== 'string' || !/^\d{1,8}$/.test(budgetRaw)) {
      return { ok: false, error: 'Missing budget.' };
    }
    const budgetAmount = parseInt(budgetRaw, 10);
    if (budgetAmount < rule.floor) {
      return { ok: false, error: `Budget below the ₹${rule.floor} minimum for this project type.` };
    }
    pruned.budget = String(budgetAmount);
  }

  const contactTime = input[CONTACT_TIME_QUESTION.key];
  if (
    typeof contactTime !== 'string' ||
    !CONTACT_TIME_QUESTION.options.some((o) => o.id === contactTime)
  ) {
    return { ok: false, error: 'Missing contactTime.' };
  }
  pruned[CONTACT_TIME_QUESTION.key] = contactTime;

  for (const field of CONTACT_FIELDS) {
    const value = input[field];
    if (typeof value !== 'string' || value.trim() === '') {
      return { ok: false, error: `Missing ${field}.` };
    }
    pruned[field] = value.trim();
  }

  if (!/^\d{10}$/.test(pruned.phone as string)) {
    return { ok: false, error: 'Phone must be exactly 10 digits.' };
  }

  if (!isEmail(pruned.email as string)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  return { ok: true, answers: pruned };
}
