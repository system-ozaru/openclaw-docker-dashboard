"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections = [
  {
    title: "Control",
    items: [
      { label: "Dashboard", href: "/", icon: "◉" },
      { label: "Broadcast", href: "/broadcast", icon: "📡" },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Config", href: "/settings", icon: "⚙" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-56 flex flex-col border-r"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
    >
      <div className="p-4 pb-6 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🦞</span>
          <div>
            <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              OPENCLAW
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              FLEET CONTROL
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <div
              className="text-xs font-medium uppercase tracking-wider px-3 py-2"
              style={{ color: "var(--text-muted)" }}
            >
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors"
                    style={{
                      background: active ? "var(--accent-subtle)" : "transparent",
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  >
                    <span className="text-xs">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 text-xs" style={{ color: "var(--text-muted)" }}>
        Fleet Control v1.5
      </div>
    </aside>
  );
}
