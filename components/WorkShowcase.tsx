import { work, workSection, type WorkItem } from '@/content/work';
import { WorkCard } from './WorkCard';

/**
 * Live client sites, one under the next, each openable as a real running site
 * in a popup.
 *
 * Sits directly under the four pillars on Website Engineering: that block
 * claims performance, security, findability and scale, and this one hands the
 * visitor three live URLs to test the claim on. Stacked rather than tiled
 * because a 440px thumbnail of a website is a logo with a colour scheme — at
 * full width you can actually read the page you are being sold.
 *
 * The section shell stays a server component; only `WorkCard` is a client
 * component, because only the popup needs state. Everything a search engine or
 * an AI assistant reads — names, categories, scores, stack — is in the
 * server-rendered HTML either way.
 */
export function WorkShowcase({ items = work }: { items?: WorkItem[] }) {
  return (
    <section className="border-b-2 border-divider">
      <div className="mx-auto max-w-content px-gutter py-[clamp(64px,8vh,112px)]">
        <div className="mb-[clamp(36px,5vh,60px)] max-w-[62ch]">
          <div className="mb-[18px] text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
            {workSection.kicker}
          </div>
          <h2 className="m-0 mb-[18px] font-heading text-[clamp(30px,4vw,56px)] font-extrabold leading-[1.03] tracking-[-0.035em]">
            {workSection.title}
          </h2>
          <p className="m-0 text-[16px] leading-[1.6] text-neutral-800">
            {workSection.lead}
          </p>
        </div>

        <div className="grid gap-[clamp(32px,5vh,64px)]">
          {items.map((item, i) => (
            <WorkCard key={item.id} item={item} index={i} />
          ))}
        </div>

        <p className="m-0 mt-[clamp(28px,3.5vh,44px)] max-w-[78ch] text-[13.5px] leading-[1.55] text-neutral-700">
          {workSection.note}
        </p>
      </div>
    </section>
  );
}
