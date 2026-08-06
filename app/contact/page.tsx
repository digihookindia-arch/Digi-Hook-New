import type { Metadata } from 'next';
import { routes } from '@/content/navigation';
import { pageMetadata } from '@/lib/seo';
import { metaDescriptions } from '@/content/meta';
import { site } from '@/lib/site';
import { EnquiryForm } from './EnquiryForm';

const lead =
  'Tell us what you are trying to achieve. You get a written scope back — pages, technology choices, timeline and what each stage costs. No obligation, no sales call in between.';

export const metadata: Metadata = pageMetadata({
  title: 'Contact',
  description: metaDescriptions.contact,
  path: routes.contact,
});

export default function Page() {
  return (
    <main>
      {/* Hero — server-rendered, so the page still reads as content without JS. */}
      <section className="border-b-2 border-divider">
        <div className="mx-auto max-w-content px-gutter py-[clamp(48px,7vh,84px)]">
          <div className="mb-6 text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-700">
            Contact
          </div>
          <h1 className="m-0 mb-6 max-w-[20ch] font-heading text-[clamp(38px,5.4vw,84px)] font-extrabold leading-[0.95] tracking-[-0.045em]">
            Request a project scope.
          </h1>
          <p className="m-0 max-w-[58ch] text-[17px] leading-[1.6] text-neutral-800">
            {lead}
          </p>
        </div>
      </section>

      {/* The enquiry engine. */}
      <section>
        <div className="mx-auto max-w-content px-gutter py-[clamp(48px,7vh,88px)]">
          <EnquiryForm />
        </div>
      </section>

      {/* Studio details, kept at the foot so they never compete with the form. */}
      <section className="border-t-2 border-divider">
        <div className="mx-auto flex max-w-content flex-wrap gap-x-[clamp(28px,5vw,72px)] gap-y-6 px-gutter py-[clamp(40px,5vh,64px)]">
          <div>
            <div className="mb-2 text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-neutral-700">
              Studio
            </div>
            <div className="text-[15.5px] font-medium leading-[1.5]">
              A211, Golden I, Noida Extension
              <br />
              Uttar Pradesh, India
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-neutral-700">
              Phone
            </div>
            <a
              href={`tel:${site.phoneHref}`}
              className="font-heading text-[24px] font-bold leading-none tracking-[-0.02em] text-text transition-colors hover:text-accent-700"
            >
              {site.phoneDisplay}
            </a>
          </div>
          <div>
            <div className="mb-2 text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-neutral-700">
              Hours
            </div>
            <div className="text-[15.5px] font-medium leading-[1.5]">
              Monday – Saturday, 10:00 – 19:00 IST
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
