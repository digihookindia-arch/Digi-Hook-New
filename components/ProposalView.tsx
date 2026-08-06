import { Check } from 'lucide-react';
import type { ProposalContent } from '@/lib/proposals';
import {
  MILESTONE_LABELS,
  milestoneAmounts,
  totalPercent,
  type Milestone,
} from '@/lib/delivery';

/**
 * Renders a proposal as a formal document: numbered top-level sections, a
 * payment schedule, and a technical annexure — modelled on the client's own
 * reference proposal (Galaxy Super Speciality, 2026-07-26).
 *
 * The content is structured data from Claude, not markdown — so there is no
 * HTML to sanitise and every part lands in the right component.
 *
 * Section numbers are assigned at render time rather than stored, because
 * `annexure` and `support` are optional and older proposals have neither —
 * numbering the blocks that actually render keeps the sequence unbroken.
 */

/** Hands out 01, 02, 03… in render order. */
function counter() {
  let n = 0;
  return () => String(++n).padStart(2, '0');
}

function Section({
  number,
  title,
  children,
  lead,
}: {
  number: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mb-10 break-inside-avoid border-t-2 border-text pt-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {/* accent-700, not accent: at 15px this is normal-size text, where
            bare accent measures 3.76:1 and fails AA. */}
        <span className="font-heading text-[15px] font-extrabold leading-none tracking-[-0.01em] text-accent-700">
          {number}
        </span>
        <h2 className="m-0 font-heading text-[clamp(20px,2.2vw,28px)] font-bold leading-[1.15] tracking-[-0.028em]">
          {title}
        </h2>
      </div>
      {lead ? (
        <p className="m-0 mb-5 max-w-[68ch] text-[15.5px] leading-[1.65] text-neutral-800">
          {lead}
        </p>
      ) : null}
      {children}
    </section>
  );
}

export function ProposalView({
  content,
  milestones = [],
}: {
  content: ProposalContent;
  /**
   * The studio's payment milestones. Rendered here so the client sees the
   * schedule *before* accepting — the /status tab that also shows them is
   * locked until after acceptance, and asking someone to agree to a payment
   * plan they cannot see is not a thing this studio does.
   */
  milestones?: Milestone[];
}) {
  const next = counter();
  const amounts = milestoneAmounts(content.total, milestones);
  const claimsWholeTotal = totalPercent(milestones) === 100;

  return (
    <article>
      <Section number={next()} title="Introduction" lead={content.summary} />

      {content.sections.map((s) => (
        <Section key={s.heading} number={next()} title={s.heading} lead={s.body}>
          {s.bullets?.length ? (
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {s.bullets.map((b) => (
                <li
                  key={b}
                  className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 border-t border-neutral-200 pt-2.5 text-[14.5px] leading-[1.5] text-neutral-800"
                >
                  <Check
                    size={15}
                    strokeWidth={3}
                    aria-hidden="true"
                    className="mt-[3px] text-accent"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ))}

      {content.technology ? (
        <Section
          number={next()}
          title="Technology"
          lead={content.technology.summary}
        >
          {content.technology.stack.length > 0 ? (
            <div className="overflow-x-auto border-t-2 border-text">
              <div className="grid min-w-[600px] grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)_minmax(0,1.5fr)] bg-text text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-bg">
                <div className="px-4 py-3">Technology</div>
                <div className="border-l border-neutral-700 px-4 py-3">Role</div>
                <div className="border-l border-neutral-700 px-4 py-3">
                  What it means for you
                </div>
              </div>
              {content.technology.stack.map((t) => (
                <div
                  key={t.name}
                  className="grid min-w-[600px] grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)_minmax(0,1.5fr)] border-b border-neutral-300"
                >
                  <div className="px-4 py-4 font-heading text-[14.5px] font-bold leading-[1.3] tracking-[-0.015em]">
                    {t.name}
                  </div>
                  <div className="border-l border-neutral-300 px-4 py-4 text-[12.5px] font-semibold uppercase leading-[1.3] tracking-[0.08em] text-neutral-700">
                    {t.role}
                  </div>
                  <div className="border-l border-neutral-300 px-4 py-4 text-[14px] leading-[1.55] text-neutral-800">
                    {t.why}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}

      {content.scope.length > 0 ? (
        <Section number={next()} title="What is included">
          <div className="overflow-x-auto border-t-2 border-text">
            <div className="grid min-w-[560px] grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] bg-text text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-bg">
              <div className="px-4 py-3">Item</div>
              <div className="border-l border-neutral-700 px-4 py-3">Detail</div>
            </div>
            {content.scope.map((s) => (
              <div
                key={s.item}
                className="grid min-w-[560px] grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] border-b border-neutral-300"
              >
                <div className="px-4 py-4 font-heading text-[14.5px] font-bold leading-[1.3] tracking-[-0.015em]">
                  {s.item}
                </div>
                <div className="border-l border-neutral-300 px-4 py-4 text-[14.5px] leading-[1.55] text-neutral-800">
                  {s.detail}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {content.timeline.length > 0 ? (
        <Section number={next()} title="How we will work">
          <div className="border-t-2 border-text">
            {content.timeline.map((t, i) => (
              <div
                key={t.phase}
                className="grid break-inside-avoid grid-cols-[52px_minmax(0,1fr)] gap-4 border-b border-neutral-300 py-5"
              >
                <div className="font-heading text-[20px] font-extrabold leading-none text-accent">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
                    <h3 className="m-0 font-heading text-[17px] font-bold leading-[1.2] tracking-[-0.02em]">
                      {t.phase}
                    </h3>
                    <span className="text-[13px] font-semibold uppercase leading-none tracking-[0.08em] text-accent-700">
                      {t.duration}
                    </span>
                  </div>
                  <p className="m-0 max-w-[60ch] text-[14.5px] leading-[1.6] text-neutral-800">
                    {t.deliverable}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {content.pricing.length > 0 ? (
        <Section number={next()} title="Cost">
          <div className="border-t-2 border-text">
            {content.pricing.map((p) => (
              <div
                key={p.item}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-neutral-300 py-4"
              >
                <div className="min-w-0 flex-[1_1_320px]">
                  <div className="font-heading text-[15.5px] font-bold leading-[1.3] tracking-[-0.015em]">
                    {p.item}
                  </div>
                  {p.note ? (
                    <div className="mt-1 text-[13.5px] leading-[1.5] text-neutral-700">
                      {p.note}
                    </div>
                  ) : null}
                </div>
                <div className="font-heading text-[17px] font-extrabold leading-none tracking-[-0.02em]">
                  {p.amount}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-text py-5">
              <div className="font-heading text-[17px] font-extrabold leading-none tracking-[-0.02em]">
                Total
              </div>
              <div className="font-heading text-[clamp(22px,2.4vw,30px)] font-extrabold leading-none tracking-[-0.03em] text-accent-700">
                {content.total}
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      {milestones.length > 0 ? (
        <Section
          number={next()}
          title="Payment schedule"
          lead="Payments are staged against the work, not taken up front. Each one is invoiced when it falls due."
        >
          <div className="overflow-x-auto border-t-2 border-text">
            <div className="grid min-w-[560px] grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)_minmax(0,0.5fr)] bg-text text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-bg">
              <div className="px-4 py-3">Payment</div>
              <div className="border-l border-neutral-700 px-4 py-3">When it is due</div>
              <div className="border-l border-neutral-700 px-4 py-3 text-right">Amount</div>
            </div>
            {milestones.map((m, i) => (
              <div
                key={`${m.label}-${i}`}
                className="grid min-w-[560px] grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)_minmax(0,0.5fr)] border-b border-neutral-300"
              >
                <div className="px-4 py-4 font-heading text-[14.5px] font-bold leading-[1.3] tracking-[-0.015em]">
                  {m.label}
                </div>
                <div className="border-l border-neutral-300 px-4 py-4 text-[14px] leading-[1.55] text-neutral-800">
                  {m.note || MILESTONE_LABELS[m.status]}
                </div>
                <div className="border-l border-neutral-300 px-4 py-4 text-right">
                  {amounts[i] ? (
                    <div className="font-heading text-[15px] font-extrabold leading-none tracking-[-0.02em]">
                      {amounts[i]}
                    </div>
                  ) : null}
                  <div className="mt-1 text-[12.5px] font-semibold uppercase leading-none tracking-[0.08em] text-neutral-700">
                    {m.percent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="m-0 mt-4 max-w-[62ch] text-[13.5px] leading-[1.6] text-neutral-700">
            {claimsWholeTotal
              ? 'Amounts are shares of the project total and exclude GST.'
              : 'Amounts are shares of the project total and exclude GST. Ask us if the split does not look right.'}
          </p>
        </Section>
      ) : null}

      {content.annexure?.length ? (
        <Section
          number={next()}
          title="Technical annexure"
          lead="Everything below ships with the build and is explained in plain language — what each piece is, and why it matters to your business."
        >
          {content.annexure.map((table) => (
            <div key={table.title} className="mb-8 break-inside-avoid">
              <h3 className="m-0 mb-1.5 font-heading text-[17px] font-bold leading-[1.2] tracking-[-0.02em]">
                {table.title}
              </h3>
              {table.note ? (
                <p className="m-0 mb-3 text-[13.5px] leading-[1.5] text-neutral-700">
                  {table.note}
                </p>
              ) : null}
              <div className="mt-3 overflow-x-auto border-t-2 border-text">
                <div className="grid min-w-[640px] grid-cols-[minmax(0,0.7fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] bg-text text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-bg">
                  <div className="px-4 py-3">Feature</div>
                  <div className="border-l border-neutral-700 px-4 py-3">What it is</div>
                  <div className="border-l border-neutral-700 px-4 py-3">Why it matters</div>
                </div>
                {table.rows.map((row) => (
                  <div
                    key={row.feature}
                    className="grid min-w-[640px] grid-cols-[minmax(0,0.7fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] border-b border-neutral-300"
                  >
                    <div className="px-4 py-4 font-heading text-[14px] font-bold leading-[1.3] tracking-[-0.015em]">
                      {row.feature}
                    </div>
                    <div className="border-l border-neutral-300 px-4 py-4 text-[14px] leading-[1.55] text-neutral-800">
                      {row.what}
                    </div>
                    <div className="border-l border-neutral-300 px-4 py-4 text-[14px] leading-[1.55] text-neutral-800">
                      {row.why}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>
      ) : null}

      {content.support ? (
        <Section number={next()} title="Support and maintenance" lead={content.support} />
      ) : null}

      {content.terms.length > 0 ? (
        <Section number={next()} title="Terms">
          <ul className="m-0 grid list-none gap-2.5 border-t-2 border-text p-0 pt-4">
            {content.terms.map((t) => (
              <li
                key={t}
                className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 border-b border-neutral-200 pb-2.5 text-[14.5px] leading-[1.55] text-neutral-800"
              >
                <Check
                  size={15}
                  strokeWidth={3}
                  aria-hidden="true"
                  className="mt-[3px] text-accent"
                />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </article>
  );
}
