import {
  AUDIT_PAGE_CAP,
  CHECK_LABELS,
  diffAudits,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  type AuditIssue,
  type IssueSeverity,
} from '@/lib/seoAudit';
import { listAudits } from '@/lib/seoAudits';
import type { PortalProject } from '@/lib/portalProjects';

/**
 * The workspace's technical-audit report: the latest finished pass of our
 * own crawler, its findings grouped by check inside severity, and what
 * changed since the pass before — new and resolved are diffed on issue
 * fingerprints at render time, never stored.
 */

function displayDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const heading = (
  <h2 className="m-0 mb-5 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
    Technical site audit
  </h2>
);

function Note({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-2 border-text p-7">
      {heading}
      <p className="m-0 max-w-[58ch] text-[15px] leading-[1.65] text-neutral-800">{children}</p>
    </section>
  );
}

type CheckGroup = {
  check: string;
  severity: IssueSeverity;
  issues: AuditIssue[];
  newCount: number;
};

export async function AuditReportPanel({ project }: { project: PortalProject }) {
  const runs = await listAudits(project.id, 5);
  const running = runs.some((run) => run.status === 'running');
  const done = runs.filter((run) => run.status === 'done' && run.summary);
  const current = done[0] ?? null;
  const previous = done[1] ?? null;

  if (!current) {
    return (
      <Note>
        {running
          ? 'The first audit of your site is running right now — its report lands here in a few minutes.'
          : runs.length > 0
            ? 'Our crawler could not complete its last pass over your site. It retries automatically on the weekly schedule.'
            : 'Your first technical audit runs within the week — our own crawler reads your site the way a search engine does and reports everything worth fixing here.'}
      </Note>
    );
  }

  const summary = current.summary!;
  const diff = diffAudits(summary.issues, previous?.summary?.issues ?? null);
  const totalIssues = summary.counts.error + summary.counts.warning + summary.counts.notice;

  // One row per kind of finding, ordered by severity — a flood of the same
  // issue reads as one line with its pages, not a hundred lines.
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
    <section aria-labelledby="site-audit" className="border-2 border-text p-7">
      <h2
        id="site-audit"
        className="m-0 mb-6 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
      >
        Technical site audit
      </h2>

      <div className="mb-6 flex flex-wrap items-baseline gap-x-8 gap-y-3">
        <div>
          <span className="font-heading text-[clamp(26px,3vw,36px)] font-extrabold leading-none tracking-[-0.03em]">
            {summary.pages}
          </span>{' '}
          <span className="text-[14.5px] text-neutral-800">
            {summary.pages === 1 ? 'page' : 'pages'} checked
          </span>
        </div>
        {SEVERITY_ORDER.map((severity) => (
          <div key={severity}>
            <span className="font-heading text-[clamp(26px,3vw,36px)] font-extrabold leading-none tracking-[-0.03em]">
              {summary.counts[severity]}
            </span>{' '}
            <span className="text-[14.5px] text-neutral-800">
              {SEVERITY_LABELS[severity].toLowerCase()}
              {summary.counts[severity] === 1 ? '' : 's'}
            </span>
          </div>
        ))}
      </div>

      {previous ? (
        <p className="m-0 mb-6 text-[14px] leading-[1.6] text-neutral-800">
          Since the previous pass ({displayDate(previous.startedAt)}):{' '}
          <span className="font-semibold">{diff.newFingerprints.size} new</span>
          {' · '}
          <span className="font-semibold">{diff.resolvedCount} resolved</span>.
        </p>
      ) : null}

      {running ? (
        <p className="m-0 mb-6 text-[13.5px] leading-[1.6] text-neutral-700">
          A fresh audit is running right now — this report updates when it
          finishes.
        </p>
      ) : null}

      {totalIssues === 0 ? (
        <p className="m-0 text-[15px] leading-[1.65] text-neutral-800">
          A clean pass — nothing on your site needed flagging. We keep
          checking weekly.
        </p>
      ) : (
        <div className="border-t-2 border-text">
          {[...groups.values()].map((group) => (
            <div
              key={group.check}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5 border-b border-neutral-300 py-3.5"
            >
              <span className="min-w-[74px] text-[11.5px] font-bold uppercase leading-[1.4] tracking-[0.08em] text-accent-700">
                {SEVERITY_LABELS[group.severity]}
              </span>
              <span className="min-w-0 flex-[1_1_260px] text-[14.5px] leading-[1.5]">
                <span className="font-semibold">
                  {CHECK_LABELS[group.check] ?? group.check}
                </span>
                {group.newCount > 0 ? (
                  <span className="ml-2 inline-block whitespace-nowrap border-2 border-accent-600 px-1.5 py-0.5 align-[2px] text-[10.5px] font-bold uppercase leading-none tracking-[0.06em] text-accent-700">
                    {group.newCount} new
                  </span>
                ) : null}
                <span className="mt-0.5 block text-[13px] leading-[1.55] text-neutral-700">
                  {group.issues[0]?.detail}
                  {group.issues.length > 1
                    ? ` Also on ${group.issues
                        .slice(1, 3)
                        .map((i) => i.path)
                        .join(', ')}${group.issues.length > 3 ? ` and ${group.issues.length - 3} more` : ''}.`
                    : ''}
                </span>
              </span>
              <span className="text-[13px] font-semibold tabular-nums leading-none text-neutral-700">
                {group.issues.length === 1
                  ? group.issues[0]?.path
                  : `${group.issues.length} places`}
              </span>
            </div>
          ))}
        </div>
      )}

      {summary.truncated ? (
        <p className="m-0 mt-4 text-[13px] leading-[1.6] text-neutral-700">
          The counts above are complete; the detailed list stores the first{' '}
          {summary.issues.length} findings.
        </p>
      ) : null}
      {!summary.completed ? (
        <p className="m-0 mt-4 text-[13px] leading-[1.6] text-neutral-700">
          Your site is larger than one pass covers — each weekly pass checks up
          to {AUDIT_PAGE_CAP} pages.
        </p>
      ) : null}

      <p className="m-0 mt-5 text-[12.5px] leading-[1.6] text-neutral-700">
        Source: Digi Hook&apos;s own crawler · checked{' '}
        {displayDate(current.finishedAt ?? current.startedAt)} · runs weekly ·
        respects your robots.txt.
      </p>
    </section>
  );
}
