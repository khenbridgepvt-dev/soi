'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { NavSection } from '@/lib/nav/types';

type SidebarProps = {
  sections: NavSection[];
  activeHref?: string;
};

function isNavItemActive(resolvedActive: string, href: string): boolean {
  return resolvedActive === href || resolvedActive.startsWith(`${href}/`);
}

export default function Sidebar({ sections, activeHref }: SidebarProps) {
  const pathname = usePathname();
  const resolvedActive = activeHref ?? pathname;

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-surface">
      <nav className="flex flex-col gap-4 p-3" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.label ?? 'default'} className="flex flex-col gap-1">
            {section.label ? (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                {section.label}
              </p>
            ) : null}
            {section.items.map((item) => {
              const isActive = isNavItemActive(resolvedActive, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-l-[3px] border-brand bg-page pl-[9px] text-text'
                      : 'border-l-[3px] border-transparent text-text-secondary hover:bg-page hover:text-text'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
