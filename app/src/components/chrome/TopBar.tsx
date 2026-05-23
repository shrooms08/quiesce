"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { Wordmark } from "./Wordmark";
import { truncateAddress } from "@/lib/format";

type Mode = "marketing" | "app";

const NAV_MARKETING = [
  { id: "landing", label: "Protocol", href: "/" },
  { id: "docs", label: "Docs", href: "#" },
];

const NAV_APP = [
  { id: "dashboard", label: "Vaults", href: "/dashboard" },
  { id: "activity", label: "Activity", href: "#" },
  { id: "agent", label: "Agent", href: "/agent" },
  { id: "docs", label: "Docs", href: "#" },
];

export function TopBar({ mode }: { mode: Mode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, login, authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();
  const address = wallets[0]?.address;

  const items = mode === "marketing" ? NAV_MARKETING : NAV_APP;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Close the sheet whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await logout();
    router.push("/");
  };

  const handleLaunch = () => {
    setMenuOpen(false);
    if (authenticated) {
      router.push("/dashboard");
    } else {
      login();
    }
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <Wordmark />
          {mode === "app" && address && (
            <span
              className="meta"
              style={{ color: "var(--ink-3)", letterSpacing: "0.04em" }}
            >
              · {truncateAddress(address)}
            </span>
          )}
        </div>

        {/* Desktop nav — inline, hidden under 640px */}
        <nav className="topnav topnav-desktop">
          {items.map((it) => (
            <Link
              key={it.id}
              href={it.href}
              className={isActive(it.href) ? "active" : ""}
            >
              {it.label}
            </Link>
          ))}
          {mode === "marketing" ? (
            <button className="btn btn-sm" onClick={handleLaunch}>
              Launch app
            </button>
          ) : (
            <button
              className="btn-quiet"
              style={{ fontSize: 13.5 }}
              onClick={handleSignOut}
            >
              Sign out
            </button>
          )}
        </nav>

        {/* Mobile menu — hamburger + dropdown, hidden ≥640px */}
        <div className="topnav-mobile" ref={menuRef}>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              background: "transparent",
              border: "none",
              padding: 8,
              margin: "-8px -8px -8px 0",
              cursor: "pointer",
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
              {menuOpen ? (
                <>
                  <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: "100%",
                right: 12,
                marginTop: 6,
                minWidth: 200,
                background: "var(--paper)",
                border: "1px solid var(--rule-2)",
                borderRadius: 4,
                boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
                padding: "8px 0",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {items.map((it) => (
                <Link
                  key={it.id}
                  href={it.href}
                  onClick={() => setMenuOpen(false)}
                  className={isActive(it.href) ? "active" : ""}
                  style={{
                    padding: "10px 16px",
                    fontSize: 14,
                    color: isActive(it.href) ? "var(--ink)" : "var(--ink-2)",
                    textDecoration: "none",
                  }}
                  role="menuitem"
                >
                  {it.label}
                </Link>
              ))}
              <div
                style={{
                  height: 1,
                  background: "var(--rule)",
                  margin: "6px 0",
                }}
              />
              {mode === "marketing" ? (
                <button
                  onClick={handleLaunch}
                  style={{
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    padding: "10px 16px",
                    fontSize: 14,
                    color: "var(--ink)",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                  role="menuitem"
                >
                  Launch app
                </button>
              ) : (
                <button
                  onClick={handleSignOut}
                  style={{
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    padding: "10px 16px",
                    fontSize: 14,
                    color: "var(--ink-2)",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                  role="menuitem"
                >
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
