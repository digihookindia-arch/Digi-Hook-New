'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import {
  services,
  detailQuestions,
  type Question,
  type ServiceKey,
} from '@/content/enquiry';
import {
  visibleQuestions,
  pruneAnswers,
  summarise,
  emptyEnquiryState,
  type Answers,
  type EnquiryState,
} from '@/lib/enquiry';
import { submitEnquiry } from './actions';

/**
 * The enquiry engine.
 *
 * Step one picks a service; everything after it is derived from the schema in
 * `@/content/enquiry` — which questions exist, and which of those are on screen
 * given what has been answered so far. The server action re-derives the same
 * thing from the same schema, so the branching is enforced, not just displayed.
 */
export function EnquiryForm() {
  const [state, formAction, pending] = useActionState<EnquiryState, FormData>(
    submitEnquiry,
    emptyEnquiryState
  );
  const [service, setService] = useState<ServiceKey | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const questionsRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const questions = useMemo(
    () => (service ? visibleQuestions(service, answers) : []),
    [service, answers]
  );

  // Only answers to questions still on screen count toward the summary.
  const summary = useMemo(
    () =>
      service
        ? summarise(service, {
            ...pruneAnswers(service, answers),
            ...pickDetails(answers),
          })
        : [],
    [service, answers]
  );

  const answered = questions.filter((q) => hasAnswer(answers[q.id])).length;
  // Excludes the service row, which is not a question.
  const answeredTotal = Math.max(summary.length - 1, 0);

  // Send focus into the newly revealed questions so keyboard and screen-reader
  // users are not left at the top of the page wondering what changed.
  useEffect(() => {
    if (service) questionsRef.current?.focus();
  }, [service]);

  // On a failed submit, take the visitor to the first thing that needs fixing.
  useEffect(() => {
    if (state.status !== 'error') return;
    const firstId = Object.keys(state.errors)[0];
    if (!firstId) return;
    const el =
      document.getElementById(firstId) ??
      document.querySelector<HTMLElement>(`[name="${firstId}"]`);
    el?.scrollIntoView({ block: 'center' });
    el?.focus?.();
  }, [state]);

  if (state.status === 'success') {
    return (
      <div role="status" className="border-2 border-text bg-bg p-[clamp(24px,3vw,40px)]">
        <div className="mb-3 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
          Brief received
        </div>
        <h2 className="m-0 mb-4 font-heading text-[clamp(22px,2.2vw,30px)] font-bold leading-[1.12] tracking-[-0.028em]">
          Thank you — we have your brief.
        </h2>
        <p className="m-0 text-[15.5px] leading-[1.6] text-neutral-800">
          We reply within one working day, usually with questions before the
          scope itself. If it is urgent, call +91 98736 74517.
        </p>
      </div>
    );
  }

  const set = (id: string, value: string | string[]) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const toggle = (id: string, value: string) =>
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      return {
        ...prev,
        [id]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });

  return (
    <form action={formAction} noValidate className="flex flex-wrap gap-[clamp(28px,4vw,56px)]">
      <input type="hidden" name="service" value={service ?? ''} />

      <div className="min-w-0 flex-[1_1_520px]">
        {/* Step 01 — the service picker */}
        <fieldset className="m-0 border-0 p-0">
          <Step
            num="01"
            legend="What do you need?"
            help="Pick one. The questions after this change to match."
          />
          {state.errors.service ? (
            <ErrorText id="service-error">{state.errors.service}</ErrorText>
          ) : null}
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]">
            {services.map((s) => {
              const on = service === s.key;
              return (
                <label
                  key={s.key}
                  className={`flex cursor-pointer flex-col gap-1.5 p-5 outline outline-1 outline-neutral-300 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                    on ? 'bg-text text-bg' : 'bg-bg text-text hover:bg-accent-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="service_choice"
                    value={s.key}
                    checked={on}
                    onChange={() => setService(s.key)}
                    className="sr-only"
                  />
                  <span className="font-heading text-[17px] font-bold leading-[1.2] tracking-[-0.02em]">
                    {s.label}
                  </span>
                  <span className={`text-[13.5px] leading-[1.45] ${on ? 'opacity-80' : 'text-neutral-700'}`}>
                    {s.blurb}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Announce what changed, for anyone not watching the screen. */}
        <p aria-live="polite" className="sr-only">
          {service
            ? `${questions.length} questions for ${
                services.find((s) => s.key === service)?.label
              }.`
            : ''}
        </p>

        {service ? (
          <motion.div
            key={service}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {/* Step 02 — the dynamic questions */}
            <div
              ref={questionsRef}
              tabIndex={-1}
              className="mt-[clamp(36px,5vh,56px)] outline-none"
            >
              <Step
                num="02"
                legend="About the project"
                help={`${questions.length} question${questions.length === 1 ? '' : 's'}, based on what you picked.`}
                progress={questions.length ? answered / questions.length : 0}
              />
              {/* No border here — the Step's progress bar above already draws
                  this step's 2px rule. */}
              <div className="mt-2">
                {questions.map((q, i) => (
                  <div key={q.id}>
                    {/* Sub-heading whenever the group changes, so a long path
                        stays scannable rather than reading as one wall. */}
                    {q.group && q.group !== questions[i - 1]?.group ? (
                      <h3 className="m-0 mt-7 border-b border-neutral-300 pb-2.5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700 first:mt-0">
                        {q.group}
                      </h3>
                    ) : null}
                    <QuestionField
                      question={q}
                      value={answers[q.id]}
                      error={state.errors[q.id]}
                      onSet={set}
                      onToggle={toggle}
                      reduce={!!reduce}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Step 03 — who we reply to */}
            <div className="mt-[clamp(36px,5vh,56px)]">
              <Step num="03" legend="Where do we send it?" />
              <div className="mt-2 border-t-2 border-text">
                {detailQuestions.map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    error={state.errors[q.id]}
                    onSet={set}
                    onToggle={toggle}
                    reduce={!!reduce}
                  />
                ))}
              </div>
            </div>

            {/* Honeypot — hidden from people, catches bots. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="company_website">Company website (leave blank)</label>
              <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {state.errors.form ? (
              <p role="alert" className="m-0 mt-6 border-l-2 border-accent py-1 pl-4 text-[14.5px] leading-[1.55] text-accent-700">
                {state.errors.form}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-8 inline-flex items-center gap-3 border-2 border-accent-600 bg-accent-600 px-6 py-[18px] text-[15px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
            >
              {pending ? 'Sending the brief…' : 'Send the brief'}
              <ArrowUpRight size={17} aria-hidden="true" />
            </button>
            <p className="m-0 mt-3.5 text-[12.5px] leading-[1.5] text-neutral-700">
              We reply within one working day.
            </p>
          </motion.div>
        ) : null}
      </div>

      {/* Live brief — the checklist of what has been said so far. */}
      <aside className="min-w-0 flex-[1_1_280px]">
        <div className="sticky top-[100px] flex max-h-[calc(100vh-140px)] flex-col border-2 border-text bg-bg">
          <div className="flex items-baseline justify-between gap-3 bg-text px-[18px] py-3.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-bg">
            <span>Your brief so far</span>
            {answeredTotal > 0 ? (
              <span className="text-accent-400">{answeredTotal} answered</span>
            ) : null}
          </div>
          {summary.length === 0 ? (
            <p className="m-0 px-[18px] py-5 text-[14px] leading-[1.6] text-neutral-700">
              Nothing yet. Pick what you need and this fills in as you go.
            </p>
          ) : (
            // Long paths produce long briefs — scroll inside the panel rather
            // than letting it run past the viewport.
            <dl className="m-0 overflow-y-auto">
              {summary.map((row) => (
                <div key={row.label} className="border-b border-neutral-300 px-[18px] py-3.5">
                  <dt className="text-[11px] font-semibold uppercase leading-[1.3] tracking-[0.1em] text-neutral-700">
                    {row.label}
                  </dt>
                  <dd className="m-0 mt-1 text-[14.5px] leading-[1.45]">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </aside>
    </form>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

function pickDetails(answers: Answers): Answers {
  const out: Answers = {};
  for (const q of detailQuestions) {
    const v = answers[q.id];
    if (v !== undefined) out[q.id] = v;
  }
  return out;
}

function hasAnswer(v: Answers[string] | undefined): boolean {
  if (v === undefined) return false;
  return Array.isArray(v) ? v.length > 0 : v.trim() !== '';
}

function Step({
  num,
  legend,
  help,
  progress,
}: {
  num: string;
  legend: string;
  help?: string;
  progress?: number;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3.5">
        <span className="font-heading text-[13px] font-extrabold leading-none text-accent-700">
          {num}
        </span>
        <h2 className="m-0 font-heading text-[clamp(20px,2vw,27px)] font-bold leading-[1.15] tracking-[-0.025em]">
          {legend}
        </h2>
      </div>
      {help ? (
        <p className="m-0 mt-2 text-[14px] leading-[1.5] text-neutral-700">{help}</p>
      ) : null}
      {/* The progress bar *is* the section rule, not a second line above it.
          Same 2px weight and same text colour as the plain `border-t-2` that
          divides the other steps, so a step with progress and a step without
          look identical apart from the accent filling in. Drawing a 3px grey
          track 8px above a 2px black border read as one rule misaligned. */}
      {progress !== undefined ? (
        <div className="mt-3.5 h-[2px] w-full bg-text">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="m-0 mt-2 text-[13px] font-medium leading-[1.45] text-accent-700">
      {children}
    </p>
  );
}

function QuestionField({
  question: q,
  value,
  error,
  onSet,
  onToggle,
  reduce,
}: {
  question: Question;
  value: Answers[string] | undefined;
  error?: string;
  onSet: (id: string, value: string) => void;
  onToggle: (id: string, value: string) => void;
  reduce: boolean;
}) {
  const errorId = `${q.id}-error`;
  const helpId = `${q.id}-help`;
  const describedBy =
    [q.help ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined;

  const grouped = q.type === 'multi' || q.type === 'single';
  const Wrapper = grouped ? 'fieldset' : 'div';
  const Label = grouped ? 'legend' : 'label';

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
      className="border-b border-neutral-300 py-6"
    >
      <Wrapper className="m-0 border-0 p-0">
        <Label
          className="m-0 block p-0 font-heading text-[17px] font-bold leading-[1.3] tracking-[-0.018em]"
          {...(grouped ? {} : { htmlFor: q.id })}
        >
          {q.label}
          {q.required ? null : (
            <span className="ml-2 text-[12px] font-medium tracking-normal text-neutral-700">
              optional
            </span>
          )}
        </Label>

        {q.help ? (
          <p id={helpId} className="m-0 mt-1.5 max-w-[60ch] text-[13.5px] leading-[1.5] text-neutral-700">
            {q.help}
          </p>
        ) : null}

        <div className="mt-3.5">
          {q.type === 'select' ? (
            <div className="relative max-w-[440px]">
              <select
                id={q.id}
                name={q.id}
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onSet(q.id, e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={`w-full appearance-none border-2 bg-bg py-3.5 pl-4 pr-12 text-[15px] leading-none text-text ${
                  error ? 'border-accent-700' : 'border-neutral-400'
                }`}
              >
                <option value="">Choose one…</option>
                {q.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text"
              />
            </div>
          ) : null}

          {q.type === 'single' ? (
            <div className="flex flex-wrap gap-2" aria-describedby={describedBy}>
              {q.options?.map((o) => {
                const on = value === o.value;
                return (
                  <label
                    key={o.value}
                    className={`cursor-pointer border-2 px-3.5 py-[11px] text-[13.5px] font-medium leading-none transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                      on
                        ? 'border-text bg-text text-bg'
                        : 'border-neutral-400 text-text hover:border-text'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={o.value}
                      checked={on}
                      onChange={() => onSet(q.id, o.value)}
                      className="sr-only"
                    />
                    {o.label}
                  </label>
                );
              })}
            </div>
          ) : null}

          {q.type === 'multi' ? (
            <div
              aria-describedby={describedBy}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-x-7"
            >
              {q.options?.map((o) => {
                const on = Array.isArray(value) && value.includes(o.value);
                return (
                  <label
                    key={o.value}
                    className="grid cursor-pointer grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5 border-t border-neutral-200 py-3 text-[14.5px] leading-[1.45] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                  >
                    <input
                      type="checkbox"
                      name={q.id}
                      value={o.value}
                      checked={on}
                      onChange={() => onToggle(q.id, o.value)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`mt-[2px] grid h-[18px] w-[18px] place-items-center border-2 ${
                        on ? 'border-accent-600 bg-accent-600 text-white' : 'border-neutral-400'
                      }`}
                    >
                      {on ? <Check size={12} strokeWidth={3.5} /> : null}
                    </span>
                    <span>{o.label}</span>
                  </label>
                );
              })}
            </div>
          ) : null}

          {q.type === 'text' ? (
            <input
              id={q.id}
              name={q.id}
              type="text"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onSet(q.id, e.target.value)}
              placeholder={q.placeholder}
              autoComplete={
                q.id === 'name' ? 'name' : q.id === 'contact' ? 'tel' : 'off'
              }
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              className={`w-full max-w-[440px] border-2 bg-bg p-3.5 text-[15px] leading-none text-text ${
                error ? 'border-accent-700' : 'border-neutral-400'
              }`}
            />
          ) : null}

          {q.type === 'textarea' ? (
            <textarea
              id={q.id}
              name={q.id}
              rows={4}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onSet(q.id, e.target.value)}
              placeholder={q.placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              className={`w-full resize-y border-2 bg-bg p-3.5 text-[15px] leading-[1.5] text-text ${
                error ? 'border-accent-700' : 'border-neutral-400'
              }`}
            />
          ) : null}
        </div>

        {error ? <ErrorText id={errorId}>{error}</ErrorText> : null}
      </Wrapper>
    </motion.div>
  );
}
