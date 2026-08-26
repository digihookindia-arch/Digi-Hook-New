import { formatInr } from '@/lib/delivery';
import { balanceInr, type PortalProject } from '@/lib/portalProjects';

/**
 * The simple payment summary the studio maintains from the dashboard: total,
 * paid, balance. Renders nothing until a total is set — an empty money panel
 * would read as "you owe us ₹0", which is worse than silence.
 */
export function PaymentSummary({ project }: { project: PortalProject }) {
  const balance = balanceInr(project);
  if (project.totalInr === null || balance === null) return null;

  const settled = balance === 0;

  return (
    <section aria-labelledby="payments-heading" className="border-2 border-text p-7">
      <h2
        id="payments-heading"
        className="m-0 mb-5 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
      >
        Payments
      </h2>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-x-8 gap-y-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-700">
            Project total
          </div>
          <div className="font-heading text-[22px] font-extrabold leading-none tracking-[-0.02em]">
            {formatInr(project.totalInr)}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-700">
            Paid so far
          </div>
          <div className="font-heading text-[22px] font-extrabold leading-none tracking-[-0.02em]">
            {formatInr(project.paidInr)}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-700">
            Balance due
          </div>
          <div
            className={`font-heading text-[22px] font-extrabold leading-none tracking-[-0.02em] ${
              settled ? 'text-neutral-700' : 'text-accent-700'
            }`}
          >
            {formatInr(balance)}
          </div>
        </div>
      </div>

      <p className="m-0 mt-5 text-[13.5px] leading-[1.6] text-neutral-700">
        {settled
          ? 'All settled — nothing is due.'
          : 'Figures exclude GST where it applies. Invoices arrive by email as each payment falls due.'}
      </p>
    </section>
  );
}
