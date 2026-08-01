import Link from 'next/link';

type NavItem = {
  href: string;
  label: string;
};

type SidebarProps = {
  items: NavItem[];
  activeHref: string;
};

export default function Sidebar({ items, activeHref }: SidebarProps) {
  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-surface">
      <nav className="flex flex-col gap-1 p-3" aria-label="Main navigation">
        {items.map((item) => {
          const isActive =
            activeHref === item.href ||
            activeHref.startsWith(`${item.href}/`);

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
      </nav>
    </aside>
  );
}
