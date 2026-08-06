'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  AppWindow,
  ArrowLeft,
  Briefcase,
  Check,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  BUDGET_RULES,
  CONTACT_TIME_QUESTION,
  formatInr,
  getQuestions,
  getTotalSteps,
  QUOTE_WHATSAPP_LINK,
  TECH_STACK,
  type OptionIcon,
  type QuoteQuestion,
} from '@/content/quote';
import { trackPixelCustom, trackPixelEvent } from '@/lib/pixel';
import type { QuoteAnswers, QuoteSource } from '@/lib/quote';
import { submitQuoteLead } from './actions';

const EMPTY_ANSWERS: QuoteAnswers = {
  websiteType: '',
  budgetAgreed: '',
  budget: '',
  name: '',
  business: '',
  contactTime: '',
  phone: '',
};

const STORAGE_KEY = 'dh-get-quote-v5';
const TRANSITION_MS = 300;

const ICONS: Record<OptionIcon, LucideIcon> = {
  briefcase: Briefcase,
  image: ImageIcon,
  'shopping-cart': ShoppingCart,
  refresh: RefreshCw,
  megaphone: Megaphone,
  'app-window': AppWindow,
  'help-circle': HelpCircle,
};

type Direction = 'forward' | 'backward';
type Anim = { from: number; direction: Direction; phase: 'start' | 'active' };

/**
 * Card-to-card slide: the outgoing step is kept mounted for TRANSITION_MS in
 * the same grid cell while the incoming one animates over it. Both honour
 * prefers-reduced-motion via the global duration collapse in globals.css.
 */
function useStepTransition(step: number) {
  const [displayStep, setDisplayStep] = useState(step);
  const [anim, setAnim] = useState<Anim | null>(null);
  const prevStepRef = useRef(step);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevStepRef.current;
    if (step === prev) return;
    const direction: Direction = step > prev ? 'forward' : 'backward';
    prevStepRef.current = step;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setAnim({ from: prev, direction, phase: 'start' });
    setDisplayStep(step);

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnim((a) => (a ? { ...a, phase: 'active' } : a));
      });
    });

    timeoutRef.current = setTimeout(() => setAnim(null), TRANSITION_MS + 20);

    return () => cancelAnimationFrame(raf);
  }, [step]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return { displayStep, anim };
}

function cardStyle(anim: Anim | null, role: 'outgoing' | 'incoming'): CSSProperties {
  const base: CSSProperties = { gridArea: '1 / 1' };
  if (!anim) return { ...base, transform: 'translateX(0)', opacity: 1 };

  if (role === 'outgoing') {
    if (anim.phase === 'start') {
      return { ...base, transform: 'translateX(0)', opacity: 1, pointerEvents: 'none' };
    }
    return {
      ...base,
      transform: `translateX(${anim.direction === 'forward' ? '-20px' : '20px'})`,
      opacity: 0,
      pointerEvents: 'none',
    };
  }

  if (anim.phase === 'start') {
    return {
      ...base,
      transform: `translateX(${anim.direction === 'forward' ? '20px' : '-20px'})`,
      opacity: 0,
    };
  }
  return { ...base, transform: 'translateX(0)', opacity: 1 };
}

function readSource(): QuoteSource {
  if (typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
      fbclid: params.get('fbclid') || undefined,
      gclid: params.get('gclid') || undefined,
      landingUrl: window.location.href,
      referrer: document.referrer || undefined,
    };
  } catch {
    return {};
  }
}

/* ── pieces ─────────────────────────────────────────────────────────── */

function CardShell({ children }: { children: React.ReactNode }) {
  return <div className="border-2 border-text bg-neutral-100 p-[clamp(24px,5vw,32px)]">{children}</div>;
}

function CardHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h2
        className={`text-[clamp(21px,5.5vw,27px)] font-extrabold leading-tight tracking-[-0.02em] ${
          subtitle ? 'mb-2' : 'mb-6'
        }`}
      >
        {title}
      </h2>
      {subtitle ? <p className="mb-6 text-[14px] text-neutral-700">{subtitle}</p> : null}
    </>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-6 flex w-full items-center justify-center gap-2 border-2 border-accent-600 bg-accent-600 py-4 text-[16px] font-semibold text-white transition-colors hover:enabled:bg-accent-700 disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-400"
    >
      {children}
    </button>
  );
}

function SingleChoiceCard({
  question,
  selectedId,
  onSelect,
}: {
  question: QuoteQuestion;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <CardShell>
      <CardHeading title={question.title} subtitle={question.subtitle} />
      <div className="grid gap-3">
        {question.options.map((opt) => {
          const Icon = opt.icon ? ICONS[opt.icon] : null;
          const selected = selectedId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              aria-pressed={selected}
              className={`flex min-h-[64px] items-center gap-4 border-2 p-4 text-left transition-colors ${
                selected
                  ? 'border-accent-600 bg-accent-100'
                  : 'border-neutral-300 bg-bg hover:bg-accent-100'
              }`}
            >
              {Icon ? (
                <span className="flex h-11 w-11 flex-none items-center justify-center border-2 border-text bg-neutral-100">
                  <Icon size={20} strokeWidth={2} className="text-accent-700" aria-hidden="true" />
                </span>
              ) : null}
              <span className="min-w-0">
                <span
                  className={`block font-bold leading-snug ${
                    Icon ? 'whitespace-nowrap text-[clamp(15px,4.3vw,17px)]' : 'text-[17px]'
                  }`}
                >
                  {opt.title}
                </span>
                {opt.description ? (
                  <span className="block text-[13.5px] text-neutral-700">{opt.description}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </CardShell>
  );
}

function MultiChoiceCard({
  question,
  selectedIds,
  onToggle,
  onNext,
}: {
  question: QuoteQuestion;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <CardShell>
      <CardHeading title={question.title} subtitle={question.subtitle} />
      <div className="grid gap-3">
        {question.options.map((opt) => {
          const selected = selectedIds.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              aria-pressed={selected}
              className={`flex min-h-[64px] items-center gap-4 border-2 p-4 text-left transition-colors ${
                selected
                  ? 'border-accent-600 bg-accent-100'
                  : 'border-neutral-300 bg-bg hover:bg-accent-100'
              }`}
            >
              <span
                className={`flex h-6 w-6 flex-none items-center justify-center border-2 ${
                  selected ? 'border-accent-600 bg-accent-600' : 'border-text bg-bg'
                }`}
                aria-hidden="true"
              >
                {selected ? <Check size={16} strokeWidth={3} className="text-white" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[17px] font-bold leading-snug">{opt.title}</span>
                {opt.description ? (
                  <span className="block text-[13.5px] text-neutral-700">{opt.description}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <PrimaryButton disabled={selectedIds.length === 0} onClick={onNext}>
        Next
      </PrimaryButton>
    </CardShell>
  );
}

function TextCard({
  question,
  value,
  onChange,
  onNext,
}: {
  question: QuoteQuestion;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <CardShell>
      <CardHeading title={question.title} subtitle={question.subtitle} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        rows={5}
        maxLength={2000}
        className="w-full resize-y border-2 border-neutral-400 bg-bg px-4 py-3.5 text-[16px] outline-none focus:border-accent-600"
      />
      <PrimaryButton disabled={value.trim().length === 0} onClick={onNext}>
        Next
      </PrimaryButton>
    </CardShell>
  );
}

function BudgetPitchCard({
  websiteType,
  onAgree,
  onDecline,
}: {
  websiteType: string;
  onAgree: () => void;
  onDecline: () => void;
}) {
  const rule = BUDGET_RULES[websiteType];
  if (!rule) return null;
  return (
    <CardShell>
      <CardHeading
        title="How we build, and what it costs."
        subtitle="Custom coded. No page builders, no templates."
      />
      <div className="mb-6 border-2 border-text bg-bg">
        <div className="border-b-2 border-text px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent-700">
          Tech we&apos;ll use for your website
        </div>
        {TECH_STACK.map((row, i) => (
          <div
            key={row.area}
            className={`flex items-baseline justify-between gap-4 px-4 py-3 ${
              i < TECH_STACK.length - 1 ? 'border-b border-neutral-300' : ''
            }`}
          >
            <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-neutral-700">
              {row.area}
            </span>
            <span className="text-right text-[15px] font-bold">{row.tech}</span>
          </div>
        ))}
      </div>
      <p className="mb-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-700">
        Typical range for {rule.label.toLowerCase()}
      </p>
      <p className="mb-2 text-[clamp(22px,6vw,30px)] font-extrabold leading-tight tracking-[-0.02em] text-accent-700">
        {formatInr(rule.min)} – {formatInr(rule.max)}
      </p>
      <p className="text-[14px] text-neutral-700">
        The exact number depends on your requirement. Does that work for you?
      </p>
      <PrimaryButton onClick={onAgree}>Yes, that&apos;s okay for me</PrimaryButton>
      <button
        type="button"
        onClick={onDecline}
        className="mt-3 w-full border-2 border-text py-4 text-[15px] font-semibold text-text transition-colors hover:bg-text hover:text-bg"
      >
        That&apos;s above my budget
      </button>
    </CardShell>
  );
}

function BudgetEntryCard({
  websiteType,
  value,
  onChange,
  onNext,
}: {
  websiteType: string;
  value: string;
  onChange: (digits: string) => void;
  onNext: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const rule = BUDGET_RULES[websiteType];
  if (!rule) return null;
  const amount = value === '' ? 0 : parseInt(value, 10);

  function handleNext() {
    if (!rule) return;
    if (amount < rule.floor) {
      setError(
        `${formatInr(amount)} is a little too low — the minimum we can take on ${rule.label.toLowerCase()} is ${formatInr(rule.floor)}.`
      );
      return;
    }
    onNext();
  }

  return (
    <CardShell>
      <CardHeading title="What works for you?" subtitle="Tell us your number — we'll see what's possible." />
      <label className="block">
        <span className="mb-2 block text-[14px] font-semibold">Budget in INR</span>
        <div className="flex items-stretch border-2 border-neutral-400 bg-bg focus-within:border-accent-600">
          <span className="flex items-center pl-4 pr-2 text-[16px] font-semibold text-neutral-700">₹</span>
          <input
            type="text"
            inputMode="numeric"
            value={value === '' ? '' : parseInt(value, 10).toLocaleString('en-IN')}
            onChange={(e) => {
              setError(null);
              onChange(e.target.value.replace(/\D/g, '').slice(0, 8));
            }}
            placeholder={rule.floor.toLocaleString('en-IN')}
            className="w-full bg-transparent py-3.5 pr-4 text-[16px] outline-none"
          />
        </div>
      </label>
      {error ? (
        <div className="mt-4 border-2 border-accent-700 bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-700">
          {error}
        </div>
      ) : null}
      <PrimaryButton disabled={value === ''} onClick={handleNext}>
        Next
      </PrimaryButton>
    </CardShell>
  );
}

function NameBusinessCard({
  name,
  business,
  onChange,
  onNext,
}: {
  name: string;
  business: string;
  onChange: (field: 'name' | 'business', value: string) => void;
  onNext: () => void;
}) {
  const valid = name.trim().length > 0 && business.trim().length > 0;
  return (
    <CardShell>
      <CardHeading title="Your name & business name" />
      <div className="grid gap-5">
        <label className="block">
          <span className="mb-2 block text-[14px] font-semibold">Your full name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="e.g. Rahul Sharma"
            autoComplete="name"
            className="w-full border-2 border-neutral-400 bg-bg px-4 py-3.5 text-[16px] outline-none focus:border-accent-600"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-[14px] font-semibold">Business name</span>
          <input
            type="text"
            value={business}
            onChange={(e) => onChange('business', e.target.value)}
            placeholder="e.g. Sharma Traders"
            autoComplete="organization"
            className="w-full border-2 border-neutral-400 bg-bg px-4 py-3.5 text-[16px] outline-none focus:border-accent-600"
          />
        </label>
      </div>
      <PrimaryButton disabled={!valid} onClick={onNext}>
        Next
      </PrimaryButton>
    </CardShell>
  );
}

function PhoneCard({
  phone,
  onChange,
  onSubmit,
  submitting,
  error,
}: {
  phone: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const valid = /^\d{10}$/.test(phone);
  return (
    <CardShell>
      <CardHeading title="Your WhatsApp number" subtitle="We'll send your quote here. No spam calls." />
      <label className="block">
        <span className="mb-2 block text-[14px] font-semibold">WhatsApp number</span>
        <div className="flex items-stretch border-2 border-neutral-400 bg-bg focus-within:border-accent-600">
          <span className="flex items-center pl-4 pr-2 text-[16px] font-semibold text-neutral-700">+91</span>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="98765 43210"
            maxLength={10}
            autoComplete="tel-national"
            className="w-full bg-transparent py-3.5 pr-4 text-[16px] outline-none"
          />
        </div>
      </label>
      {error ? (
        <div className="mt-4 border-2 border-accent-700 bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-700">
          {error}{' '}
          <a
            href={QUOTE_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Message us on WhatsApp instead
          </a>
        </div>
      ) : null}
      <PrimaryButton disabled={!valid || submitting} onClick={onSubmit}>
        {submitting ? (
          <>
            <Loader2 size={20} className="animate-spin" aria-hidden="true" /> Sending…
          </>
        ) : (
          'Get My Quote'
        )}
      </PrimaryButton>
    </CardShell>
  );
}

function SuccessCard() {
  return (
    <CardShell>
      <div className="text-center">
        <svg viewBox="0 0 64 64" className="dh-tick mx-auto mb-5 h-16 w-16" aria-hidden="true">
          <circle cx="32" cy="32" r="29" fill="none" stroke="var(--color-accent)" strokeWidth="3" />
          <path
            d="M20 33.5 L28.5 42 L44 25"
            fill="none"
            stroke="var(--color-accent-600)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h2 className="mb-3 text-[clamp(23px,6vw,30px)] font-extrabold leading-tight tracking-[-0.02em]">
          Done!
        </h2>
        <p className="mb-8 text-[15px] text-neutral-800">
          Our team will WhatsApp you your quote within a few hours.
        </p>
        <a
          href={QUOTE_WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center border-2 border-text py-4 text-[15px] font-semibold text-text transition-colors hover:bg-text hover:text-bg"
        >
          Message us on WhatsApp
        </a>
      </div>
    </CardShell>
  );
}

/* ── the form ───────────────────────────────────────────────────────── */

export function QuoteForm() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<QuoteAnswers>(EMPTY_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const lockedRef = useRef(false);
  const sourceRef = useRef<QuoteSource>({});
  const { displayStep, anim } = useStepTransition(step);

  const websiteType = answers.websiteType as string;
  const questions = getQuestions(websiteType);
  const totalSteps = getTotalSteps(websiteType);
  const pitchStep = questions.length + 1;
  const entryStep = questions.length + 2;
  const contactStep = questions.length + 3;
  const timeStep = questions.length + 4;
  const phoneStep = questions.length + 5;

  useEffect(() => {
    sourceRef.current = readSource();
    trackPixelEvent('ViewContent', { content_name: 'get-quote' });

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { step?: number; answers?: QuoteAnswers };
        const restored = { ...EMPTY_ANSWERS, ...(parsed.answers ?? {}) };
        setAnswers(restored);
        const max = getTotalSteps(restored.websiteType as string);
        if (typeof parsed.step === 'number' && parsed.step >= 1 && parsed.step <= max) {
          setStep(parsed.step);
        }
      }
    } catch {
      // Corrupt storage only costs the visitor their restored progress.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || step > totalSteps) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, answers }));
    } catch {
      // Storage unavailable - answers still live in memory for this session.
    }
  }, [step, answers, hydrated, totalSteps]);

  const currentQuestion = questions[step - 1];
  const currentQuestionKey =
    step <= questions.length && currentQuestion
      ? currentQuestion.key
      : step === pitchStep
        ? 'budgetPitch'
        : step === entryStep
          ? 'budgetCustom'
          : step === contactStep
            ? 'contact'
            : step === timeStep
              ? 'contactTime'
              : 'phone';

  useEffect(() => {
    if (step >= 1 && step <= totalSteps) {
      trackPixelCustom('QuoteStep', { step, question: currentQuestionKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function withLock(fn: () => void) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setTimeout(() => {
      lockedRef.current = false;
    }, TRANSITION_MS + 20);
    fn();
  }

  function goForward() {
    withLock(() => setStep((s) => Math.min(s + 1, totalSteps + 1)));
  }

  function goTo(target: number) {
    withLock(() => setStep(Math.max(1, Math.min(target, totalSteps + 1))));
  }

  function goBack() {
    // The custom-budget entry step is skipped when the visitor accepted the
    // displayed range - skip it going backwards too.
    if (step === contactStep && answers.budgetAgreed === 'yes') {
      goTo(pitchStep);
      return;
    }
    withLock(() => setStep((s) => Math.max(s - 1, 1)));
  }

  function handleSelectType(id: string) {
    setAnswers((prev) => {
      if (prev.websiteType === id) return prev;
      // Branch changed - old branch answers no longer apply.
      return {
        ...EMPTY_ANSWERS,
        websiteType: id,
        name: prev.name ?? '',
        business: prev.business ?? '',
        phone: prev.phone ?? '',
      };
    });
    goForward();
  }

  function handleSingleChoice(key: string, id: string) {
    setAnswers((prev) => ({ ...prev, [key]: id }));
    goForward();
  }

  function handleMultiToggle(question: QuoteQuestion, id: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[question.key]) ? (prev[question.key] as string[]) : [];
      const option = question.options.find((o) => o.id === id);
      let next: string[];
      if (current.includes(id)) {
        next = current.filter((x) => x !== id);
      } else if (option?.exclusive) {
        next = [id];
      } else {
        next = [
          ...current.filter((x) => !question.options.find((o) => o.id === x)?.exclusive),
          id,
        ];
      }
      return { ...prev, [question.key]: next };
    });
  }

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await submitQuoteLead({ answers, source: sourceRef.current });
      if (!result.ok) throw new Error(result.error);

      trackPixelEvent('Lead');
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Nothing to do - stale storage is harmless after success.
      }
      setStep(totalSteps + 1);
    } catch {
      setSubmitError('Could not send your details. Check your connection and try again, or');
    } finally {
      setSubmitting(false);
    }
  }

  function renderStep(n: number) {
    const question = questions[n - 1];
    if (n >= 1 && n <= questions.length && question) {
      if (question.key === 'websiteType') {
        return (
          <SingleChoiceCard question={question} selectedId={websiteType} onSelect={handleSelectType} />
        );
      }
      if (question.mode === 'multi') {
        const selected = Array.isArray(answers[question.key])
          ? (answers[question.key] as string[])
          : [];
        return (
          <MultiChoiceCard
            question={question}
            selectedIds={selected}
            onToggle={(id) => handleMultiToggle(question, id)}
            onNext={goForward}
          />
        );
      }
      if (question.mode === 'text') {
        return (
          <TextCard
            question={question}
            value={typeof answers[question.key] === 'string' ? (answers[question.key] as string) : ''}
            onChange={(v) => setAnswer(question.key, v)}
            onNext={goForward}
          />
        );
      }
      return (
        <SingleChoiceCard
          question={question}
          selectedId={
            typeof answers[question.key] === 'string' ? (answers[question.key] as string) : ''
          }
          onSelect={(id) => handleSingleChoice(question.key, id)}
        />
      );
    }
    if (n === pitchStep) {
      return (
        <BudgetPitchCard
          websiteType={websiteType}
          onAgree={() => {
            setAnswers((prev) => ({ ...prev, budgetAgreed: 'yes', budget: '' }));
            goTo(contactStep);
          }}
          onDecline={() => {
            setAnswers((prev) => ({ ...prev, budgetAgreed: 'custom' }));
            goForward();
          }}
        />
      );
    }
    if (n === entryStep) {
      return (
        <BudgetEntryCard
          websiteType={websiteType}
          value={answers.budget as string}
          onChange={(digits) => setAnswer('budget', digits)}
          onNext={goForward}
        />
      );
    }
    if (n === contactStep) {
      return (
        <NameBusinessCard
          name={answers.name as string}
          business={answers.business as string}
          onChange={(field, v) => setAnswer(field, v)}
          onNext={goForward}
        />
      );
    }
    if (n === timeStep) {
      return (
        <SingleChoiceCard
          question={CONTACT_TIME_QUESTION}
          selectedId={
            typeof answers.contactTime === 'string' ? (answers.contactTime as string) : ''
          }
          onSelect={(id) => handleSingleChoice('contactTime', id)}
        />
      );
    }
    if (n === phoneStep) {
      return (
        <PhoneCard
          phone={answers.phone as string}
          onChange={(value) => setAnswer('phone', value)}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={submitError}
        />
      );
    }
    return <SuccessCard />;
  }

  const showProgress = displayStep <= totalSteps;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[540px] flex-col px-[clamp(16px,4vw,24px)] pb-10 pt-8">
      <div className="mb-8 flex justify-center">
        <Image
          src="/logo.png"
          alt="Digi Hook"
          width={151}
          height={36}
          priority
          style={{ height: 'clamp(29px, 7.2vw, 38px)', width: 'auto', mixBlendMode: 'multiply' }}
        />
      </div>

      <h1 className="sr-only">Get a website quote — Digi Hook</h1>

      {showProgress ? (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              aria-label="Back"
              className="flex h-9 w-9 flex-none items-center justify-center border-2 border-text transition-opacity disabled:opacity-0"
            >
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-700">
              Question {Math.min(step, totalSteps)} of {totalSteps}
            </span>
          </div>
          <div className="h-1.5 w-full bg-neutral-300">
            <div
              className="h-full bg-accent-600 transition-[width] duration-300 ease-out"
              style={{ width: `${(Math.min(step, totalSteps) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="relative grid">
        {anim ? (
          <div
            key={`out-${anim.from}`}
            aria-hidden="true"
            className="transition-[transform,opacity] duration-300 ease-out"
            style={cardStyle(anim, 'outgoing')}
          >
            {renderStep(anim.from)}
          </div>
        ) : null}
        <div
          key={`cur-${displayStep}`}
          className="transition-[transform,opacity] duration-300 ease-out"
          style={cardStyle(anim, 'incoming')}
        >
          {renderStep(displayStep)}
        </div>
      </div>
    </main>
  );
}
