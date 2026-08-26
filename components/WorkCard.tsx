'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Maximize2, X } from 'lucide-react';
import { workSection, type WorkItem } from '@/content/work';
import { ClientReview } from './ClientReview';
import { Reveal } from './Reveal';
import { ScoreRow } from './ScoreRings';

/**
 * One live client site: preview, scores, stack, link — and a popup that frames
 * the real running site rather than showing a picture of it.
 *
 * **The popup only works because the three client vhosts opt in.** Each sends
 * `Content-Security-Policy: frame-ancestors 'self' https://digihook.in`, added
 * 2026-08-13. Without it the box renders empty: CloudPanel's shared
 * `/etc/nginx/global_settings` puts `X-Frame-Options: SAMEORIGIN` on every site
 * on the VPS, and frame-ancestors is what supersedes it in modern browsers.
 * If a preview ever goes blank, check that header on the client site first —
 * a CloudPanel update that rewrites the vhost will silently drop the line.
 *
 * The iframe is mounted only while the dialog is open, so a visitor who never
 * clicks pays nothing for it. That is the whole reason this is not three
 * always-mounted iframes: the page publishes a performance budget a few hundred
 * pixels up, and three live sites loading behind it would break the promise.
 */

/**
 * The preview screenshot, requested only once it is nearly in view.
 *
 * **This is not premature optimisation — it is a measured regression fix.**
 * With three plain lazy `next/image` previews, PageSpeed Insights put this page
 * at 91 with a 3.2s LCP, against 100 and 1.8s for a sibling service page with
 * the same hero and byte-identical JavaScript (15 requests, 204 KB on both).
 * The only difference was these three images: +62 KB, and the hero paragraph's
 * render delay went from 860ms to ~2.6s. `loading="lazy"` was not enough —
 * Chrome's lazy threshold under mobile throttling is thousands of pixels, so it
 * fetched all three inside the critical window and starved the text.
 *
 * Gating on an IntersectionObserver takes them off the critical path entirely:
 * with a 600px margin the swap happens well before a scrolling visitor reaches
 * the card, so nobody sees a placeholder resolve. The `<noscript>` copy keeps
 * the screenshot and its alt text in the served HTML, because "server-render
 * everything" is a rule here and a crawler should still find them.
 */
function LazyShot({ item }: { item: WorkItem }) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || show) return;
    // No capability gate on IntersectionObserver: the stylesheet already
    // requires color-mix() and min(), both years newer than it, so a browser
    // that lacks it cannot render this site at all.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <span
      ref={boxRef}
      className="relative block aspect-[2/1] w-full overflow-hidden bg-neutral-200"
    >
      {show && (
        <Image
          src={item.shot}
          alt={item.shotAlt}
          width={1440}
          height={900}
          sizes="min(100vw, 1400px)"
          className="block h-full w-full object-cover object-top"
        />
      )}
      <noscript
        dangerouslySetInnerHTML={{
          __html: `<img src="${item.shot}" alt="${item.shotAlt.replace(/"/g, '&quot;')}" width="1440" height="900" style="display:block;width:100%;height:100%;object-fit:cover;object-position:top" />`,
        }}
      />
    </span>
  );
}

/** 13 August 2026 — spelled out, because 08/13 and 13/08 read differently in India. */
const formatMeasured = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

function PreviewDialog({
  item,
  onClose,
}: {
  item: WorkItem;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();

    // Lock the page behind the dialog. Restoring the previous value rather than
    // clearing it matters: the menu overlay locks scroll the same way, and
    // hard-clearing would unlock the page underneath it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      // Keep focus inside the dialog. The iframe is one stop in this list, so a
      // keyboard visitor can tab into the framed site and back out again.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, iframe, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] grid place-items-center bg-text/80 p-[clamp(8px,2vw,32px)]"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduce ? undefined : { opacity: 0 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(e) => {
        // mousedown, not click: a drag that starts inside the framed site and
        // ends on the scrim would otherwise close the dialog mid-interaction.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${item.name} — live preview`}
        className="flex h-[min(88vh,1000px)] w-[min(100%,1400px)] flex-col border-2 border-text bg-bg shadow-lg"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: 12 }}
        transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {/* Browser chrome. Carries the real address so it is obvious the frame
            below is the live site and not a rendering of one. */}
        <div className="flex shrink-0 items-center gap-3 border-b-2 border-text bg-text px-3.5 py-2.5 text-bg">
          <span className="truncate font-heading text-[13px] font-bold leading-none tracking-[0.02em]">
            {item.domain}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-neutral-600 px-2.5 py-1.5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.08em] transition-colors hover:border-bg"
            >
              Open in new tab
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="inline-grid h-[30px] w-[30px] place-items-center border border-neutral-600 transition-colors hover:border-bg"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </span>
        </div>

        {/* `sandbox` keeps the framed site from navigating the window it sits in.
            allow-same-origin only lets it keep its *own* origin — it grants no
            access to digihook.in. */}
        <iframe
          src={item.url}
          title={`${item.name} — live site`}
          className="min-h-0 w-full flex-1 border-0 bg-bg"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          allow="fullscreen; autoplay; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </motion.div>
    </motion.div>
  );
}

export function WorkCard({ item, index }: { item: WorkItem; index: number }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const s = workSection;

  const close = useCallback(() => {
    setOpen(false);
    // Return focus to what opened the dialog, or the visitor lands at the top
    // of the document with no idea where they were.
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <Reveal index={index}>
        <article className="border border-neutral-300 bg-bg">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="group block w-full text-left"
          >
            <span className="flex items-center justify-between gap-3 border-b border-neutral-300 bg-neutral-200 px-3.5 py-2.5">
              <span className="truncate text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
                {item.domain}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.08em] text-accent-700">
                {s.previewHint}
                <Maximize2 size={13} aria-hidden="true" />
              </span>
            </span>
            <span className="relative block overflow-hidden">
              <LazyShot item={item} />
              {/* Hover affordance only — the button itself is the control, so
                  this carries no text a screen reader needs. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-text/0 transition-colors group-hover:bg-text/25"
              />
            </span>
          </button>

          <div className="grid gap-[clamp(20px,2.4vw,30px)] p-[clamp(20px,2.6vw,38px)]">
            <div>
              <div className="mb-3 flex items-baseline gap-2.5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em]">
                <span className="text-accent-700">{item.num}</span>
                <span className="text-neutral-700">{item.category}</span>
              </div>
              <h3 className="m-0 mb-2.5 font-heading text-[clamp(24px,2.6vw,38px)] font-bold leading-[1.08] tracking-[-0.03em]">
                {item.name}
              </h3>
              <p className="m-0 max-w-[68ch] text-[15.5px] leading-[1.6] text-neutral-800">
                {item.blurb}
              </p>
            </div>

            {/* Scores, then stack — the two halves wrap onto their own rows on a
                narrow viewport without a breakpoint deciding when. */}
            <div className="flex flex-wrap gap-[clamp(20px,3vw,44px)] border-t border-neutral-200 pt-[clamp(20px,2.4vw,28px)]">
              <div className="flex-[1_1_420px]">
                <div className="mb-3.5 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                  {s.scoresLabel}
                </div>
                {/* Larger than the default ring: these numbers are the section's
                    whole argument, so they are sized to be read, not skimmed. */}
                <ScoreRow
                  scores={item.scores}
                  size="clamp(48px, 5vw, 62px)"
                  className="max-w-[440px]"
                />
                <div className="mt-3 text-[11.5px] leading-[1.4] text-neutral-700">
                  {item.source} · {item.strategy} · {formatMeasured(item.measured)}
                </div>
              </div>

              <div className="flex-[1_1_320px]">
                <div className="mb-3.5 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-700">
                  {s.techLabel}
                </div>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {item.tech.map((t) => (
                    <li
                      key={t}
                      className="border border-neutral-300 px-2.5 py-1.5 text-[12.5px] font-semibold leading-none text-neutral-800"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-3.5 flex items-baseline gap-2">
                  <span className="shrink-0 font-heading text-[12.5px] font-bold leading-none tracking-[0.02em] text-accent-700">
                    {item.rendering}
                  </span>
                  <span className="text-[12.5px] leading-[1.45] text-neutral-700">
                    {item.renderingNote}
                  </span>
                </div>
              </div>
            </div>

            {/* Sits after the measurements, not before them. The numbers are
                the section's argument and a filmed opinion is corroboration of
                it — putting the video above the scores would invert that and
                lead with the softest evidence on the page. */}
            {item.review && (
              <ClientReview review={item.review} siteName={item.name} />
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-[clamp(20px,2.4vw,28px)]">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-2.5 border-2 border-text bg-text px-[18px] py-[14px] text-[14.5px] font-bold leading-[1.25] text-bg transition-transform hover:-translate-y-0.5"
              >
                {s.previewCta}
                <Maximize2 size={15} aria-hidden="true" />
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-neutral-300 px-[18px] py-[14px] text-[14.5px] font-bold leading-[1.25] text-accent-700 transition-colors hover:border-accent-700"
              >
                {s.visitLabel} {item.domain}
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </article>
      </Reveal>

      <AnimatePresence>
        {open && <PreviewDialog item={item} onClose={close} />}
      </AnimatePresence>
    </>
  );
}
