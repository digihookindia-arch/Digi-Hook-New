import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** Internal tooling — never indexed, never in the sitemap. */
export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false, nocache: true },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[60vh]">{children}</div>;
}
