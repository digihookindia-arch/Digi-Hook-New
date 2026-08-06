import { Check, Circle, Loader } from 'lucide-react';
import {
  ASSET_LABELS,
  MILESTONE_LABELS,
  STAGE_LABELS,
  milestoneAmounts,
  totalPercent,
  type AssetItem,
  type Milestone,
  type WorkStage,
} from '@/lib/delivery';

/**
 * The client-facing render of the studio's delivery records. Read-only by
 * design — nothing on these pages writes. The client sees where things stand;
 * the studio moves them from the dashboard.
 */

type Tone = 'done' | 'active' | 'waiting';

function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  // white on accent-600 measures 4.74:1 and passes AA; bare accent would not.
  const styles: Record<Tone, string> = {
    done: 'border-accent-600 bg-accent-600 text-white',
    active: 'border-accent-600 text-accent-700',
    waiting: 'border-neutral-400 text-neutral-700',
  };
  return (
    <span
      className={`inline-flex min-h-[24px] items-center border-2 px-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.1em] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="m-0 mb-4 font-heading text-[clamp(20px,2.2vw,28px)] font-bold leading-[1.15] tracking-[-0.028em]">
      {children}
    </h2>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 border-2 border-neutral-300 p-6 text-[15px] leading-[1.6] text-neutral-700">
      {children}
    </p>
  );
}

/* ── what the client owes us ────────────────────────────────────────────── */

export function AssetsView({ assets }: { assets: AssetItem[] }) {
  const outstanding = assets.filter((a) => a.status === 'pending').length;

  return (
    <section>
      <SectionHeading>What we need from you</SectionHeading>
      <p className="m-0 mb-7 max-w-[62ch] text-[15.5px] leading-[1.65] text-neutral-800">
        {assets.length === 0
          ? 'We will list anything we need from you here as the project starts.'
          : outstanding === 0
            ? 'Everything we asked for has arrived. Nothing is waiting on you.'
            : `${outstanding} of ${assets.length} ${outstanding === 1 ? 'item is' : 'items are'} still with you. Send whatever is ready — you do not have to send it all at once.`}
      </p>

      {assets.length === 0 ? (
        <Empty>Nothing to collect yet.</Empty>
      ) : (
        <div className="border-t-2 border-text">
          {assets.map((asset, i) => (
            <div
              key={`${asset.label}-${i}`}
              className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-b border-neutral-300 py-5"
            >
              {asset.status === 'received' ? (
                <Check
                  size={17}
                  strokeWidth={3}
                  aria-hidden="true"
                  className="mt-[3px] text-accent"
                />
              ) : (
                <Circle
                  size={15}
                  strokeWidth={2.5}
                  aria-hidden="true"
                  className="mt-[4px] text-neutral-500"
                />
              )}
              <div>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
                  <h3 className="m-0 font-heading text-[17px] font-bold leading-[1.2] tracking-[-0.02em]">
                    {asset.label}
                  </h3>
                  <StatusPill tone={asset.status === 'received' ? 'done' : 'waiting'}>
                    {ASSET_LABELS[asset.status]}
                  </StatusPill>
                </div>
                {asset.detail ? (
                  <p className="m-0 max-w-[60ch] text-[14.5px] leading-[1.6] text-neutral-800">
                    {asset.detail}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── where the work has got to ──────────────────────────────────────────── */

export function StagesView({ stages }: { stages: WorkStage[] }) {
  const done = stages.filter((s) => s.status === 'done').length;
  const percent = stages.length ? Math.round((done / stages.length) * 100) : 0;

  return (
    <section className="mb-11">
      <SectionHeading>Where the work has got to</SectionHeading>

      {stages.length === 0 ? (
        <Empty>We will track the stages here once the project starts.</Empty>
      ) : (
        <>
          <div className="mb-7">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
              <span className="text-[13px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
                {done} of {stages.length} stages complete
              </span>
              <span className="font-heading text-[19px] font-extrabold leading-none tracking-[-0.02em] text-accent-700">
                {percent}%
              </span>
            </div>
            {/* Decorative fill, no text on it — bare accent is fine here. */}
            <div
              className="h-2 w-full bg-neutral-200"
              role="img"
              aria-label={`${percent} percent complete`}
            >
              <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <div className="border-t-2 border-text">
            {stages.map((stage, i) => (
              <div
                key={`${stage.label}-${i}`}
                className="grid grid-cols-[52px_minmax(0,1fr)] gap-4 border-b border-neutral-300 py-5"
              >
                <div
                  className={`font-heading text-[20px] font-extrabold leading-none ${
                    stage.status === 'pending' ? 'text-neutral-500' : 'text-accent'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
                    <h3 className="m-0 font-heading text-[17px] font-bold leading-[1.2] tracking-[-0.02em]">
                      {stage.label}
                    </h3>
                    <StatusPill
                      tone={
                        stage.status === 'done'
                          ? 'done'
                          : stage.status === 'active'
                            ? 'active'
                            : 'waiting'
                      }
                    >
                      {stage.status === 'active' ? (
                        <Loader
                          size={11}
                          strokeWidth={3}
                          aria-hidden="true"
                          className="mr-1.5"
                        />
                      ) : null}
                      {STAGE_LABELS[stage.status]}
                    </StatusPill>
                  </div>
                  {stage.detail ? (
                    <p className="m-0 max-w-[60ch] text-[14.5px] leading-[1.6] text-neutral-800">
                      {stage.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ── the payment schedule ───────────────────────────────────────────────── */

export function MilestonesView({
  milestones,
  total,
}: {
  milestones: Milestone[];
  total: string;
}) {
  const amounts = milestoneAmounts(total, milestones);
  const paid = milestones.filter((m) => m.status === 'paid');
  const claimed = totalPercent(milestones);

  return (
    <section>
      <SectionHeading>Payment schedule</SectionHeading>

      {milestones.length === 0 ? (
        <Empty>The payment schedule will appear here once it is agreed.</Empty>
      ) : (
        <>
          <div className="border-t-2 border-text">
            {milestones.map((milestone, i) => (
              <div
                key={`${milestone.label}-${i}`}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-neutral-300 py-5"
              >
                <div className="min-w-0 flex-[1_1_320px]">
                  <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                    <span className="font-heading text-[15.5px] font-bold leading-[1.3] tracking-[-0.015em]">
                      {milestone.label}
                    </span>
                    <StatusPill
                      tone={
                        milestone.status === 'paid'
                          ? 'done'
                          : milestone.status === 'invoiced'
                            ? 'active'
                            : 'waiting'
                      }
                    >
                      {MILESTONE_LABELS[milestone.status]}
                    </StatusPill>
                  </div>
                  {milestone.note ? (
                    <p className="m-0 max-w-[58ch] text-[13.5px] leading-[1.55] text-neutral-700">
                      {milestone.note}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  {amounts[i] ? (
                    <div className="font-heading text-[17px] font-extrabold leading-none tracking-[-0.02em]">
                      {amounts[i]}
                    </div>
                  ) : null}
                  <div className="mt-1.5 text-[13px] font-semibold uppercase leading-none tracking-[0.08em] text-neutral-700">
                    {milestone.percent}% of total
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="m-0 mt-5 max-w-[62ch] text-[13.5px] leading-[1.6] text-neutral-700">
            {paid.length > 0
              ? `${paid.length} of ${milestones.length} payments received. `
              : ''}
            {claimed === 100
              ? 'Amounts are shares of the project total and exclude GST.'
              : 'Amounts are shares of the project total and exclude GST. Ask us if the split does not look right.'}{' '}
            We track payments here and invoice you for each one — nothing is
            collected on this page.
          </p>
        </>
      )}
    </section>
  );
}
