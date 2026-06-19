"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Crosshair, FileText, Radar, Settings } from "lucide-react";

const links = [
  { href: "/", label: "Overview", icon: BarChart3 },
  { href: "/clusters", label: "Opportunities", icon: Crosshair },
  { href: "/posts", label: "Source posts", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <Link className="brand" href="/">
        <span className="brand-mark"><Radar size={20} /></span>
        <span>PainPoint <strong>Radar</strong></span>
      </Link>
      <nav className="nav-list" aria-label="Main navigation">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link className={`nav-link ${active ? "active" : ""}`} href={href} key={href}>
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <span className="live-dot" />
        Research workspace
      </div>
    </aside>
  );
}
