import { Check } from 'lucide-react';

/** Checklist row — the prototype's ✓ entity, swapped for the Lucide icon
 * the design system specifies. */
export function CheckItem({
  children,
  className = '',
  tone = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'default' | 'onAccent';
}) {
  return (
    <li
      className={`grid grid-cols-[22px_minmax(0,1fr)] gap-2 border-t pt-2.5 text-[14.5px] leading-[1.5] ${
        tone === 'onAccent'
          ? 'border-white/35'
          : 'border-neutral-200 text-neutral-800'
      } ${className}`}
    >
      <Check
        size={15}
        strokeWidth={3}
        aria-hidden="true"
        className={`mt-[3px] ${tone === 'onAccent' ? 'text-white' : 'text-accent'}`}
      />
      <span>{children}</span>
    </li>
  );
}
