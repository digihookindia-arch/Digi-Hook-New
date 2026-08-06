'use client';

import { useActionState } from 'react';
import { ArrowRight } from 'lucide-react';
import { signIn } from '../actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, {} as { error?: string });

  return (
    <main>
      <div className="mx-auto max-w-[420px] px-gutter py-[clamp(56px,10vh,120px)]">
        <div className="mb-6 text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-700">
          Digi Hook · Internal
        </div>
        <h1 className="m-0 mb-6 font-heading text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
          Proposal dashboard.
        </h1>

        <form action={action} className="border-2 border-text bg-bg p-7">
          <label
            htmlFor="password"
            className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700"
          >
            Team password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? 'login-error' : undefined}
            className={`w-full border-2 bg-bg p-3.5 text-[15px] leading-none text-text ${
              state.error ? 'border-accent-700' : 'border-neutral-400'
            }`}
          />
          {state.error ? (
            <p
              id="login-error"
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
            {pending ? 'Checking…' : 'Sign in'}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>
      </div>
    </main>
  );
}
