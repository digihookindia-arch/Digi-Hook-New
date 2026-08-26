'use client';

import { Plus, X } from 'lucide-react';

/**
 * Shared editing chrome for the dashboard's hand-editing surfaces
 * (DeliveryEditor, ProposalContentEditor) — one visual language for "a studio
 * person is typing into a row of a list" across both.
 */

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-neutral-700">
      {children}
    </span>
  );
}

export const inputClass =
  'w-full border-2 border-neutral-400 bg-bg p-2.5 text-[14px] leading-[1.4] text-text';

export function RowShell({
  children,
  onRemove,
  removeLabel,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="relative border-b border-neutral-300 p-[18px] pr-[58px]">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute right-[14px] top-[14px] inline-flex h-6 w-6 items-center justify-center border-2 border-neutral-400 text-neutral-700 transition-colors hover:border-accent-700 hover:text-accent-700"
      >
        <X size={13} strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  );
}

export function Panel({
  title,
  hint,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  hint: string;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7 border-2 border-text">
      <div className="bg-text px-[18px] py-3.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-bg">
        {title}
      </div>
      <p className="m-0 border-b border-neutral-300 p-[18px] text-[13.5px] leading-[1.55] text-neutral-700">
        {hint}
      </p>
      {children}
      {onAdd && addLabel ? (
        <div className="p-[18px]">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-[44px] items-center gap-2 border-2 border-text px-4 text-[13.5px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
          >
            <Plus size={14} strokeWidth={3} aria-hidden="true" />
            {addLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
