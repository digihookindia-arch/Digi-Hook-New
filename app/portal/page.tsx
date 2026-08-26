import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { listProjectsForClient } from '@/lib/portalProjects';
import { site } from '@/lib/site';
import { requireClient } from './actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Client portal',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * The signed-in landing page. Most clients have exactly one project and go
 * straight to it; several projects get a picker; none yet gets a plain
 * explanation rather than a dead end.
 */
export default async function PortalIndexPage() {
  const client = await requireClient();
  const projects = await listProjectsForClient(client.id);

  const only = projects.length === 1 ? projects[0] : undefined;
  if (only) redirect(`/portal/${only.id}`);

  if (projects.length === 0) {
    return (
      <div>
        <h1 className="m-0 mb-4 font-heading text-[clamp(30px,4.4vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
          Hello, {client.name.split(/\s+/)[0] || client.name}.
        </h1>
        <p className="m-0 mb-4 max-w-[52ch] text-[16px] leading-[1.65] text-neutral-800">
          Your account is active, but no project is linked to it yet. That
          usually just means we have not finished setting it up — call us on{' '}
          <a
            href={`tel:${site.phoneHref}`}
            className="border-b border-accent text-accent-700"
          >
            {site.phoneDisplay}
          </a>{' '}
          and we will sort it while you are on the line.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="m-0 mb-4 font-heading text-[clamp(30px,4.4vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
        Your projects.
      </h1>
      <p className="m-0 mb-8 max-w-[52ch] text-[16px] leading-[1.65] text-neutral-800">
        Pick the one you want to look at.
      </p>
      <div className="border-t-2 border-text">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/portal/${project.id}`}
            className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-300 py-5 transition-colors hover:text-accent-700"
          >
            <span className="font-heading text-[17px] font-bold leading-[1.25] tracking-[-0.02em]">
              {project.businessName}
            </span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
