'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { ArrowRight } from 'lucide-react';
import { requestPasswordReset } from '../actions';

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    {} as { done?: string; error?: string }
  );

  return (
    <div className="mx-auto max-w-[420px]">
      <h1 className="m-0 mb-3 font-heading text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
        Forgotten password.
      </h1>
      <p className="m-0 mb-6 text-[15px] leading-[1.6] text-neutral-800">
        Enter your email and we will send a link to choose a new one.
      </p>

      {state.done ? (
        <div className="border-2 border-accent-600 p-6">
          <p className="m-0 text-[15px] leading-[1.6] text-neutral-800">{state.done}</p>
        </div>
      ) : (
        <form action={action} className="border-2 border-text bg-bg p-7">
          <label
            htmlFor="email"
            className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? 'forgot-error' : undefined}
            className={`w-full border-2 bg-bg p-3.5 text-[15px] leading-none text-text ${
              state.error ? 'border-accent-700' : 'border-neutral-400'
            }`}
          />
          {state.error ? (
            <p
              id="forgot-error"
              role="alert"
              className="m-0 mt-2 text-[13px] font-medium leading-[1.45] text-accent-700"
            >
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 inline-flex items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-5 py-3.5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
          >
            {pending ? 'Sending…' : 'Send the link'}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
      )}

      <p className="m-0 mt-5 text-[13.5px] leading-[1.6] text-neutral-700">
        <Link href="/portal/login" className="border-b border-accent text-accent-700">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
