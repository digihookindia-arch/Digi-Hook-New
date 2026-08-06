import {
  services,
  questionsByService,
  commonQuestions,
  detailQuestions,
  type Condition,
  type Question,
  type ServiceKey,
} from '@/content/enquiry';

/**
 * Pure enquiry logic, shared by the client renderer and the server action.
 *
 * The server re-derives visibility from the same schema rather than trusting
 * the posted fields, so a crafted POST cannot smuggle in answers to questions
 * the visitor was never shown.
 */

export type AnswerValue = string | string[];
export type Answers = Record<string, AnswerValue>;

export const serviceKeys = services.map((s) => s.key);

export function isServiceKey(v: unknown): v is ServiceKey {
  return typeof v === 'string' && (serviceKeys as string[]).includes(v);
}

const asArray = (v: AnswerValue | undefined): string[] =>
  Array.isArray(v) ? v : v ? [v] : [];

const asString = (v: AnswerValue | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '');

function matchesOne(c: Condition, answers: Answers): boolean {
  const value = answers[c.questionId];
  if (value === undefined) return false;
  if (c.equals !== undefined && asString(value) !== c.equals) return false;
  if (c.oneOf !== undefined && !c.oneOf.includes(asString(value))) return false;
  if (c.includes !== undefined && !asArray(value).includes(c.includes)) return false;
  if (c.includesAny !== undefined) {
    const picked = asArray(value);
    if (!c.includesAny.some((v) => picked.includes(v))) return false;
  }
  return true;
}

/** `showIf` is AND, `showIfAny` is OR; a question with both must satisfy each. */
function isShown(q: Question, answers: Answers): boolean {
  if (q.showIf?.length && !q.showIf.every((c) => matchesOne(c, answers))) {
    return false;
  }
  if (q.showIfAny?.length && !q.showIfAny.some((c) => matchesOne(c, answers))) {
    return false;
  }
  return true;
}

/** Service-specific questions followed by the ones everyone answers. */
export function questionsFor(service: ServiceKey): Question[] {
  return [...questionsByService[service], ...commonQuestions];
}

/**
 * The questions actually on screen for these answers, in order.
 *
 * Resolved in a single ordered pass against an "effective" answer set that only
 * contains answers to questions already shown. That makes conditions chain
 * correctly: if B is hidden, anything conditional on B stays hidden too, even
 * if a stale answer for B is still hanging around in state.
 */
export function visibleQuestions(
  service: ServiceKey,
  answers: Answers
): Question[] {
  const visible: Question[] = [];
  const effective: Answers = {};

  for (const q of questionsFor(service)) {
    if (!isShown(q, effective)) continue;
    visible.push(q);
    const value = answers[q.id];
    if (value !== undefined) effective[q.id] = value;
  }

  return visible;
}

/** Drops answers to questions that are no longer on screen. */
export function pruneAnswers(service: ServiceKey, answers: Answers): Answers {
  const keep = new Set(visibleQuestions(service, answers).map((q) => q.id));
  const out: Answers = {};
  for (const [id, value] of Object.entries(answers)) {
    if (keep.has(id)) out[id] = value;
  }
  return out;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** An Indian mobile number in any common written form. */
export function isPhone(value: string): boolean {
  const digits = value.replace(/[\s\-()+]/g, '');
  return /^(91)?[6-9]\d{9}$/.test(digits);
}

/** Accepts either. Kept for callers that only need "can we reply at all?". */
export function isReachable(value: string): boolean {
  return isEmail(value) || isPhone(value);
}

export type Errors = Record<string, string>;

function validateOne(q: Question, raw: AnswerValue | undefined): string | null {
  const allowed = q.options?.map((o) => o.value);

  if (q.type === 'multi') {
    const picked = asArray(raw);
    if (q.required && picked.length === 0) return 'Please choose at least one.';
    if (allowed && picked.some((p) => !allowed.includes(p))) {
      return 'That is not one of the options.';
    }
    return null;
  }

  const value = asString(raw).trim();
  if (!value) return q.required ? 'This one is needed.' : null;

  if (allowed && !allowed.includes(value)) return 'That is not one of the options.';

  if (q.type === 'text' && value.length > 200) {
    return 'Please keep this under 200 characters.';
  }
  if (q.type === 'textarea') {
    // Only hold required answers to a minimum length — an optional note that
    // someone chose to fill in should never be rejected for being brief.
    if (q.required && value.length < 10) {
      return 'A sentence or two is enough — just a little more.';
    }
    if (value.length > 2000) return 'Please keep this under 2000 characters.';
  }

  if (q.id === 'name' && value.length < 2) return 'Please tell us your name.';
  if (q.id === 'email' && !isEmail(value)) {
    return 'That does not look like an email address we can send the proposal to.';
  }
  if (q.id === 'phone' && !isPhone(value)) {
    return 'Please give a 10-digit Indian mobile number.';
  }

  return null;
}

/**
 * Validates an arbitrary set of questions. The wizard uses this to check one
 * step at a time, so problems surface next to the question rather than all at
 * once at the end.
 */
export function validateQuestions(
  questions: Question[],
  answers: Answers
): Errors {
  const errors: Errors = {};
  for (const q of questions) {
    const message = validateOne(q, answers[q.id]);
    if (message) errors[q.id] = message;
  }
  return errors;
}

/**
 * Validates the whole enquiry. `answers` should already be pruned; anything
 * for a hidden question is ignored rather than trusted.
 */
export function validateEnquiry(service: ServiceKey, answers: Answers): Errors {
  return validateQuestions(
    [...visibleQuestions(service, answers), ...detailQuestions],
    answers
  );
}

/** Human-readable brief: what was asked, and what they answered. */
export function summarise(
  service: ServiceKey,
  answers: Answers
): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const serviceLabel = services.find((s) => s.key === service)?.label ?? service;
  out.push({ label: 'Service', value: serviceLabel });

  for (const q of [...visibleQuestions(service, answers), ...detailQuestions]) {
    const raw = answers[q.id];
    if (raw === undefined) continue;
    const picked = asArray(raw).filter(Boolean);
    if (picked.length === 0) continue;

    const value = q.options
      ? picked
          .map((p) => q.options?.find((o) => o.value === p)?.label ?? p)
          .join(', ')
      : picked.join(', ');

    out.push({ label: q.label, value });
  }

  return out;
}

export type EnquiryState = {
  status: 'idle' | 'success' | 'error';
  errors: Errors & { form?: string; service?: string };
};

export const emptyEnquiryState: EnquiryState = { status: 'idle', errors: {} };
