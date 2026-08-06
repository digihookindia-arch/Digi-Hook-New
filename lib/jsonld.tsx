import { site, SITE_URL } from './site';

/**
 * Structured data (README SEO/AEO requirement). Organization + LocalBusiness are
 * emitted sitewide from the root layout; pages add Service / FAQPage / Article /
 * BreadcrumbList / Offer as relevant. Stable @ids let the graph cross-reference.
 */

const ORG_ID = `${SITE_URL}/#organization`;
const BUSINESS_ID = `${SITE_URL}/#localbusiness`;

type Json = Record<string, unknown>;

/** Renders one JSON-LD block. `id` keeps React keys/hydration stable. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  return (
    <script
      type="application/ld+json"
      // Content is our own trusted, statically-derived data — safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const postalAddress: Json = {
  '@type': 'PostalAddress',
  streetAddress: site.address.street,
  addressLocality: site.address.locality,
  addressRegion: site.address.region,
  postalCode: site.address.postalCode,
  addressCountry: site.address.country,
};

export function organizationSchema(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.name,
    legalName: site.legalName,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/logo.png`,
    email: site.email,
    telephone: `+${site.phoneHref.replace(/^\+/, '')}`,
    description: site.description,
    address: postalAddress,
    areaServed: 'IN',
    // Omitted entirely while empty — an empty sameAs is noise, not a signal.
    ...(site.socials.length ? { sameAs: site.socials } : {}),
    // Mirrors the seven practices the site actually sells — these are the
    // topics we want the studio resolved against as an entity.
    knowsAbout: [
      'Website engineering',
      'Next.js development',
      'Search engine optimisation',
      'Answer engine optimisation',
      'Ecommerce development',
      'Web performance',
      'Digital marketing',
      'Brand and interface design',
      'Healthcare technology',
      'Real estate technology',
    ],
  };
}

/**
 * Ties every URL on the domain to one named site, and to the Organization
 * behind it. This is what lets a search engine treat the pages as one entity
 * rather than a set of unrelated documents.
 */
export function webSiteSchema(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: site.name,
    description: site.description,
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-IN',
  };
}

export function localBusinessSchema(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': BUSINESS_ID,
    name: site.name,
    image: `${SITE_URL}/logo.png`,
    url: `${SITE_URL}/`,
    telephone: `+${site.phoneHref.replace(/^\+/, '')}`,
    email: site.email,
    priceRange: '₹₹',
    address: postalAddress,
    areaServed: { '@type': 'Country', name: 'India' },
    parentOrganization: { '@id': ORG_ID },
    ...(site.socials.length ? { sameAs: site.socials } : {}),
    ...(site.geo
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: site.geo.latitude,
            longitude: site.geo.longitude,
          },
        }
      : {}),
    ...(site.mapUrl ? { hasMap: site.mapUrl } : {}),
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: site.openingHours.days,
        opens: site.openingHours.opens,
        closes: site.openingHours.closes,
      },
    ],
  };
}

export function serviceSchema(input: {
  name: string;
  description: string;
  url: string;
  serviceType?: string;
}): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: input.url,
    serviceType: input.serviceType ?? input.name,
    provider: { '@id': ORG_ID },
    areaServed: { '@type': 'Country', name: 'India' },
  };
}

export function faqSchema(items: readonly { q: string; a: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbSchema(
  crumbs: readonly { name: string; path: string }[]
): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path}`,
    })),
  };
}

export function articleSchema(input: {
  headline: string;
  description: string;
  url: string;
  section: string;
  datePublished: string;
  dateModified: string;
}): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    articleSection: input.section,
    url: input.url,
    mainEntityOfPage: input.url,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
  };
}

export function offerSchema(input: {
  name: string;
  description: string;
  price?: string;
  priceCurrency?: string;
}): Json {
  const currency = input.priceCurrency ?? 'INR';
  return {
    '@type': 'Offer',
    name: input.name,
    description: input.description,
    priceCurrency: currency,
    ...(input.price
      ? {
          price: input.price,
          // Prices are quoted before tax — say so in the markup, not just in
          // the visible copy, so aggregators don't present them as inclusive.
          priceSpecification: {
            '@type': 'PriceSpecification',
            price: input.price,
            priceCurrency: currency,
            valueAddedTaxIncluded: false,
          },
        }
      : {}),
    seller: { '@id': ORG_ID },
  };
}
