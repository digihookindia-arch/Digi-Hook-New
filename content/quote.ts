/**
 * /get-quote ad-funnel content — questions, branches, budget rules, tech stack.
 *
 * Single source of truth for the funnel: the client renderer, the server
 * action and the dashboard all read from here, so the server can re-derive
 * which questions a visitor actually saw and prune posted answers to those
 * (same rule as the contact enquiry schema — never trust the posted field
 * list).
 *
 * Copy status: NOT client-approved verbatim; ranges in BUDGET_RULES were set
 * by the client for ecommerce only, the rest are working defaults awaiting
 * confirmation.
 */

export type OptionIcon =
  | 'briefcase'
  | 'image'
  | 'shopping-cart'
  | 'refresh'
  | 'megaphone'
  | 'app-window'
  | 'help-circle';

export type QuoteOption = {
  id: string;
  title: string;
  description?: string;
  icon?: OptionIcon;
  /** In multi-select questions, picking this clears every other selection. */
  exclusive?: boolean;
};

export type QuoteQuestion = {
  key: string;
  title: string;
  subtitle?: string;
  mode: 'single' | 'multi' | 'text';
  options: QuoteOption[];
  placeholder?: string;
};

export const TYPE_QUESTION: QuoteQuestion = {
  key: 'websiteType',
  title: 'What type of website do you need?',
  mode: 'single',
  options: [
    {
      id: 'business',
      title: 'Business Website',
      description: 'For your company or services.',
      icon: 'briefcase',
    },
    {
      id: 'portfolio',
      title: 'Portfolio Website',
      description: 'Showcase your work.',
      icon: 'image',
    },
    {
      id: 'ecommerce',
      title: 'Ecommerce Website',
      description: 'Sell products online.',
      icon: 'shopping-cart',
    },
    {
      id: 'redesign',
      title: 'Website Redesign',
      description: 'Rebuild or refresh an existing site.',
      icon: 'refresh',
    },
    {
      id: 'landing',
      title: 'Landing Page',
      description: 'One page built for ad traffic.',
      icon: 'megaphone',
    },
    {
      id: 'webapp',
      title: 'Custom Web App',
      description: 'A portal or product behind a login.',
      icon: 'app-window',
    },
    {
      id: 'something-else',
      title: 'Something Else',
      description: 'Tell us what you need.',
      icon: 'help-circle',
    },
  ],
};

const KICKSTART_QUESTION: QuoteQuestion = {
  key: 'kickstart',
  title: 'When do you plan to kickstart the project?',
  mode: 'single',
  options: [
    { id: 'week', title: 'Within a week' },
    { id: 'two-weeks', title: 'Within 2 weeks' },
    { id: 'month', title: 'Within a month' },
    { id: 'not-sure', title: 'Not sure yet' },
  ],
};

const PAGE_COUNT_QUESTION: QuoteQuestion = {
  key: 'pageCount',
  title: 'How many pages do you roughly need?',
  mode: 'single',
  options: [
    { id: '1-3', title: '1–3' },
    { id: '4-7', title: '4–7' },
    { id: '8-15', title: '8–15' },
    { id: 'not-sure', title: 'Not sure' },
  ],
};

export const BRANCHES: Record<string, QuoteQuestion[]> = {
  business: [
    PAGE_COUNT_QUESTION,
    {
      key: 'contentReady',
      title: 'Do you have content and logo ready?',
      mode: 'single',
      options: [
        { id: 'yes', title: 'Yes, everything' },
        { id: 'partial', title: 'Partially' },
        { id: 'no', title: 'No, I need help' },
      ],
    },
    KICKSTART_QUESTION,
  ],
  portfolio: [
    PAGE_COUNT_QUESTION,
    {
      key: 'workSamplesReady',
      title: 'Is your work ready to show?',
      subtitle: 'Photos, project shots, case details.',
      mode: 'single',
      options: [
        { id: 'yes', title: 'Yes, all of it' },
        { id: 'partial', title: 'Some of it' },
        { id: 'no', title: 'No, I need help collecting it' },
      ],
    },
    KICKSTART_QUESTION,
  ],
  ecommerce: [
    {
      key: 'categoryCount',
      title: 'How many product categories?',
      mode: 'single',
      options: [
        { id: '1-5', title: '1–5' },
        { id: '6-15', title: '6–15' },
        { id: '15-plus', title: 'More than 15' },
        { id: 'not-sure', title: 'Not sure' },
      ],
    },
    {
      key: 'productCount',
      title: 'Roughly how many products in total?',
      mode: 'single',
      options: [
        { id: 'under-50', title: 'Under 50' },
        { id: '50-250', title: '50–250' },
        { id: '250-1000', title: '250–1,000' },
        { id: '1000-plus', title: 'More than 1,000' },
        { id: 'not-sure', title: 'Not sure' },
      ],
    },
    {
      key: 'storeFeatures',
      title: 'What does your store need?',
      subtitle: 'Select all that apply.',
      mode: 'multi',
      options: [
        { id: 'payment-gateway', title: 'Payment gateway', description: 'UPI, cards, netbanking.' },
        { id: 'cod', title: 'Cash on delivery' },
        { id: 'shipping', title: 'Shipping integration', description: 'Shiprocket, Delhivery, etc.' },
        { id: 'inventory', title: 'Inventory management', description: 'Stock tracking and alerts.' },
        { id: 'not-sure', title: 'Not sure yet', description: "We'll advise you.", exclusive: true },
      ],
    },
    {
      key: 'productContentReady',
      title: 'Are product photos and details ready?',
      mode: 'single',
      options: [
        { id: 'yes', title: 'Yes, all of it' },
        { id: 'partial', title: 'Partially' },
        { id: 'no', title: 'No, I need help' },
      ],
    },
    KICKSTART_QUESTION,
  ],
  redesign: [
    {
      key: 'redesignIssues',
      title: "What's wrong with your current site?",
      subtitle: 'Select all that apply.',
      mode: 'multi',
      options: [
        { id: 'outdated', title: 'Looks outdated' },
        { id: 'slow', title: 'Slow to load' },
        { id: 'not-mobile', title: 'Bad on mobile' },
        { id: 'no-leads', title: 'Not bringing enquiries' },
        { id: 'new-features', title: 'Needs new features' },
        { id: 'rebrand', title: 'Complete rebrand' },
      ],
    },
    {
      key: 'contentKeep',
      title: 'Keep the existing content?',
      mode: 'single',
      options: [
        { id: 'keep', title: 'Keep most of it' },
        { id: 'rewrite', title: 'Rewrite most of it' },
        { id: 'decide-later', title: "We'll decide page by page" },
      ],
    },
    KICKSTART_QUESTION,
  ],
  landing: [
    {
      key: 'trafficSource',
      title: 'Where will the traffic come from?',
      mode: 'single',
      options: [
        { id: 'meta-ads', title: 'Meta ads' },
        { id: 'google-ads', title: 'Google ads' },
        { id: 'both', title: 'Both' },
        { id: 'other', title: 'Organic / other' },
      ],
    },
    {
      key: 'copyReady',
      title: 'Is the content and offer ready?',
      subtitle: 'Headline, offer, images.',
      mode: 'single',
      options: [
        { id: 'yes', title: 'Yes, everything' },
        { id: 'partial', title: 'Partially' },
        { id: 'no', title: 'No, I need help' },
      ],
    },
    KICKSTART_QUESTION,
  ],
  webapp: [
    {
      key: 'appBrief',
      title: 'What should the app do?',
      subtitle: "Two or three lines is enough. We'll map the details on a call.",
      mode: 'text',
      options: [],
      placeholder: 'e.g. A portal where my dealers log in, place orders and track dispatch…',
    },
    KICKSTART_QUESTION,
  ],
  'something-else': [
    {
      key: 'projectBrief',
      title: 'Tell us what you need',
      subtitle: 'A rough idea is fine.',
      mode: 'text',
      options: [],
      placeholder: 'e.g. I have a website but need a booking system added to it…',
    },
    KICKSTART_QUESTION,
  ],
};

/** Asked after name & business, before the phone card. */
export const CONTACT_TIME_QUESTION: QuoteQuestion = {
  key: 'contactTime',
  title: 'When should we contact you?',
  mode: 'single',
  options: [
    { id: 'morning', title: 'Morning', description: '10:00–13:00' },
    { id: 'afternoon', title: 'Afternoon', description: '13:00–17:00' },
    { id: 'evening', title: 'Evening', description: '17:00–19:00' },
  ],
};

export type BudgetRule = {
  /** Typical price range in INR, shown on the pitch card. */
  min: number;
  max: number;
  /** Lowest custom budget accepted if the visitor declines the range. Enforced on entry + server. */
  floor: number;
  /** Plural label used in pitch/error copy, e.g. "Ecommerce websites". */
  label: string;
};

// TODO: confirm every range with the client — only the ecommerce numbers came
// from them (30-40k, floor 25k). The rest are working defaults.
export const BUDGET_RULES: Record<string, BudgetRule> = {
  business: { min: 12000, max: 18000, floor: 10000, label: 'Business websites' },
  portfolio: { min: 18000, max: 25000, floor: 15000, label: 'Portfolio websites' },
  ecommerce: { min: 30000, max: 40000, floor: 25000, label: 'Ecommerce websites' },
  redesign: { min: 12000, max: 18000, floor: 10000, label: 'Website redesigns' },
  landing: { min: 10000, max: 15000, floor: 8000, label: 'Landing pages' },
  webapp: { min: 30000, max: 60000, floor: 25000, label: 'Custom web apps' },
  'something-else': { min: 10000, max: 30000, floor: 10000, label: 'Projects' },
};

/** Shown on the budget pitch card, above the price range. */
export const TECH_STACK: { area: string; tech: string }[] = [
  { area: 'Frontend', tech: 'React JS / Next JS' },
  { area: 'Backend', tech: 'Node JS / Laravel' },
  { area: 'Database', tech: 'MongoDB / MySQL' },
];

export const DEFAULT_BRANCH = 'business';

/** Full question sequence for a chosen (or not-yet-chosen) website type. */
export function getQuestions(websiteType: string): QuoteQuestion[] {
  return [TYPE_QUESTION, ...(BRANCHES[websiteType] ?? BRANCHES[DEFAULT_BRANCH] ?? [])];
}

/** Questions + budget pitch + budget entry + name card + contact-time card + phone card. */
export function getTotalSteps(websiteType: string): number {
  return getQuestions(websiteType).length + 5;
}

export function formatInr(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

/** The funnel's WhatsApp line (client-supplied), distinct from the studio number. */
export const QUOTE_WHATSAPP_NUMBER = '918595732020';
export const QUOTE_WHATSAPP_LINK = `https://wa.me/${QUOTE_WHATSAPP_NUMBER}`;
