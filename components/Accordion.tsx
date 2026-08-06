'use client';

import { useId, useState, type ReactNode } from 'react';

/**
 * Single-open accordion. Closes the prototype's a11y gaps: real <button>
 * triggers carrying `aria-expanded` / `aria-controls`, panels labelled by their
 * trigger, and height measured from content rather than a hard-coded 760px cap,
 * so long panels never clip (README interactions table).
 */

type PanelProps = {
  open: boolean;
  panelId: string;
  triggerId: string;
  children: ReactNode;
};

function Panel({ open, panelId, triggerId, children }: PanelProps) {
  // `grid-template-rows: 0fr → 1fr` animates to the content's true height with
  // no measurement, so long panels can never clip the way the prototype's fixed
  // 760px cap could. The panel stays in the DOM either way, which matters: the
  // FAQ answers are also emitted as FAQPage schema and must be crawlable.
  return (
    <div
      id={panelId}
      role="region"
      aria-labelledby={triggerId}
      className="grid transition-[grid-template-rows,opacity] duration-[380ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]"
      style={{
        gridTemplateRows: open ? '1fr' : '0fr',
        opacity: open ? 1 : 0,
      }}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

export type AccordionItem = {
  id: string;
  /** Left-hand index, e.g. "01". Present on the topic/type accordions. */
  num?: string;
  /** Heading text. */
  label: string;
  /** Small uppercase category, right of the label. */
  tag?: string;
  panel: ReactNode;
};

/**
 * @param variant `faq` renders question + sign; `topic` renders the wide
 * num / name / tag / sign grid used on Technology and SEO types.
 */
export function Accordion({
  items,
  variant = 'faq',
  headingLevel: Heading = 'h3',
}: {
  items: AccordionItem[];
  variant?: 'faq' | 'topic';
  /**
   * Level of the trigger headings. Defaults to `h3`, which is right when the
   * accordion sits under a section `h2` (FAQs, SEO types). Pass `h2` where the
   * accordion *is* the page's top-level structure, as on Technology — otherwise
   * the document jumps straight from `h1` to `h3`.
   */
  headingLevel?: 'h2' | 'h3';
}) {
  const [open, setOpen] = useState<string | null>(null);
  const base = useId();

  return (
    <div className="border-t-2 border-text">
      {items.map((it) => {
        const isOpen = open === it.id;
        const triggerId = `${base}-${it.id}-t`;
        const panelId = `${base}-${it.id}-p`;

        return (
          <div key={it.id} className="border-b border-neutral-300">
            <Heading className="m-0">
              <button
                type="button"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : it.id)}
                className={
                  variant === 'topic'
                    ? 'grid w-full grid-cols-[58px_minmax(0,1fr)_auto_34px] items-center gap-4 border-0 bg-transparent py-[clamp(18px,2.2vw,28px)] text-left text-text transition-colors hover:bg-neutral-100'
                    : 'flex w-full items-center justify-between gap-5 border-0 bg-transparent py-[22px] text-left font-heading text-[clamp(16px,1.5vw,21px)] font-bold leading-[1.3] tracking-[-0.02em] text-text transition-colors hover:text-accent-700'
                }
              >
                {variant === 'topic' ? (
                  <>
                    <span className="text-[12px] font-semibold leading-[1.2] tracking-[0.12em] text-accent-700">
                      {it.num}
                    </span>
                    <span className="font-heading text-[clamp(20px,2.4vw,34px)] font-extrabold leading-[1.06] tracking-[-0.032em]">
                      {it.label}
                    </span>
                    <span className="text-[12px] font-medium uppercase leading-[1.2] tracking-[0.1em] text-neutral-700">
                      {it.tag}
                    </span>
                    <span
                      aria-hidden="true"
                      className="justify-self-end font-heading text-[22px] font-bold leading-none text-accent"
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </>
                ) : (
                  <>
                    <span>{it.label}</span>
                    <span
                      aria-hidden="true"
                      className="flex-none font-heading text-[20px] font-bold leading-none text-accent"
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </>
                )}
              </button>
            </Heading>
            <Panel open={isOpen} panelId={panelId} triggerId={triggerId}>
              {it.panel}
            </Panel>
          </div>
        );
      })}
    </div>
  );
}
