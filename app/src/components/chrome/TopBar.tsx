"use client";

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

  const handleSignOut = async () => {
    await logout();
    router.push("/");
  };

  const handleLaunch = () => {
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
        <nav className="topnav">
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
      </div>
    </header>
  );
}
