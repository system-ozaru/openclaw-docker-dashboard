"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Broadcast", href: "/broadcast", icon: "broadcast" },
  { label: "Config", href: "/settings", icon: "config" },
];

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? "var(--accent)" : "var(--text-muted)";

  switch (icon) {
    case "dashboard":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "broadcast":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
          <circle cx="12" cy="12" r="2" />
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
          <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
        </svg>
      );
    case "config":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    default:
      return null;
  }
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const desktopSidebar = (
    <aside
      className="hidden md:flex fixed left-0 top-0 h-screen w-56 flex-col border-r z-30"
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
        <div>
          <div
            className="text-xs font-medium uppercase tracking-wider px-3 py-2"
            style={{ color: "var(--text-muted)" }}
          >
            Control
          </div>
          <div className="space-y-1">
            {navItems.slice(0, 2).map((item) => {
              const active = isActive(item.href);
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
                  <NavIcon icon={item.icon} active={active} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div>
          <div
            className="text-xs font-medium uppercase tracking-wider px-3 py-2"
            style={{ color: "var(--text-muted)" }}
          >
            Settings
          </div>
          <div className="space-y-1">
            {navItems.slice(2).map((item) => {
              const active = isActive(item.href);
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
                  <NavIcon icon={item.icon} active={active} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm cursor-pointer transition-colors"
          style={{
            color: "var(--text-muted)",
            background: "transparent",
            border: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--red)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <LogoutIcon />
          Sign Out
        </button>
        <div className="text-xs mt-2 px-3" style={{ color: "var(--text-muted)" }}>
          Fleet Control v1.8
        </div>
      </div>
    </aside>
  );

  const mobileBottomNav = (
    <>
      {/* More menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* More menu sheet */}
      {mobileMenuOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-2xl border-t"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: "var(--border-light)" }}
            />
          </div>
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">🦞</span>
              <div>
                <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                  OPENCLAW
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Fleet Control v1.8
                </div>
              </div>
            </div>
          </div>
          <div className="p-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm cursor-pointer"
              style={{
                color: "var(--red)",
                background: "var(--red-subtle)",
                border: "none",
              }}
            >
              <LogoutIcon />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t mobile-bottom-nav"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-stretch justify-around">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 flex-1 min-w-0 transition-colors"
                style={{
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  textDecoration: "none",
                }}
              >
                <NavIcon icon={item.icon} active={active} />
                <span className="text-[10px] font-medium leading-tight truncate w-full text-center">
                  {item.label}
                </span>
                {active && (
                  <div
                    className="w-1 h-1 rounded-full mt-0.5"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 flex-1 min-w-0 cursor-pointer"
            style={{
              color: mobileMenuOpen ? "var(--accent)" : "var(--text-muted)",
              background: "transparent",
              border: "none",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );

  return (
    <>
      {desktopSidebar}
      {mobileBottomNav}
    </>
  );
}
