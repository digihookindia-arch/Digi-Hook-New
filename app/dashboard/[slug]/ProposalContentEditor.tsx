'use client';

import { useActionState, useState } from 'react';
import { Save } from 'lucide-react';
import type {
  AnnexureTable,
  ProposalContent,
  ProposalLine,
  ProposalPhase,
  ProposalPrice,
  ProposalSection,
  TechChoice,
} from '@/lib/proposals';
import { saveProposalContentAction, type ContentState } from '../actions';
import { Label, Panel, RowShell, inputClass } from './EditorKit';

/**
 * The manual, no-AI alternative to ReviseForm. Two things send people here
 * rather than to Revise: the payment split, which Claude is instructed to
 * never state because the client-facing schedule renders from `milestones`
 * (see DeliveryEditor) and would drift from any split written into the
 * document; and small, exact edits, where typing the change is faster than
 * describing it to a model and waiting.
 *
 * Same shape as DeliveryEditor: everything lives in React state, posted as one
 * JSON payload, and re-validated row by row on the server — this is a
 * convenience for whoever is typing, never the thing that is trusted.
 */

const textareaClass = `${inputClass} resize-y`;

export function ProposalContentEditor({
  slug,
  initialContent,
}: {
  slug: string;
  initialContent: ProposalContent;
}) {
  const [title, setTitle] = useState(initialContent.title);
  const [summary, setSummary] = useState(initialContent.summary);
  const [sections, setSections] = useState<ProposalSection[]>(
    initialContent.sections.map((s) => ({ ...s, bullets: s.bullets ? [...s.bullets] : [] }))
  );
  const [scope, setScope] = useState<ProposalLine[]>(initialContent.scope);
  const [timeline, setTimeline] = useState<ProposalPhase[]>(initialContent.timeline);
  const [pricing, setPricing] = useState<ProposalPrice[]>(initialContent.pricing);
  const [total, setTotal] = useState(initialContent.total);
  const [terms, setTerms] = useState<string[]>(initialContent.terms);
  const [techSummary, setTechSummary] = useState(initialContent.technology?.summary ?? '');
  const [techStack, setTechStack] = useState<TechChoice[]>(
    initialContent.technology?.stack ?? []
  );
  const [annexure, setAnnexure] = useState<AnnexureTable[]>(
    (initialContent.annexure ?? []).map((t) => ({ ...t, rows: [...t.rows] }))
  );
  const [support, setSupport] = useState(initialContent.support ?? '');

  const [state, action, pending] = useActionState(
    saveProposalContentAction,
    {} as ContentState
  );

  function patch<T>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    index: number,
    changes: Partial<T>
  ) {
    setter((rows) => rows.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  }

  function removeAt<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) {
    setter((rows) => rows.filter((_, i) => i !== index));
  }

  function patchBullet(sectionIndex: number, bulletIndex: number, value: string) {
    setSections((rows) =>
      rows.map((row, i) => {
        if (i !== sectionIndex) return row;
        const bullets = [...(row.bullets ?? [])];
        bullets[bulletIndex] = value;
        return { ...row, bullets };
      })
    );
  }

  function addBullet(sectionIndex: number) {
    setSections((rows) =>
      rows.map((row, i) =>
        i === sectionIndex ? { ...row, bullets: [...(row.bullets ?? []), ''] } : row
      )
    );
  }

  function removeBullet(sectionIndex: number, bulletIndex: number) {
    setSections((rows) =>
      rows.map((row, i) =>
        i === sectionIndex
          ? { ...row, bullets: (row.bullets ?? []).filter((_, bi) => bi !== bulletIndex) }
          : row
      )
    );
  }

  function patchTerm(index: number, value: string) {
    setTerms((rows) => rows.map((row, i) => (i === index ? value : row)));
  }

  function patchTable(tableIndex: number, changes: Partial<AnnexureTable>) {
    setAnnexure((rows) =>
      rows.map((row, i) => (i === tableIndex ? { ...row, ...changes } : row))
    );
  }

  function addTableRow(tableIndex: number) {
    setAnnexure((rows) =>
      rows.map((row, i) =>
        i === tableIndex
          ? { ...row, rows: [...row.rows, { feature: '', what: '', why: '' }] }
          : row
      )
    );
  }

  function patchTableRow(
    tableIndex: number,
    rowIndex: number,
    changes: Partial<AnnexureTable['rows'][number]>
  ) {
    setAnnexure((rows) =>
      rows.map((row, i) =>
        i === tableIndex
          ? {
              ...row,
              rows: row.rows.map((r, ri) => (ri === rowIndex ? { ...r, ...changes } : r)),
            }
          : row
      )
    );
  }

  function removeTableRow(tableIndex: number, rowIndex: number) {
    setAnnexure((rows) =>
      rows.map((row, i) =>
        i === tableIndex ? { ...row, rows: row.rows.filter((_, ri) => ri !== rowIndex) } : row
      )
    );
  }

  const payload = {
    title,
    summary,
    sections,
    scope,
    timeline,
    pricing,
    total,
    terms,
    technology: { summary: techSummary, stack: techStack },
    annexure,
    support,
  };

  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="content" value={JSON.stringify(payload)} />

      <div className="mb-7 border-2 border-text">
        <div className="bg-text px-[18px] py-3.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-bg">
          Title, summary and total
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4 p-[18px]">
          <label className="block">
            <Label>Title</Label>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <Label>Total (as shown to the client)</Label>
            <input className={inputClass} value={total} onChange={(e) => setTotal(e.target.value)} />
          </label>
        </div>
        <label className="block border-t border-neutral-300 p-[18px]">
          <Label>Summary</Label>
          <textarea
            rows={3}
            className={textareaClass}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </label>
      </div>

      <Panel
        title="Sections"
        hint="The explanatory blocks: understanding, approach, what we need from them."
        addLabel="Add a section"
        onAdd={() => setSections((rows) => [...rows, { heading: '', body: '', bullets: [] }])}
      >
        {sections.map((section, i) => (
          <RowShell
            key={i}
            removeLabel={`Remove ${section.heading || 'this section'}`}
            onRemove={() => removeAt(setSections, i)}
          >
            <label className="block">
              <Label>Heading</Label>
              <input
                className={inputClass}
                value={section.heading}
                onChange={(e) => patch(setSections, i, { heading: e.target.value })}
              />
            </label>
            <label className="mt-4 block">
              <Label>Body</Label>
              <textarea
                rows={3}
                className={textareaClass}
                value={section.body}
                onChange={(e) => patch(setSections, i, { body: e.target.value })}
              />
            </label>
            <div className="mt-4">
              <Label>Bullets</Label>
              {(section.bullets ?? []).map((bullet, bi) => (
                <div key={bi} className="mb-2 flex items-center gap-2">
                  <input
                    className={inputClass}
                    value={bullet}
                    onChange={(e) => patchBullet(i, bi, e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label="Remove bullet"
                    onClick={() => removeBullet(i, bi)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 border-neutral-400 text-neutral-700 transition-colors hover:border-accent-700 hover:text-accent-700"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addBullet(i)}
                className="mt-1 text-[12.5px] font-semibold uppercase leading-none tracking-[0.08em] text-accent-700"
              >
                + Add bullet
              </button>
            </div>
          </RowShell>
        ))}
      </Panel>

      <Panel
        title="What is included"
        hint="The scope table."
        addLabel="Add a line"
        onAdd={() => setScope((rows) => [...rows, { item: '', detail: '' }])}
      >
        {scope.map((line, i) => (
          <RowShell key={i} removeLabel={`Remove ${line.item || 'this line'}`} onRemove={() => removeAt(setScope, i)}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
              <label className="block">
                <Label>Item</Label>
                <input className={inputClass} value={line.item} onChange={(e) => patch(setScope, i, { item: e.target.value })} />
              </label>
              <label className="block">
                <Label>Detail</Label>
                <input className={inputClass} value={line.detail} onChange={(e) => patch(setScope, i, { detail: e.target.value })} />
              </label>
            </div>
          </RowShell>
        ))}
      </Panel>

      <Panel
        title="How we will work"
        hint="The timeline phases."
        addLabel="Add a phase"
        onAdd={() => setTimeline((rows) => [...rows, { phase: '', duration: '', deliverable: '' }])}
      >
        {timeline.map((phase, i) => (
          <RowShell key={i} removeLabel={`Remove ${phase.phase || 'this phase'}`} onRemove={() => removeAt(setTimeline, i)}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
              <label className="block">
                <Label>Phase</Label>
                <input className={inputClass} value={phase.phase} onChange={(e) => patch(setTimeline, i, { phase: e.target.value })} />
              </label>
              <label className="block">
                <Label>Duration</Label>
                <input className={inputClass} value={phase.duration} onChange={(e) => patch(setTimeline, i, { duration: e.target.value })} />
              </label>
            </div>
            <label className="mt-4 block">
              <Label>Deliverable</Label>
              <textarea
                rows={2}
                className={textareaClass}
                value={phase.deliverable}
                onChange={(e) => patch(setTimeline, i, { deliverable: e.target.value })}
              />
            </label>
          </RowShell>
        ))}
      </Panel>

      <Panel
        title="Cost"
        hint="Itemised pricing. The total above is what the client sees as the bottom line — keep the lines summing to it."
        addLabel="Add a line"
        onAdd={() => setPricing((rows) => [...rows, { item: '', amount: '', note: '' }])}
      >
        {pricing.map((line, i) => (
          <RowShell key={i} removeLabel={`Remove ${line.item || 'this line'}`} onRemove={() => removeAt(setPricing, i)}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
              <label className="block">
                <Label>Item</Label>
                <input className={inputClass} value={line.item} onChange={(e) => patch(setPricing, i, { item: e.target.value })} />
              </label>
              <label className="block">
                <Label>Amount</Label>
                <input className={inputClass} value={line.amount} onChange={(e) => patch(setPricing, i, { amount: e.target.value })} />
              </label>
            </div>
            <label className="mt-4 block">
              <Label>Note (optional)</Label>
              <input className={inputClass} value={line.note ?? ''} onChange={(e) => patch(setPricing, i, { note: e.target.value })} />
            </label>
          </RowShell>
        ))}
      </Panel>

      <Panel
        title="Terms"
        hint="One line per term. Never state a payment split here — the payment schedule under Delivery below is what the client actually agrees to."
        addLabel="Add a term"
        onAdd={() => setTerms((rows) => [...rows, ''])}
      >
        {terms.map((term, i) => (
          <RowShell key={i} removeLabel="Remove this term" onRemove={() => removeAt(setTerms, i)}>
            <input className={inputClass} value={term} onChange={(e) => patchTerm(i, e.target.value)} />
          </RowShell>
        ))}
      </Panel>

      <div className="mb-7 border-2 border-text">
        <div className="bg-text px-[18px] py-3.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-bg">
          Technology (optional)
        </div>
        <p className="m-0 border-b border-neutral-300 p-[18px] text-[13.5px] leading-[1.55] text-neutral-700">
          Leave the summary blank and remove every row to drop this section from the document entirely.
        </p>
        <label className="block border-b border-neutral-300 p-[18px]">
          <Label>Summary</Label>
          <textarea rows={2} className={textareaClass} value={techSummary} onChange={(e) => setTechSummary(e.target.value)} />
        </label>
        {techStack.map((t, i) => (
          <RowShell key={i} removeLabel={`Remove ${t.name || 'this technology'}`} onRemove={() => removeAt(setTechStack, i)}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
              <label className="block">
                <Label>Name</Label>
                <input className={inputClass} value={t.name} onChange={(e) => patch(setTechStack, i, { name: e.target.value })} />
              </label>
              <label className="block">
                <Label>Role</Label>
                <input className={inputClass} value={t.role} onChange={(e) => patch(setTechStack, i, { role: e.target.value })} />
              </label>
            </div>
            <label className="mt-4 block">
              <Label>What it means for you</Label>
              <textarea rows={2} className={textareaClass} value={t.why} onChange={(e) => patch(setTechStack, i, { why: e.target.value })} />
            </label>
          </RowShell>
        ))}
        <div className="p-[18px]">
          <button
            type="button"
            onClick={() => setTechStack((rows) => [...rows, { name: '', role: '', why: '' }])}
            className="inline-flex min-h-[44px] items-center gap-2 border-2 border-text px-4 text-[13.5px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
          >
            Add a technology
          </button>
        </div>
      </div>

      <div className="mb-7 border-2 border-text">
        <div className="bg-text px-[18px] py-3.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-bg">
          Technical annexure (optional)
        </div>
        <p className="m-0 border-b border-neutral-300 p-[18px] text-[13.5px] leading-[1.55] text-neutral-700">
          Tables of feature / what it is / why it matters. Remove every table to drop the section.
        </p>
        {annexure.map((tableItem, ti) => (
          <div key={ti} className="border-b border-neutral-300 p-[18px]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <input
                className={inputClass}
                placeholder="Table title"
                value={tableItem.title}
                onChange={(e) => patchTable(ti, { title: e.target.value })}
              />
              <button
                type="button"
                aria-label={`Remove ${tableItem.title || 'this table'}`}
                onClick={() => removeAt(setAnnexure, ti)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 border-neutral-400 text-neutral-700 transition-colors hover:border-accent-700 hover:text-accent-700"
              >
                &times;
              </button>
            </div>
            <label className="mb-4 block">
              <Label>Note (optional)</Label>
              <input
                className={inputClass}
                value={tableItem.note ?? ''}
                onChange={(e) => patchTable(ti, { note: e.target.value })}
              />
            </label>
            {tableItem.rows.map((rowItem, ri) => (
              <div key={ri} className="mb-3 border border-neutral-300 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label>Row {ri + 1}</Label>
                  <button
                    type="button"
                    aria-label="Remove this row"
                    onClick={() => removeTableRow(ti, ri)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-neutral-400 text-neutral-700 transition-colors hover:border-accent-700 hover:text-accent-700"
                  >
                    &times;
                  </button>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3">
                  <input
                    className={inputClass}
                    placeholder="Feature"
                    value={rowItem.feature}
                    onChange={(e) => patchTableRow(ti, ri, { feature: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="What it is"
                    value={rowItem.what}
                    onChange={(e) => patchTableRow(ti, ri, { what: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="Why it matters"
                    value={rowItem.why}
                    onChange={(e) => patchTableRow(ti, ri, { why: e.target.value })}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addTableRow(ti)}
              className="text-[12.5px] font-semibold uppercase leading-none tracking-[0.08em] text-accent-700"
            >
              + Add row
            </button>
          </div>
        ))}
        <div className="p-[18px]">
          <button
            type="button"
            onClick={() => setAnnexure((rows) => [...rows, { title: '', note: '', rows: [] }])}
            className="inline-flex min-h-[44px] items-center gap-2 border-2 border-text px-4 text-[13.5px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
          >
            Add a table
          </button>
        </div>
      </div>

      <label className="mb-7 block border-2 border-text p-[18px]">
        <span className="mb-2 block text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-neutral-700">
          Support and maintenance (optional)
        </span>
        <textarea rows={3} className={textareaClass} value={support} onChange={(e) => setSupport(e.target.value)} />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[44px] items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
        >
          <Save size={15} aria-hidden="true" />
          {pending ? 'Saving…' : 'Save changes'}
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
