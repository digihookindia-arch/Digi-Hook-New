'use client';

import { Printer } from 'lucide-react';

/**
 * Prints the document, or saves it as a PDF — which is what most clients
 * actually want, because the person who signs off the spend is rarely the
 * person holding the access code.
 *
 * The print stylesheet in `globals.css` is what makes this worth offering:
 * the tab nav, the accept button and the site chrome carry `data-print-hide`,
 * and the printed copy ends with the signature lines in `AcceptProposal`. It
 * hides itself when printing, for the obvious reason.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-[40px] items-center gap-2 border-2 border-neutral-400 px-3.5 text-[12.5px] font-semibold leading-none text-neutral-700 transition-colors hover:border-text hover:text-text print:hidden"
    >
      <Printer size={14} aria-hidden="true" />
      Print or save as PDF
    </button>
  );
}
