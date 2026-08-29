import { checkSite } from '@/lib/siteHealth';

/**
 * "Is my website up?" — the first question the spec's ten-second test asks.
 * Renders nothing without a site URL; an unreachable check says so honestly
 * instead of guessing.
 */
export async function WebsiteStatusCard({ siteUrl }: { siteUrl: string }) {
  const health = await checkSite(siteUrl);
  const host = new URL(siteUrl).hostname;

  const tone =
    health.state === 'operational'
      ? 'border-accent-600 bg-accent-600 text-white'
      : health.state === 'problem'
        ? 'border-accent-600 text-accent-700'
        : 'border-neutral-400 text-neutral-700';
  const label =
    health.state === 'operational'
      ? 'Operating normally'
      : health.state === 'problem'
        ? 'Issue detected'
        : 'Status unavailable';

  return (
    <section aria-labelledby="site-status-heading" className="border-2 border-text p-7">
      <h2
        id="site-status-heading"
        className="m-0 mb-5 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
      >
        Your website
      </h2>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center border px-2.5 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] ${tone}`}
        >
          {label}
        </span>
        <a
          href={siteUrl}
          target="_blank"
          rel="noreferrer"
          className="font-heading text-[17px] font-bold leading-none tracking-[-0.02em] text-text transition-colors hover:text-accent-700"
        >
          {host}
        </a>
      </div>

      <p className="m-0 text-[13.5px] leading-[1.6] text-neutral-700">
        {health.responseMs !== null
          ? `Responded in ${(health.responseMs / 1000).toFixed(1)}s. `
          : health.state === 'problem'
            ? 'The site did not respond to our check. We have eyes on it — no action needed from you. '
            : 'We could not run a check just now. '}
        {health.sslDaysLeft !== null
          ? health.sslDaysLeft > 14
            ? `Security certificate valid for ${health.sslDaysLeft} more days (renews automatically).`
            : `Security certificate renews within ${health.sslDaysLeft} days.`
          : ''}
      </p>
      <p className="m-0 mt-2 text-[12px] leading-none text-neutral-500">
        Checked{' '}
        {new Date(health.checkedAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        })}{' '}
        IST
      </p>
    </section>
  );
}
