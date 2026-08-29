import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { listDocuments } from '@/lib/documents';
import { portalProject } from '../../actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Documents',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

function displaySize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Everything the studio has shared with this client, in one place —
 * invoices, scope, agreements, handover papers. Uploading is studio-only,
 * from the dashboard.
 */
export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await portalProject(projectId);
  const documents = await listDocuments(project.id);

  return (
    <div>
      <h2 className="m-0 mb-4 font-heading text-[clamp(19px,2vw,24px)] font-bold leading-[1.15] tracking-[-0.025em]">
        Your documents
      </h2>

      {documents.length === 0 ? (
        <p className="m-0 text-[15px] leading-[1.6] text-neutral-700">
          Invoices, agreements and project papers we share with you will appear
          here. Nothing yet.
        </p>
      ) : (
        <div className="border-t-2 border-text">
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={`/portal/${project.id}/documents/file/${doc.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-neutral-300 py-4 transition-colors hover:text-accent-700"
            >
              <span className="flex min-w-0 items-center gap-3">
                <FileText size={16} aria-hidden="true" className="shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block text-[15.5px] font-semibold leading-[1.4]">
                    {doc.title}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-none text-neutral-700">
                    {doc.filename} · {displaySize(doc.size)}
                  </span>
                </span>
              </span>
              <span className="text-[12.5px] leading-none text-neutral-700">
                {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
