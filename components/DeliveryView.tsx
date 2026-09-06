import { Check, Circle, Loader } from 'lucide-react';
import {
  ASSET_LABELS,
  STAGE_LABELS,
  type AssetItem,
  type WorkStage,
} from '@/lib/delivery';

/**
 * The client-facing render of the studio's delivery records. Read-only by
 * design — nothing on these pages writes. The client sees where things stand;
 * the studio moves them from the dashboard.
 *
 * Money is deliberately not here. The payment schedule lives in
 * `components/PaymentView.tsx`, on its own stage, because it gained a pay
 * button, GST and a receipt ledger — and because two renderings of the same
 * schedule on adjacent stages is how a client ends up reading a stale one.
 */

type Tone = 'done' | 'active' | 'waiting';

function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  // White on accent-600 measures 4.74:1 and passes AA; bare accent would not.
  const styles: Record<Tone, string> = {
    done: 'bg-accent-600 text-white',
    active: 'bg-accent-100 text-accent-700',
    waiting: 'bg-surface text-neutral-700',
  };
  return (
    <span
      className={`inline-flex min-h-[24px] items-center rounded-full px-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.1em] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

/** The stage header, matching the numbered sections of the proposal itself. */
function StageHeading({
  number,
  title,
  lead,
}: {
  number: string;
  title: string;
  lead: string;
}) {
  return (
    <>
      <div className="mb-3 text-[13px] font-extrabold uppercase leading-none tracking-[0.16em] text-accent-700">
        {number}
      </div>
      <h2 className="m-0 font-heading text-[clamp(24px,3vw,38px)] font-extrabold leading-[1.06] tracking-[-0.035em]">
        {title}
      </h2>
      <p className="m-0 mt-5 max-w-[64ch] text-[clamp(15.5px,1.6vw,17.5px)] leading-[1.7] text-neutral-800">
        {lead}
      </p>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 mt-8 rounded-panel bg-panel p-6 text-[15px] leading-[1.6] text-neutral-700 shadow-panel">
      {children}
    </p>
  );
}

/* ── what the client owes us ────────────────────────────────────────────── */

export function AssetsView({ assets }: { assets: AssetItem[] }) {
  const outstanding = assets.filter((a) => a.status === 'pending').length;

  return (
    <section>
      <StageHeading
        number="02"
        title="What we need from you"
        lead={
          assets.length === 0
            ? 'We will list anything we need from you here as the project starts.'
            : outstanding === 0
              ? 'Everything we asked for has arrived. Nothing is waiting on you.'
              : `${outstanding} of ${assets.length} ${outstanding === 1 ? 'item is' : 'items are'} still with you. Send whatever is ready — you do not have to send it all at once.`
        }
      />

      {assets.length === 0 ? (
        <Empty>Nothing to collect yet.</Empty>
      ) : (
        <ul className="m-0 mt-9 grid list-none gap-3.5 p-0">
          {assets.map((asset, i) => (
            <li key={`${asset.label}-${i}`}>
              <div className="break-inside-avoid rounded-panel bg-panel p-[clamp(18px,2.5vw,26px)] shadow-panel">
                <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-3">
                  {asset.status === 'received' ? (
                    <Check
                      size={18}
                      strokeWidth={3}
                      aria-hidden="true"
                      className="mt-[3px] text-accent"
                    />
                  ) : (
                    <Circle
                      size={16}
                      strokeWidth={2.5}
                      aria-hidden="true"
                      className="mt-[4px] text-neutral-500"
                    />
                  )}
                  <div>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
                      <h3 className="m-0 font-heading text-[17.5px] font-bold leading-[1.2] tracking-[-0.025em]">
                        {asset.label}
                      </h3>
                      <StatusPill
                        tone={asset.status === 'received' ? 'done' : 'waiting'}
                      >
                        {ASSET_LABELS[asset.status]}
                      </StatusPill>
                    </div>
                    {asset.detail ? (
                      <p className="m-0 max-w-[62ch] text-[14.5px] leading-[1.65] text-neutral-800">
                        {asset.detail}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── where the work has got to ──────────────────────────────────────────── */

export function StagesView({ stages }: { stages: WorkStage[] }) {
  const done = stages.filter((s) => s.status === 'done').length;
  const percent = stages.length ? Math.round((done / stages.length) * 100) : 0;

  return (
    <section>
      <StageHeading
        number="03"
        title="Where the work has got to"
        lead="Every stage of the build, updated as it moves. If something here looks out of date, tell us — this page is only as good as we keep it."
      />

      {stages.length === 0 ? (
        <Empty>We will track the stages here once the project starts.</Empty>
      ) : (
        <>
          <div className="mt-9 rounded-panel bg-text p-[clamp(20px,3vw,28px)] text-bg shadow-lift">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-400">
                {done} of {stages.length} stages complete
              </span>
              <span className="font-heading text-[clamp(26px,3.5vw,38px)] font-extrabold leading-none tracking-[-0.04em]">
                {percent}%
              </span>
            </div>
            {/* Decorative fill, no text on it — bare accent is fine here. */}
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-700"
              role="img"
              aria-label={`${percent} percent complete`}
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <ol className="m-0 mt-4 grid list-none gap-3.5 p-0">
            {stages.map((stage, i) => (
              <li key={`${stage.label}-${i}`}>
                <div
                  className={`break-inside-avoid rounded-panel bg-panel p-[clamp(18px,2.5vw,26px)] ${
                    stage.status === 'active'
                      ? 'shadow-lift ring-2 ring-accent-600'
                      : 'shadow-panel'
                  }`}
                >
                  <div className="grid grid-cols-[46px_minmax(0,1fr)] gap-3">
                    <div
                      className={`font-heading text-[20px] font-extrabold leading-none ${
                        stage.status === 'pending' ? 'text-neutral-500' : 'text-accent'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
                        <h3 className="m-0 font-heading text-[17.5px] font-bold leading-[1.2] tracking-[-0.025em]">
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
                        <p className="m-0 max-w-[62ch] text-[14.5px] leading-[1.65] text-neutral-800">
                          {stage.detail}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
