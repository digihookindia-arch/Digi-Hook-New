import type { Metadata } from 'next';
import { deeps } from '@/content/deep';
import { routes } from '@/content/navigation';
import { DeepPage } from '@/components/DeepPage';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions } from '@/content/meta';
import { JsonLd, serviceSchema, faqSchema } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';

const deep = deeps.realestate;

export const metadata: Metadata = pageMetadata({
  title: 'Real Estate Technology Solutions',
  description: metaDescriptions.realestate,
  path: routes.realestate,
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          serviceSchema({
            name: deep.kicker,
            description: deep.lead,
            url: `${SITE_URL}${routes.realestate}`,
            serviceType: 'Real estate websites and lead CRM',
          }),
          faqSchema(deep.faqs),
        ]}
      />
      <DeepPage deep={deep} />
    </>
  );
}
