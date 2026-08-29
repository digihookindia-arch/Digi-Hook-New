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
 * The complimentary server window — same arithmetic as the support plan
 * (lib/support.ts is date-window maths, not support-specific), different
 * copy: when this one ends, hosting needs a renewal, so the ended state
 * points at renewal rather than at tickets.
 */
export function ServerPlanPanel({ project }: { project: PortalProject }) {
  const state = supportState(project.serverAt, project.serverDays);

  return (
    <section aria-labelledby="server-plan-heading" className="border-2 border-text p-7">
      <h2
        id="server-plan-heading"
        className="m-0 mb-5 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
      >
        Your server
      </h2>

      {state.state === 'active' ? (
        <>
          <div className="mb-1 font-heading text-[clamp(34px,4vw,48px)] font-extrabold leading-none tracking-[-0.04em]">
            {state.daysLeft} {state.daysLeft === 1 ? 'day' : 'days'}
          </div>
          <p className="m-0 mb-5 text-[15px] leading-[1.6] text-neutral-800">
            of complimentary server included with your project.
          </p>
          <div
            role="img"
            aria-label={`${state.daysLeft} of ${project.serverDays} complimentary server days remaining`}
            className="mb-4 h-2 w-full bg-neutral-200"
          >
            <div
              className="h-full bg-accent"
              style={{
                width: `${Math.min(100, Math.max(0, ((project.serverDays - state.daysLeft) / Math.max(1, project.serverDays)) * 100))}%`,
              }}
            />
          </div>
          <p className="m-0 text-[13.5px] leading-[1.6] text-neutral-700">
            Covered until {displayDate(state.endsOn)}. We will send a renewal
            quote well before it ends — hosting never just stops.
          </p>
        </>
      ) : state.state === 'ended' ? (
        <>
          <div className="mb-1 font-heading text-[clamp(24px,3vw,34px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            Server window ended {displayDate(state.endedOn)}.
          </div>
          <p className="m-0 mt-3 max-w-[56ch] text-[15px] leading-[1.65] text-neutral-800">
            Your complimentary {project.serverDays}-day server period has run
            its course. Talk to us about renewal to keep hosting covered — we
            will send the options and pricing.
          </p>
        </>
      ) : (
        <>
          <div className="mb-1 font-heading text-[clamp(24px,3vw,34px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            {project.serverDays} days of server, on us.
          </div>
          <p className="m-0 mt-3 max-w-[56ch] text-[15px] leading-[1.65] text-neutral-800">
            {state.liveAt
              ? `Your complimentary server period starts ${displayDate(state.liveAt)}.`
              : 'Your project includes a complimentary server period — the countdown appears here once the start date is set.'}
          </p>
        </>
      )}
    </section>
  );
}
