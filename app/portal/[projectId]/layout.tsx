import type { Metadata } from 'next';
import { site } from '@/lib/site';
import { portalProject } from '../actions';
import { PortalTabs } from './PortalTabs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Client portal',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * Chrome for one project: the business-name header, the tab nav, and the
 * "talk to us" footer. The ownership check here covers the visitor; every
 * page underneath re-checks via `portalProject()` itself, because a layout
 * that declines to render children does not stop those pages executing —
 * same rule as the proposal tabs.
 */
export default async function PortalProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { client, project } = await portalProject(projectId);

  return (
    <>
      <h1 className="m-0 mb-2 font-heading text-[clamp(30px,4.4vw,56px)] font-extrabold leading-[1.0] tracking-[-0.045em]">
        {project.businessName}
      </h1>
      <p className="m-0 mb-8 text-[14px] leading-[1.6] text-neutral-700">
        Signed in as {client.name} · {client.email}
      </p>

      <PortalTabs projectId={project.id} />

      {children}

      <div className="mt-12 border-t-2 border-text pt-7">
        <h2 className="m-0 mb-3 font-heading text-[clamp(20px,2.2vw,28px)] font-bold leading-[1.15] tracking-[-0.028em]">
          Rather talk it through?
        </h2>
        <p className="m-0 mb-4 max-w-[52ch] text-[15.5px] leading-[1.6] text-neutral-800">
          Anything you would raise here, you can also raise on the phone — the
          ticket just keeps a record we both can see.
        </p>
        <a
          href={`tel:${site.phoneHref}`}
          className="font-heading text-[clamp(20px,2vw,28px)] font-bold leading-none tracking-[-0.025em] text-accent-700"
        >
          {site.phoneDisplay}
        </a>
        <div className="mt-4 text-[13.5px] leading-[1.6] text-neutral-700">
          {site.addressLine}
          <br />
          {site.hoursLine}
        </div>
      </div>
    </>
  );
}
