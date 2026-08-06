import type { Metadata } from 'next';
import './globals.css';
import { archivo } from './fonts';
import { site, SITE_URL } from '@/lib/site';
import {
  JsonLd,
  organizationSchema,
  localBusinessSchema,
  webSiteSchema,
} from '@/lib/jsonld';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ScrollProgress } from '@/components/ScrollProgress';
import { PageTransition } from '@/components/PageTransition';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Digi Hook — IT solutions & creative agency in Noida',
    template: '%s · Digi Hook',
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'en_IN',
    url: `${SITE_URL}/`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={archivo.variable} data-scroll-behavior="smooth">
      <body className="font-sans">
        {/* Organization + WebSite + LocalBusiness, sitewide (README SEO
            requirement). Stable @ids let the three cross-reference. */}
        <JsonLd
          data={[organizationSchema(), webSiteSchema(), localBusinessSchema()]}
        />
        <ScrollProgress />
        <Header />
        <PageTransition>{children}</PageTransition>
        <Footer />
      </body>
    </html>
  );
}
