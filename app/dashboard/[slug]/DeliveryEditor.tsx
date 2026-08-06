'use client';

import { useActionState, useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import {
  ASSET_LABELS,
  ASSET_STATUSES,
  MILESTONE_LABELS,
  MILESTONE_STATUSES,
  STAGE_LABELS,
  STAGE_STATUSES,
  milestoneAmounts,
  totalPercent,
  type AssetItem,
  type Milestone,
  type WorkStage,
} from '@/lib/delivery';
import { saveDeliveryAction, type DeliveryState } from '../actions';

/**
 * Studio-side editing for the client's /assets and /status tabs.
 *
 * The three lists are held in React state and posted as one JSON payload, which
 * the server re-validates row by row — the shapes here are a convenience for
 * whoever is typing, never the thing that is trusted.
 */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-neutral-700">
      {children}
    </span>
  );
}

const inputClass =
  'w-full border-2 border-neutral-400 bg-bg p-2.5 text-[14px] leading-[1.4] text-text';

function RowShell({
  children,
  onRemove,
  removeLabel,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="relative border-b border-neutral-300 p-[18px] pr-[58px]">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute right-[14px] top-[14px] inline-flex h-6 w-6 items-center justify-center border-2 border-neutral-400 text-neutral-700 transition-colors hover:border-accent-700 hover:text-accent-700"
      >
        <X size={13} strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  );
}

function Panel({
  title,
  hint,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  hint: string;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7 border-2 border-text">
      <div className="bg-text px-[18px] py-3.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-bg">
        {title}
      </div>
      <p className="m-0 border-b border-neutral-300 p-[18px] text-[13.5px] leading-[1.55] text-neutral-700">
        {hint}
      </p>
      {children}
      <div className="p-[18px]">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex min-h-[44px] items-center gap-2 border-2 border-text px-4 text-[13.5px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
        >
          <Plus size={14} strokeWidth={3} aria-hidden="true" />
          {addLabel}
        </button>
      </div>
    </div>
  );
}

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
  const amounts = milestoneAmounts(total, milestones);

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
        hint="Starts at the standard 20 / 30 / 50 split. Amounts are worked out from the proposal total, so edit the percentages, not the rupees."
        addLabel="Add a payment"
        onAdd={() =>
          setMilestones((rows) => [
            ...rows,
            { label: '', percent: 0, status: 'pending', note: '' },
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
                      patch(setMilestones, i, {
                        percent: Number(e.target.value),
                      })
                    }
                  />
                  <span className="inline-flex items-center text-[14px] font-semibold leading-none text-neutral-700">
                    %
                  </span>
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
                ? `Client sees ${amounts[i]}, excluding GST.`
                : `The proposal total (${total}) is not a single figure, so the client sees the percentage only.`}
            </div>
          </RowShell>
        ))}

        {milestones.length > 0 && claimed !== 100 ? (
          <p
            role="status"
            className="m-0 border-b border-neutral-300 bg-neutral-100 p-[18px] text-[13.5px] font-medium leading-[1.55] text-accent-700"
          >
            The percentages add up to {claimed}%, not 100%. The client will see
            amounts that do not sum to the project total.
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
