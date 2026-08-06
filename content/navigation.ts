/**
 * Route registry + the menu/footer link lists.
 * Lifted from the prototype's `P` map and the `menuServices` / `menuCompany` /
 * `footerServices` / `footerCompany` data — labels and ordering verbatim.
 */

export type RouteKey =
  | 'home'
  | 'engineering'
  | 'seo'
  | 'ecommerce'
  | 'medical'
  | 'realestate'
  | 'marketing'
  | 'creative'
  | 'technology'
  | 'knowledge'
  | 'article'
  | 'articleStack'
  | 'articleCost'
  | 'pricing'
  | 'about'
  | 'contact';

export const routes: Record<RouteKey, string> = {
  home: '/',
  engineering: '/website-engineering',
  seo: '/seo-aeo',
  ecommerce: '/ecommerce-solutions',
  medical: '/medical-technology',
  realestate: '/real-estate-technology',
  marketing: '/digital-marketing',
  creative: '/creative-design-studio',
  technology: '/technology',
  knowledge: '/knowledge-hub',
  article: '/knowledge-hub/why-your-website-is-slow',
  articleStack: '/knowledge-hub/nextjs-or-wordpress',
  articleCost: '/knowledge-hub/what-a-website-costs-in-india',
  pricing: '/pricing',
  about: '/about',
  contact: '/contact',
};

export type NavLink = { num: string; label: string; href: string };

const n = (i: number) => (i < 9 ? '0' + (i + 1) : String(i + 1));

/** Full-screen menu — "Services" column. */
export const menuServices: NavLink[] = (
  [
    ['engineering', 'Website Engineering'],
    ['seo', 'SEO & AEO'],
    ['ecommerce', 'Ecommerce'],
    ['medical', 'Medical Tech'],
    ['realestate', 'Real Estate Tech'],
    ['marketing', 'Digital Marketing'],
    ['creative', 'Creative Studio'],
  ] as const
).map(([key, label], i) => ({ num: n(i), label, href: routes[key] }));

/** Full-screen menu — "Company" column. */
export const menuCompany: NavLink[] = (
  [
    ['home', 'Home'],
    ['technology', 'Technology'],
    ['knowledge', 'Knowledge Hub'],
    ['pricing', 'Pricing'],
    ['about', 'About'],
    ['contact', 'Contact'],
  ] as const
).map(([key, label], i) => ({ num: n(i + 6), label, href: routes[key] }));

/** Footer — "Services" column (full service names). */
export const footerServices: { label: string; href: string }[] = [
  { label: 'Website Engineering', href: routes.engineering },
  { label: 'SEO & AEO', href: routes.seo },
  { label: 'Ecommerce Solutions', href: routes.ecommerce },
  { label: 'Medical Technology', href: routes.medical },
  { label: 'Real Estate Technology', href: routes.realestate },
  { label: 'Digital Marketing', href: routes.marketing },
  { label: 'Creative Design Studio', href: routes.creative },
];

/** Footer — "Company" column. */
export const footerCompany: { label: string; href: string }[] = [
  { label: 'Technology', href: routes.technology },
  { label: 'Knowledge Hub', href: routes.knowledge },
  { label: 'Pricing', href: routes.pricing },
  { label: 'About Digi Hook', href: routes.about },
  { label: 'Contact', href: routes.contact },
];
