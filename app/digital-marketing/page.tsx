import type { Metadata } from 'next';
import { services } from '@/content/services';
import { routes } from '@/content/navigation';
import { ServicePage } from '@/components/ServicePage';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions } from '@/content/meta';
import { JsonLd, serviceSchema } from '@/lib/jsonld';
import { SITE_URL } from '@/lib/site';

const svc = services.marketing;

export const metadata: Metadata = pageMetadata({
  title: 'Digital Marketing',
  description: metaDescriptions.marketing,
  path: routes.marketing,
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={serviceSchema({
          name: svc.kicker,
          description: svc.lead,
          url: `${SITE_URL}${routes.marketing}`,
          serviceType: 'Digital marketing',
        })}
      />
      <ServicePage svc={svc} />
    </>
  );
}
