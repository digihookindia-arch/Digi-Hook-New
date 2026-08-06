import type { ReactNode } from 'react';

/**
 * Page hero. `dark` is the inverted ground used by the service, deep, SEO and
 * engineering pages; `light` is the plain ground used by Technology, Pricing,
 * About, Knowledge Hub and Contact. One H1 per page, always here.
 */
export function PageHero({
  tone = 'light',
  kicker,
  title,
  lead,
  lead2,
  chips,
  titleSize = 'clamp(38px,6.2vw,98px)',
  titleMax = '22ch',
  children,
}: {
  tone?: 'dark' | 'light';
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  lead2?: string;
  chips?: string[];
  titleSize?: string;
  titleMax?: string;
  children?: ReactNode;
}) {
  const dark = tone === 'dark';

  return (
    <section
      className={`border-b-2 border-divider ${dark ? 'bg-text text-bg' : ''}`}
    >
      <div className="mx-auto max-w-content px-gutter py-[clamp(56px,8vh,104px)]">
        <div
          className={`mb-6 text-[12px] font-semibold uppercase leading-[1.3] tracking-[0.16em] ${
            dark ? 'text-accent-400' : 'text-accent-700'
          }`}
        >
          {kicker}
        </div>
        <h1
          className="m-0 mb-7 font-heading font-extrabold leading-[0.94] tracking-[-0.045em]"
          style={{ fontSize: titleSize, maxWidth: titleMax }}
        >
          {title}
        </h1>
        {lead ? (
          <p
            className={`m-0 max-w-[64ch] text-[clamp(17px,1.5vw,22px)] leading-[1.55] ${
              dark ? 'text-neutral-300' : 'text-neutral-800'
            } ${lead2 || chips ? 'mb-5' : ''}`}
          >
            {lead}
          </p>
        ) : null}
        {lead2 ? (
          <p
            className={`m-0 mb-9 max-w-[66ch] text-[16px] leading-[1.65] ${
              dark ? 'text-neutral-400' : 'text-neutral-700'
            }`}
          >
            {lead2}
          </p>
        ) : null}
        {chips?.length ? <Chips items={chips} dark={dark} /> : null}
        {children}
      </div>
    </section>
  );
}

export function Chips({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((c) => (
        <span
          key={c}
          className={`inline-flex items-center border px-[13px] py-2.5 text-[12.5px] font-medium uppercase leading-[1.3] tracking-[0.06em] ${
            dark
              ? 'border-neutral-700 text-neutral-300'
              : 'border-neutral-400 text-neutral-800'
          }`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}
