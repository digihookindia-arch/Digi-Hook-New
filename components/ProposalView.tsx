import { Check } from 'lucide-react';
import type { ProposalContent } from '@/lib/proposals';
import {
  MILESTONE_LABELS,
  milestoneSchedule,
  parseAmount,
  scheduleTotals,
  totalPercent,
  type Milestone,
} from '@/lib/delivery';
import { DEFAULT_GST_PERCENT, formatInr, gstOn } from '@/lib/money';

/**
 * The proposal as a formal document: numbered sections, a cost block, a
 * payment schedule and a technical annexure — modelled on the client's own
 * reference proposal (Galaxy Super Speciality, 2026-07-26) and rebuilt on
 * 2026-09-06 to the brief "premium printed document, bold blocks".
 *
 * The content is structured data from Claude, not markdown — so there is no
 * HTML to sanitise and every part lands in the right component.
 *
 * Section numbers are assigned at render time rather than stored, because
 * `annexure` and `support` are optional and older proposals have neither —
 * numbering the blocks that actually render keeps the sequence unbroken.
 *
 * Two visual rules hold the page together. Ordinary sections sit loose on the
 * ground, divided by a hairline and a lot of space, so the document reads like
 * a document. Anything the client has to *act* on — the cost, the schedule —
 * is a raised or inverted block, because those are the two places a person
 * stops scrolling. Do not panel everything; the contrast is the design.
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
    <section className="mt-[clamp(44px,6vw,76px)] break-inside-avoid border-t border-neutral-300 pt-[clamp(26px,3.5vw,44px)] first:mt-0 first:border-t-0 first:pt-0">
      {/* accent-700, not accent: at 13px this is normal-size text, where bare
          accent measures 3.76:1 and fails AA. */}
      <div className="mb-3 text-[13px] font-extrabold uppercase leading-none tracking-[0.16em] text-accent-700">
        {number}
      </div>
      <h2 className="m-0 max-w-[24ch] font-heading text-[clamp(24px,3vw,38px)] font-extrabold leading-[1.06] tracking-[-0.035em]">
        {title}
      </h2>
      {lead ? (
        <p className="m-0 mt-5 max-w-[66ch] text-[clamp(15.5px,1.6vw,17.5px)] leading-[1.7] text-neutral-800">
          {lead}
        </p>
      ) : null}
      {children ? <div className="mt-7">{children}</div> : null}
    </section>
  );
}

/** A raised white sheet. Client surfaces only — see the tokens in globals.css. */
function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-panel bg-panel shadow-panel ${className}`}
    >
      {children}
    </div>
  );
}

/** Column head for the document's tables. Sunk grey, not a black bar. */
function Head({
  columns,
  minWidth,
  lastRight,
}: {
  columns: string[];
  minWidth: string;
  lastRight?: boolean;
}) {
  return (
    <div
      className={`grid ${minWidth} border-b border-neutral-300 bg-surface text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-800`}
    >
      {columns.map((column, i) => (
        <div
          key={column}
          className={`px-5 py-3.5 ${
            lastRight && i === columns.length - 1 ? 'text-right' : ''
          }`}
        >
          {column}
        </div>
      ))}
    </div>
  );
}

export function ProposalView({
  content,
  milestones = [],
  gstPercent = DEFAULT_GST_PERCENT,
}: {
  content: ProposalContent;
  /**
   * The studio's payment milestones. Rendered here so the client sees the
   * schedule *before* accepting — the /payment stage that also shows them is
   * locked until after acceptance, and asking someone to agree to a payment
   * plan they cannot see is not a thing this studio does.
   */
  milestones?: Milestone[];
  /**
   * The rate this proposal bills at. Every figure Claude writes into
   * `content` is exclusive of GST, so tax is added here and only here.
   */
  gstPercent?: number;
}) {
  const next = counter();
  const claimsWholeTotal = totalPercent(milestones) === 100;

  // A total written as a range or as prose has no single value to tax, so the
  // cost block falls back to printing what the proposal says and stating that
  // GST is added on top — never a made-up rupee figure.
  const subtotal = parseAmount(content.total);
  const grand = subtotal === null ? null : gstOn(subtotal, gstPercent);
  const schedule = milestoneSchedule(content.total, milestones, gstPercent);
  const scheduleTotal = scheduleTotals(schedule);

  const scopeCols = 'min-w-[560px] grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]';
  const techCols =
    'min-w-[600px] grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)_minmax(0,1.5fr)]';
  const payCols =
    'min-w-[600px] grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,0.7fr)]';
  const annexCols =
    'min-w-[640px] grid-cols-[minmax(0,0.7fr)_minmax(0,1.15fr)_minmax(0,1.15fr)]';

  return (
    <article>
      <Section number={next()} title="Introduction" lead={content.summary} />

      {content.sections.map((s) => (
        <Section key={s.heading} number={next()} title={s.heading} lead={s.body}>
          {s.bullets?.length ? (
            <ul className="m-0 grid list-none gap-3 p-0">
              {s.bullets.map((b) => (
                <li
                  key={b}
                  className="grid grid-cols-[26px_minmax(0,1fr)] gap-2 text-[15.5px] leading-[1.6] text-neutral-800"
                >
                  <Check
                    size={16}
                    strokeWidth={3}
                    aria-hidden="true"
                    className="mt-[5px] text-accent"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ))}

      {content.technology ? (
        <Section number={next()} title="Technology" lead={content.technology.summary}>
          {content.technology.stack.length > 0 ? (
            <Panel>
              <div className="overflow-x-auto">
                <Head
                  columns={['Technology', 'Role', 'What it means for you']}
                  minWidth={techCols}
                />
                {content.technology.stack.map((t) => (
                  <div
                    key={t.name}
                    className={`grid ${techCols} border-b border-neutral-200 last:border-b-0`}
                  >
                    <div className="px-5 py-4 font-heading text-[14.5px] font-bold leading-[1.3] tracking-[-0.015em]">
                      {t.name}
                    </div>
                    <div className="px-5 py-4 text-[12.5px] font-semibold uppercase leading-[1.3] tracking-[0.08em] text-neutral-700">
                      {t.role}
                    </div>
                    <div className="px-5 py-4 text-[14px] leading-[1.6] text-neutral-800">
                      {t.why}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </Section>
      ) : null}

      {content.scope.length > 0 ? (
        <Section number={next()} title="What is included">
          <Panel>
            <div className="overflow-x-auto">
              <Head columns={['Item', 'Detail']} minWidth={scopeCols} />
              {content.scope.map((s) => (
                <div
                  key={s.item}
                  className={`grid ${scopeCols} border-b border-neutral-200 last:border-b-0`}
                >
                  <div className="px-5 py-4 font-heading text-[14.5px] font-bold leading-[1.3] tracking-[-0.015em]">
                    {s.item}
                  </div>
                  <div className="px-5 py-4 text-[14.5px] leading-[1.6] text-neutral-800">
                    {s.detail}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Section>
      ) : null}

      {content.timeline.length > 0 ? (
        <Section number={next()} title="How we will work">
          <ol className="m-0 grid list-none gap-3.5 p-0">
            {content.timeline.map((t, i) => (
              <li key={t.phase}>
                <Panel className="break-inside-avoid">
                  <div className="grid grid-cols-[54px_minmax(0,1fr)] gap-4 p-5">
                    {/* 20px bold is large text, so bare accent passes here. */}
                    <div className="font-heading text-[22px] font-extrabold leading-none text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
                        <h3 className="m-0 font-heading text-[18px] font-bold leading-[1.2] tracking-[-0.025em]">
                          {t.phase}
                        </h3>
                        <span className="inline-flex items-center rounded-full bg-surface px-3 py-1.5 text-[12px] font-semibold uppercase leading-none tracking-[0.08em] text-neutral-800">
                          {t.duration}
                        </span>
                      </div>
                      <p className="m-0 max-w-[62ch] text-[14.5px] leading-[1.65] text-neutral-800">
                        {t.deliverable}
                      </p>
                    </div>
                  </div>
                </Panel>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {content.pricing.length > 0 ? (
        <Section number={next()} title="Cost">
          {/* Inverted, because this is where a client stops scrolling. The one
              other block that earns this weight is the acceptance band, and
              between them they carry the whole document's hierarchy. */}
          <div className="overflow-hidden rounded-panel bg-text text-bg shadow-lift">
            <div className="px-[clamp(20px,3.5vw,36px)] pt-[clamp(24px,3.5vw,36px)]">
              {content.pricing.map((p) => (
                <div
                  key={p.item}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-neutral-700 py-4 first:pt-0"
                >
                  <div className="min-w-0 flex-[1_1_320px]">
                    <div className="font-heading text-[15.5px] font-bold leading-[1.35] tracking-[-0.015em]">
                      {p.item}
                    </div>
                    {p.note ? (
                      <div className="mt-1 text-[13.5px] leading-[1.5] text-neutral-400">
                        {p.note}
                      </div>
                    ) : null}
                  </div>
                  <div className="font-heading text-[17px] font-extrabold leading-none tracking-[-0.02em]">
                    {p.amount}
                  </div>
                </div>
              ))}

              {grand ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4">
                    <div className="text-[15px] leading-none text-neutral-400">
                      Subtotal
                    </div>
                    <div className="font-heading text-[16px] font-bold leading-none tracking-[-0.02em]">
                      {formatInr(grand.subtotal)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-5">
                    <div className="text-[15px] leading-none text-neutral-400">
                      GST at {grand.gstPercent}%
                    </div>
                    <div className="font-heading text-[16px] font-bold leading-none tracking-[-0.02em]">
                      {formatInr(grand.gst)}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t border-neutral-700 bg-neutral-900 px-[clamp(20px,3.5vw,36px)] py-[clamp(22px,3vw,32px)]">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-400">
                  {grand ? 'Total payable' : 'Project total'}
                </div>
                <div className="text-[13.5px] leading-[1.5] text-neutral-400">
                  {grand
                    ? 'Every line above is exclusive of GST. This is what you would be invoiced.'
                    : `Exclusive of GST, added on top at ${gstPercent}%. Ask us and we will confirm the payable figure in writing.`}
                </div>
              </div>
              <div className="font-heading text-[clamp(30px,4.5vw,52px)] font-extrabold leading-[0.95] tracking-[-0.04em]">
                {grand ? formatInr(grand.total) : content.total}
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      {milestones.length > 0 ? (
        <Section
          number={next()}
          title="Payment schedule"
          lead="Payments are staged against the work, not taken up front. Each one is invoiced when it falls due, and can be paid online from the Payment stage once this proposal is accepted."
        >
          <Panel>
            <div className="overflow-x-auto">
              <Head
                columns={['Payment', 'When it is due', 'Payable']}
                minWidth={payCols}
                lastRight
              />
              {schedule.map((row) => (
                <div
                  key={`${row.milestone.label}-${row.index}`}
                  className={`grid ${payCols} border-b border-neutral-200`}
                >
                  <div className="px-5 py-4 font-heading text-[14.5px] font-bold leading-[1.3] tracking-[-0.015em]">
                    {row.milestone.label}
                  </div>
                  <div className="px-5 py-4 text-[14px] leading-[1.6] text-neutral-800">
                    {row.milestone.note || MILESTONE_LABELS[row.milestone.status]}
                  </div>
                  <div className="px-5 py-4 text-right">
                    {row.payableText ? (
                      <div className="font-heading text-[15.5px] font-extrabold leading-none tracking-[-0.02em]">
                        {row.payableText}
                      </div>
                    ) : null}
                    {/* The payable figure leads, because that is the number
                        that leaves the client's account. Its two parts sit
                        under it so nobody has to reverse-engineer the tax. */}
                    {row.subtotalText && row.gstText ? (
                      <div className="mt-1.5 text-[12.5px] leading-[1.45] text-neutral-700">
                        {row.subtotalText} + {row.gstText} GST
                      </div>
                    ) : null}
                    {/* A rupee figure fixed against a range total has no
                        honest share to print — hide the 0% rather than show
                        one. */}
                    {row.milestone.percent > 0 ? (
                      <div className="mt-1 text-[12px] font-semibold uppercase leading-none tracking-[0.08em] text-neutral-700">
                        {row.milestone.percent}% of project
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {scheduleTotal ? (
                <div className={`grid ${payCols} bg-surface`}>
                  <div className="px-5 py-4 font-heading text-[15px] font-extrabold leading-none tracking-[-0.02em]">
                    Total
                  </div>
                  <div className="px-5 py-4 text-[13.5px] leading-[1.5] text-neutral-700">
                    Across {schedule.length}{' '}
                    {schedule.length === 1 ? 'payment' : 'payments'}
                  </div>
                  <div className="px-5 py-4 text-right">
                    <div className="font-heading text-[17px] font-extrabold leading-none tracking-[-0.025em] text-accent-700">
                      {formatInr(scheduleTotal.payable)}
                    </div>
                    <div className="mt-1.5 text-[12.5px] leading-[1.45] text-neutral-700">
                      {formatInr(scheduleTotal.subtotal)} +{' '}
                      {formatInr(scheduleTotal.gst)} GST
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </Panel>
          <p className="m-0 mt-4 max-w-[64ch] text-[13.5px] leading-[1.65] text-neutral-700">
            Each payment is shown as the quoted share plus GST at {gstPercent}%.{' '}
            {claimsWholeTotal
              ? 'Together they come to the total payable above.'
              : 'Ask us if the split does not look right.'}
          </p>
        </Section>
      ) : null}

      {content.annexure?.length ? (
        <Section
          number={next()}
          title="Technical annexure"
          lead="Everything below ships with the build and is explained in plain language — what each piece is, and why it matters to your business."
        >
          <div className="grid gap-8">
            {content.annexure.map((table) => (
              <div key={table.title} className="break-inside-avoid">
                <h3 className="m-0 mb-1.5 font-heading text-[18px] font-bold leading-[1.2] tracking-[-0.025em]">
                  {table.title}
                </h3>
                {table.note ? (
                  <p className="m-0 mb-4 max-w-[62ch] text-[13.5px] leading-[1.6] text-neutral-700">
                    {table.note}
                  </p>
                ) : null}
                <Panel className="mt-3">
                  <div className="overflow-x-auto">
                    <Head
                      columns={['Feature', 'What it is', 'Why it matters']}
                      minWidth={annexCols}
                    />
                    {table.rows.map((row) => (
                      <div
                        key={row.feature}
                        className={`grid ${annexCols} border-b border-neutral-200 last:border-b-0`}
                      >
                        <div className="px-5 py-4 font-heading text-[14px] font-bold leading-[1.3] tracking-[-0.015em]">
                          {row.feature}
                        </div>
                        <div className="px-5 py-4 text-[14px] leading-[1.6] text-neutral-800">
                          {row.what}
                        </div>
                        <div className="px-5 py-4 text-[14px] leading-[1.6] text-neutral-800">
                          {row.why}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {content.support ? (
        <Section number={next()} title="Support and maintenance" lead={content.support} />
      ) : null}

      {content.terms.length > 0 ? (
        <Section number={next()} title="Terms">
          <Panel>
            <ul className="m-0 grid list-none gap-0 p-0">
              {content.terms.map((t) => (
                <li
                  key={t}
                  className="grid grid-cols-[26px_minmax(0,1fr)] gap-2 border-b border-neutral-200 px-5 py-4 text-[14.5px] leading-[1.6] text-neutral-800 last:border-b-0"
                >
                  <Check
                    size={15}
                    strokeWidth={3}
                    aria-hidden="true"
                    className="mt-[4px] text-accent"
                  />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </Section>
      ) : null}
    </article>
  );
}
