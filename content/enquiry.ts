/**
 * The enquiry form's question schema.
 *
 * NOTE ON COPY: unlike every other module under `content/`, the question and
 * option wording here is NEW — the prototype had only a six-chip picker, so
 * there was no approved copy to carry across. It is written in the studio's
 * plain-English voice and grounded in facts already published on the site
 * (the pricing bands, the OPD-vs-HMS dividing line, the SEO plans, the real
 * estate lead stages). It still needs client sign-off before launch.
 *
 * TRIMMED 2026-07-26 at the client's direction: each service now asks only the
 * questions that genuinely change the quote — 7 to 9 on a fully-branched path,
 * down from as many as 17. Anything that read like an internal audit ("which
 * courier partners?", "who signs this off day to day?") moved to the call.
 * The interest questions — reference websites, the problem in your own words —
 * stayed, because those are the ones prospects enjoy answering.
 *
 * Questions render in order. A question with `showIf` only appears when every
 * condition matches, and conditions may chain — so the number of questions a
 * visitor sees genuinely depends on what they picked earlier.
 */

export type QuestionType = 'select' | 'multi' | 'single' | 'text' | 'textarea';

export type Option = { value: string; label: string };

export type Condition = {
  questionId: string;
  /** Single-value answer equals this. */
  equals?: string;
  /** Single-value answer is one of these. */
  oneOf?: string[];
  /** Multi-value answer contains this. */
  includes?: string;
  /** Multi-value answer contains at least one of these. */
  includesAny?: string[];
};

export type Question = {
  id: string;
  type: QuestionType;
  label: string;
  help?: string;
  options?: Option[];
  required?: boolean;
  placeholder?: string;
  /** Every condition must hold (AND). */
  showIf?: Condition[];
  /** At least one condition must hold (OR). Combined with `showIf` as AND. */
  showIfAny?: Condition[];
  /** Sub-heading this question sits under, for grouping a long path. */
  group?: string;
};

export type ServiceKey =
  | 'business'
  | 'revamp'
  | 'ecommerce'
  | 'webapp'
  | 'medical'
  | 'realestate'
  | 'seo'
  | 'marketing';

export type ServiceOption = {
  key: ServiceKey;
  label: string;
  blurb: string;
};

/**
 * Step one. Everything downstream keys off this.
 *
 * Renamed 2026-07-26 at the client's direction: tabs are what the visitor is
 * shopping for, not the studio's practice names. "Website engineering" split
 * into business / revamp / web application; Design folded into the website
 * tabs as a brand question, because almost nobody buys identity work alone.
 * (Old enquiry rows keep their stored keys — the dashboard shows keys raw.)
 */
export const services: ServiceOption[] = [
  {
    key: 'business',
    label: 'Business website',
    blurb: 'A new website for your business.',
  },
  {
    key: 'revamp',
    label: 'Revamp my website',
    blurb: 'Redesign, rebuild or move an existing site.',
  },
  {
    key: 'ecommerce',
    label: 'Ecommerce website',
    blurb: 'Catalogue, cart, checkout and payments.',
  },
  {
    key: 'webapp',
    label: 'Web application',
    blurb: 'A product or portal behind a login.',
  },
  {
    key: 'medical',
    label: 'Clinic / hospital software',
    blurb: 'OPD system, hospital HMS, or a clinic site.',
  },
  {
    key: 'realestate',
    label: 'Real estate',
    blurb: 'Project sites, landing pages and lead CRM.',
  },
  {
    key: 'seo',
    label: 'SEO & AEO',
    blurb: 'Search visibility, and being cited by AI assistants.',
  },
  {
    key: 'marketing',
    label: 'Digital marketing',
    blurb: 'Search, content and paid growth.',
  },
];

const YES_NO_UNSURE: Option[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
];

/** Service-specific questions, in render order. */
export const questionsByService: Record<ServiceKey, Question[]> = {
  business: [
    {
      id: 'biz_current',
      type: 'text',
      group: 'The project',
      label: 'Your current website, if you have one',
      placeholder: 'yourbusiness.in',
      help: 'We will look at it before we talk — it answers half our questions for you.',
      required: false,
    },
    {
      id: 'biz_pages',
      type: 'select',
      group: 'The project',
      label: 'Roughly how many pages do you need?',
      help: 'We count layouts rather than URLs — twenty pages using five layouts is a smaller job than eight that are all different.',
      required: true,
      options: [
        { value: '1-5', label: '1 – 5' },
        { value: '6-12', label: '6 – 12' },
        { value: '13-30', label: '13 – 30' },
        { value: '30+', label: 'More than 30' },
        { value: 'unsure', label: 'Not sure yet' },
      ],
    },
    {
      id: 'biz_content_ready',
      type: 'select',
      group: 'Scope and content',
      label: 'Is the copy and imagery ready?',
      help: 'If our editors write and direct it, that is real work with a real cost — better to know now than at the end.',
      required: true,
      options: [
        { value: 'ready', label: 'Yes, written and approved' },
        { value: 'partly', label: 'Partly — some of it exists' },
        { value: 'none', label: 'No, we need help with all of it' },
      ],
    },
    {
      id: 'biz_cms',
      type: 'single',
      group: 'Scope and content',
      label: 'Does your team need to edit content without a developer?',
      required: true,
      options: YES_NO_UNSURE,
    },
    {
      id: 'biz_integrations',
      type: 'multi',
      group: 'Scope and content',
      label: 'What does it need to connect to?',
      help: 'Name the specific tools in the notes at the end if you know them.',
      required: true,
      options: [
        { value: 'payments', label: 'A payment gateway' },
        { value: 'crm', label: 'A CRM' },
        { value: 'erp', label: 'An ERP or accounting system' },
        { value: 'email', label: 'Email marketing' },
        { value: 'analytics', label: 'Analytics and tracking' },
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'booking', label: 'A booking or calendar system' },
        { value: 'none', label: 'Nothing yet' },
      ],
    },
    {
      id: 'biz_brand',
      type: 'single',
      group: 'Look and feel',
      label: 'Do you have an existing brand identity?',
      required: true,
      options: [
        { value: 'yes', label: 'Yes, and we are keeping it' },
        { value: 'partial', label: 'Partly — it needs tidying up' },
        { value: 'no', label: 'No, starting from nothing' },
      ],
    },
    {
      id: 'biz_brand_assets',
      type: 'multi',
      group: 'Look and feel',
      label: 'What exists already?',
      required: true,
      showIf: [{ questionId: 'biz_brand', oneOf: ['yes', 'partial'] }],
      options: [
        { value: 'logo', label: 'A logo' },
        { value: 'colours', label: 'Brand colours' },
        { value: 'fonts', label: 'Chosen fonts' },
        { value: 'guidelines', label: 'Written guidelines' },
        { value: 'photography', label: 'Photography' },
        { value: 'nothing', label: 'Nothing usable' },
      ],
    },
  ],

  revamp: [
    {
      id: 'rev_current',
      type: 'text',
      group: 'Your site today',
      label: 'Your current website',
      placeholder: 'yourbusiness.in',
      help: 'We will look at it before we talk — it answers half our questions for you.',
      required: true,
    },
    {
      id: 'rev_platform',
      type: 'select',
      group: 'Your site today',
      label: 'What is it built on today?',
      required: true,
      options: [
        { value: 'wordpress', label: 'WordPress' },
        { value: 'wix', label: 'Wix' },
        { value: 'squarespace', label: 'Squarespace' },
        { value: 'shopify', label: 'Shopify' },
        { value: 'custom', label: 'A custom or in-house build' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
    {
      id: 'rev_urls',
      type: 'select',
      group: 'Your site today',
      label: 'Roughly how many pages exist today?',
      help: 'Moving pages without losing their search rankings is careful work, so the number matters.',
      required: true,
      options: [
        { value: 'lt50', label: 'Under 50' },
        { value: '50-500', label: '50 – 500' },
        { value: '500-5000', label: '500 – 5,000' },
        { value: 'gt5000', label: 'More than 5,000' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
    {
      id: 'rev_problems',
      type: 'multi',
      group: 'Your site today',
      label: 'What is failing you?',
      required: true,
      options: [
        { value: 'dated', label: 'It looks dated' },
        { value: 'slow', label: 'It is slow' },
        { value: 'invisible', label: 'It does not show up in search' },
        { value: 'no_leads', label: 'It brings no enquiries' },
        { value: 'mobile', label: 'It breaks on phones' },
        { value: 'editing', label: 'We cannot edit it ourselves' },
        { value: 'outgrown', label: 'We have outgrown the platform' },
      ],
    },
    {
      id: 'rev_design',
      type: 'single',
      group: 'The revamp',
      label: 'How far should the redesign go?',
      required: true,
      options: [
        { value: 'keep', label: 'Keep the look, fix what is behind it' },
        { value: 'refresh', label: 'Refresh the design' },
        { value: 'rebrand', label: 'Start again — a new look entirely' },
      ],
    },
    {
      id: 'rev_content',
      type: 'single',
      group: 'The revamp',
      label: 'Will the content change too?',
      required: true,
      options: [
        { value: 'keep', label: 'Keep the existing content' },
        { value: 'rework', label: 'Rework some of it' },
        { value: 'new', label: 'Mostly new content' },
      ],
    },
    {
      id: 'rev_cms',
      type: 'single',
      group: 'The revamp',
      label: 'Does your team need to edit content without a developer?',
      required: true,
      options: YES_NO_UNSURE,
    },
    {
      id: 'rev_integrations',
      type: 'multi',
      group: 'The revamp',
      label: 'What does it need to connect to?',
      help: 'Name the specific tools in the notes at the end if you know them.',
      required: true,
      options: [
        { value: 'payments', label: 'A payment gateway' },
        { value: 'crm', label: 'A CRM' },
        { value: 'erp', label: 'An ERP or accounting system' },
        { value: 'email', label: 'Email marketing' },
        { value: 'analytics', label: 'Analytics and tracking' },
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'booking', label: 'A booking or calendar system' },
        { value: 'none', label: 'Nothing yet' },
      ],
    },
  ],

  ecommerce: [
    {
      id: 'ecom_stage',
      type: 'single',
      group: 'Where you are now',
      label: 'Are you selling already?',
      required: true,
      options: [
        { value: 'online', label: 'Yes, online' },
        { value: 'offline', label: 'Yes, but offline only' },
        { value: 'not_yet', label: 'Not yet' },
      ],
    },
    {
      id: 'ecom_platform',
      type: 'select',
      group: 'Where you are now',
      label: 'What are you selling on today?',
      required: true,
      showIf: [{ questionId: 'ecom_stage', equals: 'online' }],
      options: [
        { value: 'shopify', label: 'Shopify' },
        { value: 'woocommerce', label: 'WooCommerce' },
        { value: 'magento', label: 'Magento' },
        { value: 'custom', label: 'A custom build' },
        { value: 'marketplace', label: 'Marketplaces only (Amazon, Flipkart)' },
        { value: 'other', label: 'Something else' },
      ],
    },
    {
      id: 'ecom_url',
      type: 'text',
      group: 'Where you are now',
      label: 'Your store or website, if it is live',
      placeholder: 'yourstore.in',
      help: 'We will browse it as a customer would before we say anything.',
      required: false,
    },
    {
      id: 'ecom_products',
      type: 'select',
      group: 'The store',
      label: 'Roughly how many products?',
      help: 'Two hundred products behave nothing like two thousand — this decides how the catalogue is built.',
      required: true,
      options: [
        { value: 'lt100', label: 'Under 100' },
        { value: '100-1000', label: '100 – 1,000' },
        { value: '1000-10000', label: '1,000 – 10,000' },
        { value: 'gt10000', label: 'More than 10,000' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
    {
      id: 'ecom_variants',
      type: 'single',
      group: 'The store',
      label: 'Do products come in variants?',
      help: 'Sizes, colours, materials — variants change how the catalogue is modelled.',
      required: true,
      options: [
        { value: 'yes', label: 'Yes, most of them' },
        { value: 'some', label: 'Some of them' },
        { value: 'no', label: 'No, each product is one thing' },
      ],
    },
    {
      id: 'ecom_needs',
      type: 'multi',
      group: 'The store',
      label: 'Which parts do you need built?',
      required: true,
      options: [
        { value: 'catalogue', label: 'Catalogue and search' },
        { value: 'checkout', label: 'Cart and checkout' },
        { value: 'payments', label: 'Payment gateway' },
        { value: 'admin', label: 'Inventory and order dashboards' },
        { value: 'seo', label: 'Product schema and search setup' },
        { value: 'migration', label: 'Migration from an existing store' },
      ],
    },
    {
      id: 'ecom_payments',
      type: 'multi',
      group: 'The store',
      label: 'Which payment methods do you need?',
      required: true,
      showIf: [{ questionId: 'ecom_needs', includes: 'payments' }],
      options: [
        { value: 'upi', label: 'UPI' },
        { value: 'cards', label: 'Cards' },
        { value: 'netbanking', label: 'Netbanking' },
        { value: 'cod', label: 'Cash on delivery' },
        { value: 'emi', label: 'EMI' },
        { value: 'intl', label: 'International payments' },
      ],
    },
    {
      id: 'ecom_shipping',
      type: 'multi',
      group: 'The store',
      label: 'How do orders reach customers?',
      required: true,
      options: [
        { value: 'courier', label: 'Courier partners' },
        { value: 'own', label: 'Our own delivery' },
        { value: 'pickup', label: 'Store pickup' },
        { value: 'digital', label: 'Digital goods — nothing ships' },
      ],
    },
    {
      id: 'ecom_brand',
      type: 'single',
      group: 'Look and feel',
      label: 'Do you have an existing brand identity?',
      help: 'Logo, colours, product photography — whatever exists, we build on it.',
      required: true,
      options: [
        { value: 'yes', label: 'Yes, and we are keeping it' },
        { value: 'partial', label: 'Partly — it needs tidying up' },
        { value: 'no', label: 'No, starting from nothing' },
      ],
    },
  ],

  webapp: [
    {
      id: 'app_stage',
      type: 'single',
      group: 'The application',
      label: 'Where is it today?',
      required: true,
      options: [
        { value: 'idea', label: 'An idea we can describe' },
        { value: 'designs', label: 'Wireframes or designs exist' },
        { value: 'running', label: 'A version is running and needs rebuilding' },
      ],
    },
    {
      id: 'app_users',
      type: 'single',
      group: 'The application',
      label: 'Who logs in?',
      required: true,
      options: [
        { value: 'staff', label: 'Our staff only' },
        { value: 'customers', label: 'Our customers' },
        { value: 'both', label: 'Both' },
      ],
    },
    {
      id: 'app_features',
      type: 'multi',
      group: 'The application',
      label: 'What does the application need to do?',
      required: true,
      options: [
        { value: 'accounts', label: 'User accounts and profiles' },
        { value: 'roles', label: 'Roles and permissions' },
        { value: 'dashboards', label: 'Dashboards and reporting' },
        { value: 'uploads', label: 'File or document uploads' },
        { value: 'notifications', label: 'Email or SMS notifications' },
        { value: 'payments', label: 'Payments or subscriptions' },
        { value: 'api', label: 'Talking to another system over an API' },
      ],
    },
    {
      id: 'app_scale',
      type: 'select',
      group: 'The application',
      label: 'Roughly how many people will use it?',
      required: true,
      options: [
        { value: 'lt50', label: 'Under 50' },
        { value: '50-500', label: '50 – 500' },
        { value: '500-5000', label: '500 – 5,000' },
        { value: 'gt5000', label: 'More than 5,000' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
  ],

  medical: [
    {
      id: 'med_overnight',
      type: 'single',
      group: 'Which system',
      label: 'Do you admit patients overnight?',
      help: 'This is the dividing line between an OPD system and a full hospital HMS.',
      required: true,
      options: [
        { value: 'no', label: 'No — patients come and go the same day' },
        { value: 'yes', label: 'Yes — we admit patients' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
    {
      id: 'med_opd_modules',
      type: 'multi',
      group: 'Which system',
      label: 'Which parts of the OPD system do you need?',
      help: 'The patient-facing website is included either way, at no separate cost.',
      required: true,
      showIf: [{ questionId: 'med_overnight', oneOf: ['no', 'unsure'] }],
      options: [
        { value: 'appointments', label: 'Appointments and rescheduling' },
        { value: 'records', label: 'Patient records' },
        { value: 'prescriptions', label: 'Digital prescriptions' },
        { value: 'followups', label: 'Follow-up scheduling and reminders' },
        { value: 'payments', label: 'Payment and collection tracking' },
        { value: 'dashboard', label: 'A daily clinic dashboard' },
      ],
    },
    {
      id: 'med_hms_modules',
      type: 'multi',
      group: 'Which system',
      label: 'Which hospital modules do you need?',
      help: 'Everything in the OPD system is included. Pick what to add on top.',
      required: true,
      showIf: [{ questionId: 'med_overnight', equals: 'yes' }],
      options: [
        { value: 'ipd', label: 'IPD — admission to discharge' },
        { value: 'beds', label: 'Beds, wards and transfers' },
        { value: 'pharmacy', label: 'Pharmacy and inventory' },
        { value: 'lab', label: 'Laboratory and reports' },
        { value: 'billing', label: 'Hospital-wide billing' },
        { value: 'management', label: 'Management dashboard' },
      ],
    },
    {
      id: 'med_type',
      type: 'select',
      group: 'The practice',
      label: 'What kind of practice is it?',
      required: true,
      options: [
        { value: 'single', label: 'A single doctor' },
        { value: 'general', label: 'A general clinic' },
        { value: 'speciality', label: 'A speciality clinic' },
        { value: 'diagnostic', label: 'A diagnostic centre' },
        { value: 'multi', label: 'A multi-speciality clinic' },
        { value: 'hospital', label: 'A hospital or healthcare group' },
      ],
    },
    {
      id: 'med_doctors',
      type: 'select',
      group: 'The practice',
      label: 'How many doctors?',
      required: true,
      options: [
        { value: '1', label: 'One' },
        { value: '2-5', label: 'Two to five' },
        { value: '6-20', label: 'Six to twenty' },
        { value: 'gt20', label: 'More than twenty' },
      ],
    },
    {
      id: 'med_branches',
      type: 'select',
      group: 'The practice',
      label: 'How many locations?',
      required: true,
      options: [
        { value: '1', label: 'One' },
        { value: '2-3', label: 'Two or three' },
        { value: '4+', label: 'Four or more' },
      ],
    },
    {
      id: 'med_records',
      type: 'single',
      group: 'How you work today',
      label: 'How are patient records kept today?',
      help: 'If they live in software or spreadsheets, we will talk about moving them across.',
      required: true,
      options: [
        { value: 'paper', label: 'On paper' },
        { value: 'spreadsheets', label: 'In spreadsheets' },
        { value: 'software', label: 'In existing software' },
        { value: 'mixed', label: 'A mix of all three' },
      ],
    },
    {
      id: 'med_website',
      type: 'single',
      group: 'How you work today',
      label: 'Do you have a website today?',
      help: 'The patient-facing site is included with both systems either way.',
      required: true,
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'outdated', label: 'Yes, but it is outdated' },
        { value: 'no', label: 'No' },
      ],
    },
  ],

  realestate: [
    {
      id: 're_role',
      type: 'select',
      group: 'Your business',
      label: 'Which describes you best?',
      required: true,
      options: [
        { value: 'developer', label: 'A developer or builder' },
        { value: 'broker', label: 'A broker' },
        { value: 'channel', label: 'A channel partner' },
        { value: 'sales', label: 'A project sales team' },
        { value: 'commercial', label: 'Commercial real estate' },
      ],
    },
    {
      id: 're_projects',
      type: 'select',
      group: 'Your business',
      label: 'How many projects?',
      required: true,
      options: [
        { value: '1', label: 'One' },
        { value: '2-5', label: 'Two to five' },
        { value: '6-20', label: 'Six to twenty' },
        { value: 'gt20', label: 'More than twenty' },
      ],
    },
    {
      id: 're_types',
      type: 'multi',
      group: 'Your business',
      label: 'What are you selling?',
      required: true,
      options: [
        { value: 'apartments', label: 'Apartments' },
        { value: 'villas', label: 'Villas' },
        { value: 'plots', label: 'Plots or land' },
        { value: 'commercial', label: 'Offices and shops' },
        { value: 'warehouse', label: 'Warehousing' },
      ],
    },
    {
      id: 're_cities',
      type: 'text',
      group: 'Your business',
      label: 'Which cities do you sell in?',
      placeholder: 'e.g. Noida, Greater Noida',
      required: true,
    },
    {
      id: 're_needs',
      type: 'multi',
      group: 'What to build',
      label: 'Which parts do you need?',
      required: true,
      options: [
        { value: 'website', label: 'Project or developer website' },
        { value: 'landing', label: 'Campaign landing pages' },
        { value: 'crm', label: 'Lead CRM' },
        { value: 'capi', label: 'Meta Conversions API' },
        { value: 'visits', label: 'Site visit tracking' },
      ],
    },
    {
      id: 're_crm_today',
      type: 'select',
      group: 'Leads and follow-up',
      label: 'What do you track leads in today?',
      required: true,
      showIf: [{ questionId: 're_needs', includes: 'crm' }],
      options: [
        { value: 'nothing', label: 'Nothing formal' },
        { value: 'whatsapp', label: 'WhatsApp and personal phones' },
        { value: 'spreadsheet', label: 'Spreadsheets' },
        { value: 'crm', label: 'An existing CRM' },
      ],
    },
    {
      id: 're_sources',
      type: 'multi',
      group: 'Leads and follow-up',
      label: 'Where do your enquiries come from today?',
      required: true,
      showIf: [{ questionId: 're_needs', includes: 'crm' }],
      options: [
        { value: 'meta', label: 'Meta ads' },
        { value: 'google', label: 'Google ads' },
        { value: 'website', label: 'Your website' },
        { value: 'landing', label: 'Landing pages' },
        { value: 'portals', label: 'Property portals' },
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'referral', label: 'Referrals' },
        { value: 'walkin', label: 'Walk-ins' },
      ],
    },
  ],

  seo: [
    {
      id: 'seo_url',
      type: 'text',
      group: 'Your site today',
      label: 'What is your website address?',
      placeholder: 'yourbusiness.in',
      help: 'We look at what you already rank for before saying anything about it.',
      required: true,
    },
    {
      id: 'seo_platform',
      type: 'select',
      group: 'Your site today',
      label: 'What is it built on?',
      required: true,
      options: [
        { value: 'wordpress', label: 'WordPress' },
        { value: 'wix', label: 'Wix or Squarespace' },
        { value: 'shopify', label: 'Shopify' },
        { value: 'custom', label: 'A custom build' },
        { value: 'unsure', label: 'Not sure' },
      ],
    },
    {
      id: 'seo_goals',
      type: 'multi',
      group: 'What you want',
      label: 'What are you trying to fix?',
      required: true,
      options: [
        { value: 'invisible', label: 'We do not appear at all' },
        { value: 'page_two', label: 'We sit on page two' },
        { value: 'local', label: 'Competitors outrank us locally' },
        { value: 'ai', label: 'AI assistants never mention us' },
        { value: 'traffic', label: 'Traffic exists but enquiries do not' },
        { value: 'dropped', label: 'Rankings dropped recently' },
      ],
    },
    {
      id: 'seo_plan',
      type: 'single',
      group: 'What you want',
      label: 'Which plan looks closest?',
      help: 'Both are monthly with no lock-in, and exclude GST.',
      required: true,
      options: [
        { value: 'growth', label: 'Growth — ₹8,000 / month' },
        { value: 'authority', label: 'Authority + AEO — ₹12,000 / month' },
        { value: 'audit', label: 'Not sure — audit first' },
      ],
    },
    {
      id: 'seo_reach',
      type: 'select',
      group: 'Who you are targeting',
      label: 'Where do your customers search from?',
      required: true,
      options: [
        { value: 'one_city', label: 'One city' },
        { value: 'multi_city', label: 'Several cities' },
        { value: 'india', label: 'All of India' },
        { value: 'intl', label: 'Outside India too' },
      ],
    },
    {
      id: 'seo_locations',
      type: 'text',
      group: 'Who you are targeting',
      label: 'Which cities?',
      required: true,
      showIf: [{ questionId: 'seo_reach', oneOf: ['one_city', 'multi_city'] }],
    },
    {
      id: 'seo_keywords',
      type: 'textarea',
      group: 'Who you are targeting',
      label: 'What should you be found for?',
      placeholder: 'The searches you want to win — in your customers’ words, not industry jargon.',
      required: false,
    },
    {
      id: 'seo_competitors',
      type: 'textarea',
      group: 'Who you are targeting',
      label: 'Who is beating you?',
      placeholder: 'Two or three competitor names or URLs.',
      help: 'We study who is already winning and work out why, so names save us a step.',
      required: false,
    },
  ],

  marketing: [
    {
      id: 'mkt_goal',
      type: 'select',
      group: 'What you want',
      label: 'What are you actually trying to move?',
      required: true,
      options: [
        { value: 'more', label: 'More enquiries' },
        { value: 'quality', label: 'Better quality enquiries' },
        { value: 'cost', label: 'A lower cost per enquiry' },
        { value: 'brand', label: 'Awareness of the brand' },
      ],
    },
    {
      id: 'mkt_needs',
      type: 'multi',
      group: 'What you want',
      label: 'Which parts do you need?',
      required: true,
      options: [
        { value: 'technical_seo', label: 'Technical SEO' },
        { value: 'content', label: 'Content' },
        { value: 'google_ads', label: 'Google ads' },
        { value: 'meta_ads', label: 'Meta ads' },
        { value: 'measurement', label: 'Analytics and measurement setup' },
        { value: 'attribution', label: 'Enquiry attribution' },
      ],
    },
    {
      id: 'mkt_audience',
      type: 'select',
      group: 'What you want',
      label: 'Who are you selling to?',
      required: true,
      options: [
        { value: 'b2c', label: 'Consumers' },
        { value: 'b2b', label: 'Other businesses' },
        { value: 'both', label: 'Both' },
      ],
    },
    {
      id: 'mkt_geography',
      type: 'select',
      group: 'What you want',
      label: 'Where should the campaigns run?',
      required: true,
      options: [
        { value: 'local', label: 'One city' },
        { value: 'regional', label: 'Several cities' },
        { value: 'india', label: 'All of India' },
        { value: 'intl', label: 'Outside India too' },
      ],
    },
    {
      id: 'mkt_running',
      type: 'single',
      group: 'Advertising today',
      label: 'Are you running ads at the moment?',
      required: true,
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'stopped', label: 'We stopped' },
        { value: 'no', label: 'Never have' },
      ],
    },
    {
      id: 'mkt_spend',
      type: 'select',
      group: 'Advertising today',
      label: 'Roughly what is the monthly ad spend?',
      help: 'Ad spend is paid to the platform, not to us — it only helps us judge scale.',
      required: true,
      showIf: [{ questionId: 'mkt_running', oneOf: ['yes', 'stopped'] }],
      options: [
        { value: 'lt25k', label: 'Under ₹25,000' },
        { value: '25k-1l', label: '₹25,000 – ₹1L' },
        { value: '1l-5l', label: '₹1L – ₹5L' },
        { value: 'gt5l', label: 'More than ₹5L' },
      ],
    },
    {
      id: 'mkt_measure',
      type: 'single',
      group: 'Advertising today',
      label: 'Can you tell which enquiries came from which campaign?',
      required: true,
      options: YES_NO_UNSURE,
    },
  ],

};

/** Asked on every path, after the service-specific questions. */
export const commonQuestions: Question[] = [
  {
    id: 'timeline',
    type: 'select',
    group: 'Timeline and budget',
    label: 'When do you want this live?',
    help: 'Most builds take us two to four weeks.',
    required: true,
    /*
     * Scaled to the studio's actual delivery window (2–4 weeks), 2026-07-26 —
     * the old one-to-three-months / three-to-six-months options described a
     * timescale this studio does not work on. "Within 2 weeks" sits below the
     * floor on purpose: picking it is the signal that the job is a rush or the
     * scope needs cutting, which is why it triggers the follow-up below.
     */
    options: [
      { value: 'asap', label: 'As soon as possible' },
      { value: '2w', label: 'Within 2 weeks' },
      { value: '1m', label: 'Within a month' },
      { value: 'planning', label: 'Just planning for now' },
    ],
  },
  {
    id: 'deadline_reason',
    type: 'select',
    group: 'Timeline and budget',
    label: 'Is the date driven by something?',
    help: 'A real fixed date changes how we stage the build.',
    required: true,
    // Only the two that are tight against a 2–4 week build. "Within a month"
    // is the normal window, so it needs no justifying.
    showIf: [{ questionId: 'timeline', oneOf: ['asap', '2w'] }],
    options: [
      { value: 'launch', label: 'A launch or opening' },
      { value: 'campaign', label: 'A campaign going live' },
      { value: 'event', label: 'An event or exhibition' },
      { value: 'season', label: 'A seasonal peak' },
      { value: 'broken', label: 'The current site is failing us' },
      { value: 'none', label: 'No fixed date — we just want to start' },
    ],
  },
  {
    id: 'budget',
    type: 'select',
    group: 'Timeline and budget',
    label: 'Which of these fits?',
    help: 'Our packages are flat-priced — ₹20,000 for a business website, ₹35,000 for a store, both excluding GST. Add-ons are listed on the pricing page.',
    required: true,
    options: [
      { value: 'business', label: '₹20,000 — a business website' },
      { value: 'business_cms', label: '₹30,000 — a business website we can edit ourselves' },
      { value: 'ecommerce', label: '₹35,000 — an ecommerce website' },
      { value: 'ecommerce_plus', label: '₹40,000+ — a store with the SEO dashboard' },
      { value: 'larger', label: 'Something larger than these' },
      { value: 'unsure', label: 'Not sure — advise me' },
    ],
  },
  {
    id: 'budget_phased',
    type: 'single',
    group: 'Timeline and budget',
    label: 'Would a phased build help?',
    help: 'Start with the essentials, add the rest once the first part is earning.',
    required: true,
    showIf: [{ questionId: 'budget', oneOf: ['unsure', 'larger'] }],
    options: YES_NO_UNSURE,
  },
  {
    id: 'decision',
    type: 'select',
    group: 'Timeline and budget',
    label: 'Who signs this off?',
    help: 'Knowing who has to agree keeps the scope document pointed at the right person.',
    required: true,
    options: [
      { value: 'me', label: 'Me' },
      { value: 'me_partner', label: 'Me and a partner' },
      { value: 'management', label: 'A management team' },
      { value: 'board', label: 'A board or head office' },
    ],
  },
  {
    id: 'notes',
    type: 'textarea',
    group: 'In your words',
    label: 'The problem in your own words',
    help: 'What is not working today, and what would count as success?',
    required: true,
    placeholder: 'Tell us what you are trying to achieve.',
  },
  {
    id: 'references',
    type: 'textarea',
    group: 'In your words',
    label: 'Websites you like',
    help: 'Competitors or not — anything whose look, feel or ideas you want us to see. Just as useful: anything you actively dislike.',
    placeholder: 'Two or three links, and a word on what you like about each.',
    required: false,
  },
];

/** Contact details, asked last. */
export const detailQuestions: Question[] = [
  { id: 'name', type: 'text', label: 'Your name', required: true },
  // Both required, not either/or: the email carries the proposal link and the
  // phone is how we chase it. A brief we cannot reply to twice is a dead lead.
  {
    id: 'email',
    type: 'text',
    label: 'Email address',
    help: 'Where we send your proposal.',
    required: true,
  },
  {
    id: 'phone',
    type: 'text',
    label: 'Phone number',
    help: 'So we can talk it through before writing anything.',
    required: true,
  },
  { id: 'company', type: 'text', label: 'Company', required: false },
  {
    id: 'role',
    type: 'text',
    label: 'Your role',
    placeholder: 'e.g. Founder, Marketing Head',
    required: false,
  },
  {
    id: 'prefer',
    type: 'single',
    label: 'How should we reach you?',
    required: false,
    options: [
      { value: 'call', label: 'A call' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'email', label: 'Email' },
    ],
  },
  {
    id: 'how_heard',
    type: 'select',
    label: 'How did you find us?',
    required: false,
    options: [
      { value: 'google', label: 'Google' },
      { value: 'ai', label: 'An AI assistant' },
      { value: 'referral', label: 'Someone referred us' },
      { value: 'social', label: 'Social media' },
      { value: 'knowledge', label: 'The Knowledge Hub' },
      { value: 'other', label: 'Something else' },
    ],
  },
];
