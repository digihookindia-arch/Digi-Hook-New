/**
 * The repeated "poster statement" CTA band. This is the default copy used on
 * most pages; individual pages override `heading` / `body` / `button` where the
 * prototype does (SEO, About, Article, etc.).
 */
export type CtaContent = {
  eyebrow: string;
  heading: string;
  body: string;
  button: string;
};

export const defaultCta: CtaContent = {
  eyebrow: 'Next step',
  heading: 'Tell us the problem. We’ll send the engineering.',
  body: 'A written scope with pages, technology choices, timeline and stage costs — before any commitment.',
  button: 'Request a project scope',
};
