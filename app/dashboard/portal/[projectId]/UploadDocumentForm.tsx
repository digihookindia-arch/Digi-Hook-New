'use client';

import { useActionState } from 'react';
import { Upload } from 'lucide-react';
import { uploadDocumentAction, type DocumentState } from '../actions';

/** Shares one file with the client. PNG/JPG/WebP/PDF, up to 5 MB. */
export function UploadDocumentForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    uploadDocumentAction,
    {} as DocumentState
  );

  return (
    <form action={action} className="border-2 border-neutral-300 p-5">
      <input type="hidden" name="project" value={projectId} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-end gap-4">
        <label className="block">
          <span className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
            Title the client sees
          </span>
          <input
            name="title"
            type="text"
            maxLength={120}
            placeholder="e.g. GST invoice — August 2026"
            className="w-full border-2 border-neutral-400 bg-bg p-3 text-[14px] leading-none text-text placeholder:text-neutral-500"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
            File (PDF or image, 5 MB)
          </span>
          <input
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="w-full border-2 border-neutral-400 bg-bg p-2.5 text-[13px] leading-none text-neutral-800 file:mr-3 file:border-0 file:bg-text file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:uppercase file:text-bg"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 border-2 border-accent-600 bg-accent-600 px-5 text-[14px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
        >
          <Upload size={15} aria-hidden="true" />
          {pending ? 'Sharing…' : 'Share with client'}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="m-0 mt-3 text-[13px] font-medium leading-[1.45] text-accent-700">
          {state.error}
        </p>
      ) : null}
      {state.savedAt ? (
        <p role="status" className="m-0 mt-3 text-[13px] font-medium leading-[1.45] text-neutral-700">
          Shared. The client sees it on their Documents tab now.
        </p>
      ) : null}
    </form>
  );
}
