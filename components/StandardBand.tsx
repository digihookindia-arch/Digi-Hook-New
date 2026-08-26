import { standardBand } from '@/content/work';
import { Reveal } from './Reveal';
import { ScoreRow } from './ScoreRings';

/**
 * The headline band directly under the hero — the page's USP, stated as a
 * standard and animated on a loop.
 *
 * This is the only row on the site that loops rather than counting up once; it
 * is the first thing under the hero and has to catch the eye, where a page full
 * of looping rings would just be noise. The numbers are a floor, not a result —
 * see the note in `content/work.ts` for why that distinction is load bearing
 * this close to three checkable client scores.
 */
export function StandardBand() {
  const s = standardBand;

  return (
    <section className="border-b-2 border-divider bg-surface">
      <div className="mx-auto max-w-content px-gutter py-[clamp(44px,6vh,80px)]">
        <Reveal className="flex flex-wrap items-center gap-[clamp(28px,5vw,80px)]">
          <div className="flex-[1_1_380px]">
            <div className="mb-[16px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
              {s.kicker}
            </div>
            <h2 className="m-0 mb-[16px] max-w-[16ch] font-heading text-[clamp(30px,4.2vw,58px)] font-extrabold leading-[1.02] tracking-[-0.038em]">
              {s.title}
            </h2>
            <p className="m-0 max-w-[54ch] text-[15.5px] leading-[1.6] text-neutral-800">
              {s.body}
            </p>
          </div>

          <div className="flex-[1_1_440px]">
            {/* Fluid rather than a fixed px size: four rings this large have to
                shrink with the column, and the design system forbids a
                breakpoint to do it. */}
            <ScoreRow
              scores={s.scores}
              size="clamp(64px, 12.5vw, 116px)"
              labelSize="clamp(9.5px, 0.85vw, 11.5px)"
              repeat
              className="max-w-[600px]"
            />
            <p className="m-0 mt-[22px] max-w-[52ch] text-[12px] leading-[1.5] text-neutral-700">
              {s.note}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
