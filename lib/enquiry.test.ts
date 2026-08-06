import {
  visibleQuestions,
  pruneAnswers,
  validateEnquiry,
  validateQuestions,
  summarise,
  type Answers,
} from '@/lib/enquiry';

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    pass++;
    console.log('  PASS  ' + name);
  } else {
    fail++;
    console.log('  FAIL  ' + name, detail === undefined ? '' : JSON.stringify(detail));
  }
}

const ids = (service: any, answers: Answers) =>
  visibleQuestions(service, answers).map((q) => q.id);

console.log('\n— branching —');

// Medical: the OPD/HMS split hinges on one answer.
const medBase = ids('medical', {});
check('medical: neither module list shows before the split question is answered',
  !medBase.includes('med_opd_modules') && !medBase.includes('med_hms_modules'), medBase);

const medYes = ids('medical', { med_overnight: 'yes' });
check('medical: admit=yes reveals HMS modules only',
  medYes.includes('med_hms_modules') && !medYes.includes('med_opd_modules'), medYes);

const medNo = ids('medical', { med_overnight: 'no' });
check('medical: admit=no reveals OPD modules only',
  medNo.includes('med_opd_modules') && !medNo.includes('med_hms_modules'), medNo);

const medUnsure = ids('medical', { med_overnight: 'unsure' });
check('medical: unsure falls back to OPD modules (oneOf)',
  medUnsure.includes('med_opd_modules'), medUnsure);

// Business website: an existing brand asks what already exists.
const bizNoBrand = ids('business', { biz_brand: 'no' });
const bizBrand = ids('business', { biz_brand: 'partial' });
check('business: an existing brand asks what assets exist, none does not',
  bizBrand.includes('biz_brand_assets') && !bizNoBrand.includes('biz_brand_assets'),
  { bizNoBrand, bizBrand });

// Revamp: everything is base — the visitor has a site by definition.
const revBase = ids('revamp', {});
check('revamp: platform, page count and what-is-failing are asked up front',
  ['rev_current', 'rev_platform', 'rev_urls', 'rev_problems', 'rev_design'].every((id) =>
    revBase.includes(id)), revBase);

// Web application: all four base, no branches.
const appBase = ids('webapp', {});
check('webapp: stage, users, features and scale are all asked up front',
  ['app_stage', 'app_users', 'app_features', 'app_scale'].every((id) =>
    appBase.includes(id)), appBase);

// Ecommerce: selling online reveals the platform question.
const ecomOnline = ids('ecommerce', { ecom_stage: 'online' });
const ecomNotYet = ids('ecommerce', { ecom_stage: 'not_yet' });
check('ecommerce: selling online asks which platform, not selling does not',
  ecomOnline.includes('ecom_platform') && !ecomNotYet.includes('ecom_platform'),
  { ecomOnline, ecomNotYet });

// Ecommerce: a checkbox (multi) drives a follow-up.
const ecomNoPay = ids('ecommerce', { ecom_needs: ['catalogue'] });
const ecomPay = ids('ecommerce', { ecom_needs: ['catalogue', 'payments'] });
check('ecommerce: ticking "payments" reveals the payment-methods checklist',
  ecomPay.includes('ecom_payments') && !ecomNoPay.includes('ecom_payments'), { ecomNoPay, ecomPay });

// Real estate: CRM unlocks its two follow-ups.
const reNoCrm = ids('realestate', { re_needs: ['website'] });
const reCrm = ids('realestate', { re_needs: ['website', 'crm'] });
check('realestate: CRM reveals the tracking and lead-source questions',
  ['re_crm_today', 're_sources'].every((id) => reCrm.includes(id)) &&
  !reNoCrm.includes('re_crm_today') && !reNoCrm.includes('re_sources'), { reNoCrm, reCrm });

// SEO: local reach asks which cities, national does not.
const seoLocal = ids('seo', { seo_reach: 'one_city' });
const seoIndia = ids('seo', { seo_reach: 'india' });
check('seo: local reach asks which cities, all-India does not',
  seoLocal.includes('seo_locations') && !seoIndia.includes('seo_locations'),
  { seoLocal, seoIndia });

// Marketing: oneOf condition.
const mktNever = ids('marketing', { mkt_running: 'no' });
const mktStopped = ids('marketing', { mkt_running: 'stopped' });
check('marketing: ad spend asked when running or stopped, not when never ran',
  mktStopped.includes('mkt_spend') && !mktNever.includes('mkt_spend'), { mktNever, mktStopped });

console.log('\n— common questions branch too —');
const asap = ids('business', { timeline: 'asap' });
check('an urgent timeline asks what is driving the date',
  asap.includes('deadline_reason'), asap.filter(i => i.startsWith('dead')));
const planning = ids('business', { timeline: 'planning' });
check('"just planning" does not', !planning.includes('deadline_reason'));

// The timeline options track the studio's real 2-4 week delivery window.
const twoWeeks = ids('business', { timeline: '2w' });
check('a 2-week deadline is tight against a 2-4 week build, so it asks why',
  twoWeeks.includes('deadline_reason'), twoWeeks);
const oneMonth = ids('business', { timeline: '1m' });
check('"within a month" is the normal window and needs no justifying',
  !oneMonth.includes('deadline_reason'), oneMonth);
check('the retired multi-month options are gone',
  Object.keys(validateEnquiry('business', { timeline: '3-6m' })).includes('timeline'));
const unsureBudget = ids('business', { budget: 'unsure' });
check('an unsure budget asks about phasing', unsureBudget.includes('budget_phased'));

const SERVICES = ['business','revamp','ecommerce','webapp','medical','realestate','seo','marketing'] as const;
check('the reference-websites question is asked on every service',
  SERVICES.every((s) => ids(s, {}).includes('references')));

console.log('\n— question counts stay lean —');
const counts = SERVICES.map((s) => [s, ids(s, {}).length] as const);
console.log('  base (nothing answered, incl. common):');
console.log('  ' + counts.map(([s, n]) => `${s}:${n}`).join('  '));
check('services ask different numbers of questions', new Set(counts.map(([, n]) => n)).size > 1, counts);

// The 2026-07-26 trim is the point: a fully-branched service path must stay
// within 7–9 service questions. Common questions (6 base + 2 branched) sit on
// top of that, so the ceiling for everything a visitor can ever see is 17.
const deepAnswers: Record<(typeof SERVICES)[number], Answers> = {
  business: { biz_brand: 'partial' },
  revamp: {},
  ecommerce: { ecom_stage: 'online', ecom_needs: ['catalogue', 'payments', 'migration'] },
  webapp: {},
  medical: { med_overnight: 'yes' },
  realestate: { re_needs: ['website', 'landing', 'crm', 'capi', 'visits'] },
  seo: { seo_reach: 'multi_city' },
  marketing: { mkt_running: 'yes' },
};
for (const s of SERVICES) {
  const common = ids(s, deepAnswers[s]).filter((id) =>
    ['timeline', 'deadline_reason', 'budget', 'budget_phased', 'decision', 'notes', 'references'].includes(id));
  const service = ids(s, deepAnswers[s]).length - common.length;
  check(`${s}: fully branched asks ${service} service questions (≤9)`, service <= 9, service);
}

console.log('\n— stale answers cannot leak —');
// Answer the HMS question, then flip the split the other way.
const stale: Answers = { med_overnight: 'no', med_hms_modules: ['ipd', 'pharmacy'] };
check('hidden question is not visible after the branch flips',
  !ids('medical', stale).includes('med_hms_modules'), ids('medical', stale));
const pruned = pruneAnswers('medical', stale);
check('pruneAnswers drops the orphaned answer', pruned.med_hms_modules === undefined, pruned);
check('summary never shows the orphaned answer',
  !summarise('medical', stale).some((r) => r.label.includes('hospital modules')),
  summarise('medical', stale));

// Untick payments after answering the payment-methods follow-up.
const stalePay: Answers = { ecom_needs: ['catalogue'], ecom_payments: ['upi', 'cards'] };
const prunedPay = pruneAnswers('ecommerce', stalePay);
check('unticking payments prunes the orphaned payment methods',
  prunedPay.ecom_payments === undefined, prunedPay);

console.log('\n— validation —');
const emptyErrors = validateEnquiry('webapp', {});
check('empty enquiry reports errors for every required visible question',
  Object.keys(emptyErrors).length > 0, emptyErrors);
check('validation demands name, email and phone',
  'name' in emptyErrors && 'email' in emptyErrors && 'phone' in emptyErrors, emptyErrors);

/** A complete, valid webapp enquiry — every visible required question answered. */
const validWebapp = (): Answers => ({
  app_stage: 'idea',
  app_users: 'customers',
  app_features: ['accounts'],
  app_scale: 'lt50',
  timeline: '1m',
  budget: 'larger',
  budget_phased: 'unsure',
  decision: 'me',
  notes: 'We need a customer portal for our distributors.',
  name: 'Amy',
  email: 'amy@example.com',
  phone: '9876543210',
});

const badEmail = validateEnquiry('webapp',{ ...validWebapp(), email: 'nonsense' });
check('rejects an unusable email', badEmail.email !== undefined, badEmail);

const badPhone = validateEnquiry('webapp',{ ...validWebapp(), phone: '12345' });
check('rejects an unusable phone number', badPhone.phone !== undefined, badPhone);

// An email in the phone box (or vice versa) must not pass — that was the old
// either/or behaviour, and it is exactly what we no longer want.
const swapped = validateEnquiry('webapp',{
  ...validWebapp(), email: '9876543210', phone: 'amy@example.com',
});
check('rejects email and phone swapped',
  swapped.email !== undefined && swapped.phone !== undefined, swapped);

const bothGiven = validateEnquiry('webapp',validWebapp());
check('accepts a valid email and phone together', Object.keys(bothGiven).length === 0, bothGiven);

const phoneOnly = validateEnquiry('webapp',{ ...validWebapp(), email: '' });
check('email alone cannot be omitted', phoneOnly.email !== undefined, phoneOnly);

const forged = validateEnquiry('webapp',{ ...validWebapp(), budget: 'not-a-real-option' });
check('rejects an option value that is not in the schema', forged.budget !== undefined, forged);

// A question revealed by branching must become required, not optional.
const urgent = validateEnquiry('webapp',{ ...validWebapp(), timeline: 'asap' });
check('a question revealed by branching becomes required',
  urgent.deadline_reason !== undefined, urgent);
const urgentAnswered = validateEnquiry('webapp',{
  ...validWebapp(), timeline: 'asap', deadline_reason: 'launch',
});
check('…and passes once answered', Object.keys(urgentAnswered).length === 0, urgentAnswered);

// Optional free-text should never be rejected for being brief.
const shortOptional = validateEnquiry('webapp',{ ...validWebapp(), references: 'Apple' });
check('a brief optional note is accepted', Object.keys(shortOptional).length === 0, shortOptional);

console.log('\n— group headings —');

// Groups drive the sub-headings inside the form, so they must stay contiguous:
// a group name must not reappear after a different one has started.
for (const service of SERVICES) {
  const groups = visibleQuestions(service, {}).map((q) => q.group ?? '');
  const runs: string[] = [];
  for (const g of groups) if (runs[runs.length - 1] !== g) runs.push(g);
  check(`${service}: group headings stay contiguous`,
    new Set(runs).size === runs.length, runs);
}

check('every question carries a group', (() => {
  const all = SERVICES.flatMap((s) => visibleQuestions(s, {}));
  return all.every((q) => typeof q.group === 'string' && q.group.length > 0);
})());

console.log('\n— validating a subset of questions —');

const practiceQuestions = visibleQuestions('medical', {}).filter((q) => q.group === 'The practice');
const subsetBlank = validateQuestions(practiceQuestions, {});
check('an incomplete subset reports its own errors', Object.keys(subsetBlank).length > 0, subsetBlank);
check('…and only for questions in that subset',
  Object.keys(subsetBlank).every((id) => practiceQuestions.some((q) => q.id === id)),
  Object.keys(subsetBlank));
const subsetFilled = validateQuestions(practiceQuestions, {
  med_type: 'general', med_doctors: '1', med_branches: '1',
});
check('a completed subset passes', Object.keys(subsetFilled).length === 0, subsetFilled);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
