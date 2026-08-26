import { supportState } from '@/lib/support';
import type { PortalProject } from '@/lib/portalProjects';

function displayDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * The support plan as the client sees it: what they have, when it started,
 * and honestly how much of it is left. The ended state deliberately keeps
 * the door open — tickets still go through, we quote instead of refusing.
 */
export function SupportPlanPanel({ project }: { project: PortalProject }) {
  const state = supportState(project.liveAt, project.supportDays);

  return (
    <section aria-labelledby="support-plan-heading" className="border-2 border-text p-7">
      <h2
        id="support-plan-heading"
        className="m-0 mb-5 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
      >
        Your support plan
      </h2>

      {state.state === 'active' ? (
        <>
          <div className="mb-1 font-heading text-[clamp(34px,4vw,48px)] font-extrabold leading-none tracking-[-0.04em]">
            {state.daysLeft} {state.daysLeft === 1 ? 'day' : 'days'}
          </div>
          <p className="m-0 mb-5 text-[15px] leading-[1.6] text-neutral-800">
            of support remaining on your {project.supportDays}-day plan.
          </p>
          <div
            role="img"
            aria-label={`${state.daysLeft} of ${project.supportDays} support days remaining`}
            className="mb-4 h-2 w-full bg-neutral-200"
          >
            <div
              className="h-full bg-accent"
              style={{
                width: `${Math.min(100, Math.max(0, ((project.supportDays - state.daysLeft) / Math.max(1, project.supportDays)) * 100))}%`,
              }}
            />
          </div>
          <p className="m-0 text-[13.5px] leading-[1.6] text-neutral-700">
            Live since {displayDate(state.liveAt)} · support runs until{' '}
            {displayDate(state.endsOn)}. Bug fixes and minor corrections are
            covered — raise a ticket any time.
          </p>
        </>
      ) : state.state === 'ended' ? (
        <>
          <div className="mb-1 font-heading text-[clamp(24px,3vw,34px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            Support ended {displayDate(state.endedOn)}.
          </div>
          <p className="m-0 mt-3 max-w-[56ch] text-[15px] leading-[1.65] text-neutral-800">
            Your {project.supportDays}-day plan (live since{' '}
            {displayDate(state.liveAt)}) has run its course. You can still raise
            a ticket — we will come back with options and a quote before any
            work starts, and nothing is charged without your go-ahead. Ask us
            about the annual maintenance plan if you would like cover back in
            place.
          </p>
        </>
      ) : state.liveAt ? (
        <>
          <div className="mb-1 font-heading text-[clamp(24px,3vw,34px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            Goes live on {displayDate(state.liveAt)}.
          </div>
          <p className="m-0 mt-3 max-w-[56ch] text-[15px] leading-[1.65] text-neutral-800">
            Your {project.supportDays} days of support start that day and cover
            bug fixes and minor corrections.
          </p>
        </>
      ) : (
        <>
          <div className="mb-1 font-heading text-[clamp(24px,3vw,34px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            {project.supportDays} days of support, from the day you go live.
          </div>
          <p className="m-0 mt-3 max-w-[56ch] text-[15px] leading-[1.65] text-neutral-800">
            The live date is not set yet — once your project launches, the
            countdown starts and you will see it here. Bug fixes and minor
            corrections are covered throughout.
          </p>
        </>
      )}
    </section>
  );
}
