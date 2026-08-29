import {
  CHECK_LABELS,
  diffAudits,
  SEVERITY_LABELS,
  type AuditIssue,
  type IssueSeverity,
} from '@/lib/seoAudit';
import { listAudits } from '@/lib/seoAudits';

/**
 * The itemised audit findings — severity, check, pages, what changed since
 * the previous pass. Studio-only by explicit decision: clients see pillar
 * summaries on their SEO tab, never issue dumps on a site we built. This
 * is the working list behind those summaries.
 */

type CheckGroup = {
  check: string;
  severity: IssueSeverity;
  issues: AuditIssue[];
  newCount: number;
};

export async function AuditDetail({ projectId }: { projectId: string }) {
  const runs = await listAudits(projectId, 5);
  const done = runs.filter((run) => run.status === 'done' && run.summary);
  const current = done[0] ?? null;
  const previous = done[1] ?? null;
  if (!current) return null;

  const summary = current.summary!;
  const total = summary.counts.error + summary.counts.warning + summary.counts.notice;
  const diff = diffAudits(summary.issues, previous?.summary?.issues ?? null);

  const groups = new Map<string, CheckGroup>();
  for (const found of summary.issues) {
    const group = groups.get(found.check) ?? {
      check: found.check,
      severity: found.severity,
      issues: [],
      newCount: 0,
    };
    group.issues.push(found);
    if (diff.newFingerprints.has(found.fingerprint)) group.newCount++;
    groups.set(found.check, group);
  }

  return (
    <div>
      <h3 className="m-0 mb-3 font-heading text-[17px] font-bold leading-[1.2] tracking-[-0.02em]">
        Audit findings
        <span className="ml-3 align-middle text-[12px] font-semibold normal-case text-neutral-700">
          studio-only — the client sees pillar summaries
        </span>
      </h3>
      {previous ? (
        <p className="m-0 mb-3 text-[13px] leading-[1.6] text-neutral-700">
          Since the previous pass: {diff.newFingerprints.size} new · {diff.resolvedCount}{' '}
          resolved.
        </p>
      ) : null}
      {total === 0 ? (
        <p className="m-0 text-[14px] leading-[1.6] text-neutral-700">
          A clean pass — nothing flagged on {summary.pages} pages.
        </p>
      ) : (
        <div className="border-t-2 border-text">
          {[...groups.values()].map((group) => (
            <div
              key={group.check}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5 border-b border-neutral-300 py-3"
            >
              <span className="min-w-[70px] text-[11px] font-bold uppercase leading-[1.4] tracking-[0.08em] text-accent-700">
                {SEVERITY_LABELS[group.severity]}
              </span>
              <span className="min-w-0 flex-[1_1_260px] text-[13.5px] leading-[1.5]">
                <span className="font-semibold">{CHECK_LABELS[group.check] ?? group.check}</span>
                {group.newCount > 0 ? (
                  <span className="ml-2 inline-block whitespace-nowrap border-2 border-accent-600 px-1.5 py-0.5 align-[2px] text-[10px] font-bold uppercase leading-none tracking-[0.06em] text-accent-700">
                    {group.newCount} new
                  </span>
                ) : null}
                <span className="mt-0.5 block text-[12.5px] leading-[1.55] text-neutral-700">
                  {group.issues[0]?.detail}{' '}
                  {group.issues.length > 1
                    ? `Also: ${group.issues
                        .slice(1, 4)
                        .map((i) => i.path)
                        .join(', ')}${group.issues.length > 4 ? ` and ${group.issues.length - 4} more` : ''}.`
                    : ''}
                </span>
              </span>
              <span className="text-[12.5px] font-semibold tabular-nums leading-none text-neutral-700">
                {group.issues.length === 1 ? group.issues[0]?.path : `${group.issues.length} places`}
              </span>
            </div>
          ))}
        </div>
      )}
      {summary.truncated ? (
        <p className="m-0 mt-3 text-[12.5px] leading-[1.6] text-neutral-700">
          Counts are complete; the stored list holds the first {summary.issues.length} findings.
        </p>
      ) : null}
    </div>
  );
}
