/**
 * Meta Pixel helpers for the /get-quote funnel. The base script loads only on
 * that route (see app/get-quote/MetaPixel.tsx) — the rest of the site carries
 * no third-party scripts, keep it that way.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function callFbq(...args: unknown[]): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq(...args);
}

/** Standard Meta Pixel event, e.g. "Lead", "ViewContent". */
export function trackPixelEvent(name: string, params?: Record<string, unknown>): void {
  callFbq('track', name, params);
}

/** Custom Meta Pixel event, e.g. "QuoteStep". */
export function trackPixelCustom(name: string, params?: Record<string, unknown>): void {
  callFbq('trackCustom', name, params);
}
