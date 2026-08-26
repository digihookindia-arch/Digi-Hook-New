'use client';

import { useActionState } from 'react';
import { Plus } from 'lucide-react';
import { addPortalClientAction, type PortalAdminState } from './actions';

const inputClass =
  'w-full border-2 border-neutral-400 bg-bg p-3 text-[14.5px] leading-none text-text';

const labelClass =
  'mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700';

export function AddClientForm() {
  const [state, action, pending] = useActionState(
    addPortalClientAction,
    {} as PortalAdminState
  );

  return (
    <form action={action} className="mb-9 border-2 border-text p-6">
      <h2 className="m-0 mb-1.5 font-heading text-[19px] font-bold leading-[1.2] tracking-[-0.02em]">
        Add a portal client
      </h2>
      <p className="m-0 mb-5 text-[13.5px] leading-[1.55] text-neutral-700">
        Creates the account and the project, and emails them a set-password
        link. An email that already has an account just gets the new project
        added to it.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
        <label className="block">
          <span className={labelClass}>Client email</span>
          <input name="email" type="email" className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Contact name</span>
          <input name="name" type="text" className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Business name</span>
          <input name="business" type="text" className={inputClass} />
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="m-0 mt-3 text-[13px] font-medium leading-[1.45] text-accent-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-5 py-3.5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
      >
        <Plus size={16} aria-hidden="true" />
        {pending ? 'Setting up…' : 'Add client and send invite'}
      </button>
    </form>
  );
}
