import Link from 'next/link';
import { listProjects } from '@/lib/portalProjects';
import { getClient, isActivated } from '@/lib/clients';
import { supportState } from '@/lib/support';
import { isDbConfigured, dbFile } from '@/lib/db';
import { requireSession, signOut } from '../actions';
import { AddClientForm } from './AddClientForm';

export const dynamic = 'force-dynamic';

export default async function PortalClientsPage() {
  await requireSession();

  const configured = isDbConfigured();
  const projects = configured ? await listProjects() : [];
  const clients = new Map(
    await Promise.all(
      [...new Set(projects.map((p) => p.clientId))].map(
        async (id) => [id, await getClient(id)] as const
      )
    )
  );

  return (
    <main>
      <div className="mx-auto max-w-content px-gutter py-[clamp(40px,6vh,72px)]">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5 border-b-2 border-text pb-6">
          <div>
            <div className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-700">
              Digi Hook · Internal
            </div>
            <h1 className="m-0 font-heading text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              Portal clients
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 border-2 border-text px-4 py-3.5 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
            >
              Proposals
            </Link>
            <Link
              href="/dashboard/tickets"
              className="inline-flex items-center gap-2 border-2 border-text px-4 py-3.5 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
            >
              Tickets
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="border-2 border-neutral-400 px-4 py-3.5 text-[14px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {!configured ? (
          <p className="m-0 mb-5 border-l-2 border-accent py-1 pl-4 text-[14.5px] leading-[1.55] text-accent-700">
            <strong className="font-heading">The database is unwritable.</strong> Could
            not open <code>{dbFile}</code> — portal clients cannot be stored until that
            is fixed.
          </p>
        ) : (
          <AddClientForm />
        )}

        {configured && projects.length === 0 ? (
          <p className="m-0 py-8 text-[15.5px] leading-[1.6] text-neutral-700">
            No portal clients yet. Add the first one above — they get an email
            with a set-password link, and their page shows the support plan and
            payments you set on the project.
          </p>
        ) : null}

        {projects.length > 0 ? (
          <div className="border-t-2 border-text">
            {projects.map((project) => {
              const client = clients.get(project.clientId) ?? null;
              const support = supportState(project.liveAt, project.supportDays);
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/portal/${project.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-b border-neutral-300 py-5 transition-colors hover:text-accent-700"
                >
                  <span className="min-w-0 flex-[1_1_320px]">
                    <span className="block font-heading text-[19px] font-bold leading-[1.25] tracking-[-0.02em]">
                      {project.businessName}
                    </span>
                    <span className="mt-1.5 block text-[13.5px] leading-[1.5] text-neutral-700">
                      {client ? client.email : 'account missing'} ·{' '}
                      {new Date(project.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </span>
                  <span className="flex flex-none items-center gap-2.5">
                    <span
                      className={`inline-flex items-center border px-2.5 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] ${
                        client && isActivated(client)
                          ? 'border-text text-text'
                          : 'border-accent-600 text-accent-700'
                      }`}
                    >
                      {client && isActivated(client) ? 'Active' : 'Invited'}
                    </span>
                    <span className="inline-flex items-center border border-neutral-400 px-2.5 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-neutral-700">
                      {support.state === 'active'
                        ? `${support.daysLeft}d support left`
                        : support.state === 'ended'
                          ? 'Support ended'
                          : 'Not live'}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
