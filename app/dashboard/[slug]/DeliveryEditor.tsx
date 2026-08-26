'use client';

import { useActionState, useState } from 'react';
import { Save } from 'lucide-react';
import {
  ASSET_LABELS,
  ASSET_STATUSES,
  MILESTONE_LABELS,
  MILESTONE_STATUSES,
  STAGE_LABELS,
  STAGE_STATUSES,
  formatInr,
  milestoneAmountValues,
  parseAmount,
  totalPercent,
  type AssetItem,
  type Milestone,
  type WorkStage,
} from '@/lib/delivery';
import { saveDeliveryAction, type DeliveryState } from '../actions';
import { Label, Panel, RowShell, inputClass } from './EditorKit';

/**
 * Studio-side editing for the client's /assets and /status tabs.
 *
 * The three lists are held in React state and posted as one JSON payload, which
 * the server re-validates row by row — the shapes here are a convenience for
 * whoever is typing, never the thing that is trusted.
 */

export function DeliveryEditor({
  slug,
  total,
  initialAssets,
  initialMilestones,
  initialStages,
}: {
  slug: string;
  total: string;
  initialAssets: AssetItem[];
  initialMilestones: Milestone[];
  initialStages: WorkStage[];
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [stages, setStages] = useState(initialStages);

  const [state, action, pending] = useActionState(
    saveDeliveryAction,
    {} as DeliveryState
  );

  /** Replaces one field on one row, immutably. */
  function patch<T>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    index: number,
    changes: Partial<T>
  ) {
    setter((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...changes } : row))
    );
  }

  function removeAt<T>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    index: number
  ) {
    setter((rows) => rows.filter((_, i) => i !== index));
  }

  const claimed = totalPercent(milestones);
  const totalValue = parseAmount(total);
  const amountValues = milestoneAmountValues(total, milestones);
  const amounts = amountValues.map((n) => (n === null ? null : formatInr(n)));
  // When the total is a real figure, the honest check is on rupees, not
  // percents — an exact amount typed into one row shifts what the others must
  // add up to. Percent-mode rows with no figure count as 0 here on purpose.
  const amountSum = amountValues.reduce((sum: number, n) => sum + (n ?? 0), 0);
  const pureShares = milestones.every((m) => m.amount === null);

  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <input
        type="hidden"
        name="delivery"
        value={JSON.stringify({ assets, milestones, stages })}
      />

      <Panel
        title="What we need from the client"
        hint="Shown on their “What we need” tab. Cut this down to what this project actually needs before you send the link."
        addLabel="Add an item"
        onAdd={() =>
          setAssets((rows) => [
            ...rows,
            { label: '', detail: '', status: 'pending' },
          ])
        }
      >
        {assets.map((asset, i) => (
          <RowShell
            key={i}
            removeLabel={`Remove ${asset.label || 'this item'}`}
            onRemove={() => removeAt(setAssets, i)}
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
              <label className="block">
                <Label>Item</Label>
                <input
                  className={inputClass}
                  value={asset.label}
                  onChange={(e) => patch(setAssets, i, { label: e.target.value })}
                />
              </label>
              <label className="block">
                <Label>Status</Label>
                <select
                  className={inputClass}
                  value={asset.status}
                  onChange={(e) =>
                    patch(setAssets, i, {
                      status: e.target.value as AssetItem['status'],
                    })
                  }
                >
                  {ASSET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ASSET_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 block">
              <Label>What exactly we need</Label>
              <textarea
                rows={2}
                className={inputClass}
                value={asset.detail}
                onChange={(e) => patch(setAssets, i, { detail: e.target.value })}
              />
            </label>
          </RowShell>
        ))}
      </Panel>

      <Panel
        title="Work stages"
        hint="Seeded from the proposal timeline, then tracked by hand. Revising the proposal does not change these — they are what is actually happening."
        addLabel="Add a stage"
        onAdd={() =>
          setStages((rows) => [
            ...rows,
            { label: '', detail: '', status: 'pending' },
          ])
        }
      >
        {stages.map((stage, i) => (
          <RowShell
            key={i}
            removeLabel={`Remove ${stage.label || 'this stage'}`}
            onRemove={() => removeAt(setStages, i)}
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
              <label className="block">
                <Label>Stage</Label>
                <input
                  className={inputClass}
                  value={stage.label}
                  onChange={(e) => patch(setStages, i, { label: e.target.value })}
                />
              </label>
              <label className="block">
                <Label>Status</Label>
                <select
                  className={inputClass}
                  value={stage.status}
                  onChange={(e) =>
                    patch(setStages, i, {
                      status: e.target.value as WorkStage['status'],
                    })
                  }
                >
                  {STAGE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 block">
              <Label>What this stage delivers</Label>
              <textarea
                rows={2}
                className={inputClass}
                value={stage.detail}
                onChange={(e) => patch(setStages, i, { detail: e.target.value })}
              />
            </label>
          </RowShell>
        ))}
      </Panel>

      <Panel
        title="Payment schedule"
        hint="Starts at the standard 20 / 30 / 50 split, with amounts worked out from the proposal total. Edit the share to keep that, or type an exact amount to fix a rupee figure for a payment — the last one you touched wins for that row."
        addLabel="Add a payment"
        onAdd={() =>
          setMilestones((rows) => [
            ...rows,
            { label: '', percent: 0, status: 'pending', note: '', amount: null },
          ])
        }
      >
        {milestones.map((milestone, i) => (
          <RowShell
            key={i}
            removeLabel={`Remove ${milestone.label || 'this payment'}`}
            onRemove={() => removeAt(setMilestones, i)}
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
              <label className="block">
                <Label>Payment</Label>
                <input
                  className={inputClass}
                  value={milestone.label}
                  onChange={(e) =>
                    patch(setMilestones, i, { label: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <Label>Share of total</Label>
                <div className="flex items-stretch gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={inputClass}
                    value={milestone.percent}
                    onChange={(e) =>
                      // Editing the share puts the row back in derived mode —
                      // a stale rupee override would silently win otherwise.
                      patch(setMilestones, i, {
                        percent: Number(e.target.value),
                        amount: null,
                      })
                    }
                  />
                  <span className="inline-flex items-center text-[14px] font-semibold leading-none text-neutral-700">
                    %
                  </span>
                </div>
              </label>
              <label className="block">
                <Label>Exact amount</Label>
                <div className="flex items-stretch gap-2">
                  <span className="inline-flex items-center text-[14px] font-semibold leading-none text-neutral-700">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={milestone.amount ?? ''}
                    placeholder={
                      amountValues[i] === null ? 'e.g. 5000' : String(amountValues[i])
                    }
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      if (raw === '') {
                        patch(setMilestones, i, { amount: null });
                        return;
                      }
                      const amount = Math.max(0, Math.round(Number(raw) || 0));
                      // Keep the stored share in step with the typed figure so
                      // the "N%" the client reads beside it stays truthful.
                      // With a range total there is no figure to divide by, so
                      // the share is left alone.
                      patch(setMilestones, i, {
                        amount,
                        ...(totalValue !== null && totalValue > 0
                          ? {
                              percent: Math.min(
                                100,
                                Math.max(0, Math.round((amount / totalValue) * 100))
                              ),
                            }
                          : {}),
                      });
                    }}
                  />
                </div>
              </label>
              <label className="block">
                <Label>Status</Label>
                <select
                  className={inputClass}
                  value={milestone.status}
                  onChange={(e) =>
                    patch(setMilestones, i, {
                      status: e.target.value as Milestone['status'],
                    })
                  }
                >
                  {MILESTONE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {MILESTONE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 block">
              <Label>Note to the client</Label>
              <input
                className={inputClass}
                value={milestone.note}
                onChange={(e) => patch(setMilestones, i, { note: e.target.value })}
              />
            </label>
            <div className="mt-3 text-[13px] leading-[1.5] text-neutral-700">
              {amounts[i]
                ? `Client sees ${amounts[i]}${milestone.amount !== null ? ' — a fixed figure; the share follows it' : ''}, excluding GST.`
                : `The proposal total (${total}) is not a single figure, so the client sees the percentage only. Type an exact amount to show rupees.`}
            </div>
          </RowShell>
        ))}

        {/* With a real total the honest check is on rupees — mixing an exact
            figure into a percent split shifts what the rest must add up to.
            Only a pure percent split with no figure to check falls back to
            the percentage test. */}
        {milestones.length > 0 && totalValue !== null && amountSum !== totalValue ? (
          <p
            role="status"
            className="m-0 border-b border-neutral-300 bg-neutral-100 p-[18px] text-[13.5px] font-medium leading-[1.55] text-accent-700"
          >
            The payments add up to {formatInr(amountSum)}, not the{' '}
            {formatInr(totalValue)} total. The client will see a schedule that does
            not sum to the project price.
          </p>
        ) : milestones.length > 0 && totalValue === null && pureShares && claimed !== 100 ? (
          <p
            role="status"
            className="m-0 border-b border-neutral-300 bg-neutral-100 p-[18px] text-[13.5px] font-medium leading-[1.55] text-accent-700"
          >
            The percentages add up to {claimed}%, not 100%. The client will see
            shares that do not cover the whole project.
          </p>
        ) : null}
      </Panel>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[44px] items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
        >
          <Save size={15} aria-hidden="true" />
          {pending ? 'Saving…' : 'Save delivery details'}
        </button>
        {state.error ? (
          <span role="alert" className="text-[13.5px] font-medium leading-[1.45] text-accent-700">
            {state.error}
          </span>
        ) : state.savedAt ? (
          <span role="status" className="text-[13.5px] leading-[1.45] text-neutral-700">
            Saved. The client sees this now.
          </span>
        ) : null}
      </div>
    </form>
  );
}
