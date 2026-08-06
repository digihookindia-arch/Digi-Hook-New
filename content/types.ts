/** Shared shapes for the content modules. */

export type Numbered = { num: string; title: string; body: string };
export type Faq = { id: string; q: string; a: string };
export type Spec = { name: string; plain: string };
export type Checklist = { num: string; title: string; body: string; items: string[] };
export type Stage = { num: string; name: string };
export type Audience = { title: string; body: string };

/** Light card on the ground, or a filled accent "poster" card. */
export type Variant = 'light' | 'accent';

export type ServiceContent = {
  kicker: string;
  title: string;
  lead: string;
  chips: string[];
  failTitle: string;
  problems: Numbered[];
  buildTitle: string;
  builds: Checklist[];
  specs: Spec[];
  ctaTitle: string;
};

export type Split = {
  num: string;
  kicker: string;
  title: string;
  body: string;
  forLabel: string;
  forWho: string;
  items: string[];
  cta: string;
  variant: Variant;
};

export type DeepContent = {
  kicker: string;
  title: string;
  lead: string;
  lead2: string;
  chips: string[];
  hasSplit: boolean;
  noSplit: boolean;
  siteItems?: string[];
  splits?: Split[];
  leakKicker: string;
  leakTitle: string;
  leakIntro: string;
  problems: Numbered[];
  moreKicker: string;
  moreTitle: string;
  moreIntro: string;
  moreIntro2: string;
  capabilities: string[];
  ecoKicker: string;
  ecoTitle: string;
  ecosystem?: Checklist[];
  stagesKicker: string;
  stagesTitle: string;
  stagesIntro: string;
  stages: Stage[];
  panelKicker: string;
  panelTitle: string;
  panelBody1: string;
  panelBody2: string;
  panelNote: string;
  panelTableTitle: string;
  panelRows: { name: string; stage: string }[];
  gapsTitle: string;
  gaps: string[];
  gapsNote: string;
  opsKicker: string;
  opsTitle: string;
  opsIntro: string;
  ops: Numbered[];
  audienceKicker: string;
  audienceTitle: string;
  audience: Audience[];
  startTitle: string;
  startIntro: string;
  startItems: string[];
  startNote: string;
  startCta: string;
  faqs: Faq[];
  ctaTitle: string;
  ctaBody: string;
};

export type Plan = {
  kicker: string;
  title: string;
  price: string;
  priceNote: string;
  body: string;
  items: string[];
  cta: string;
  variant: Variant;
  num?: string;
  forLabel?: string;
};

export type Topic = {
  id: string;
  num: string;
  name: string;
  tag: string;
  what: string;
  why: string;
  how: string;
};

export type SeoType = {
  id: string;
  num: string;
  name: string;
  tag: string;
  body: string;
  items: string[];
};
