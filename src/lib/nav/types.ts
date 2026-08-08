export type NavItem = {
  href: string;
  label: string;
};

export type NavSection = {
  label?: string;
  items: NavItem[];
};
