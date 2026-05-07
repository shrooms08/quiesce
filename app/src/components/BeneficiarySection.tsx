"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useQuiesceProgram } from "@/hooks/useQuiesceProgram";
import { useBeneficiaryVaults } from "@/hooks/useBeneficiaryVaults";
import type { OnChainVault } from "@/hooks/useUserVaults";
import { fmtUSD, truncateAddress } from "@/lib/format";
import { MOCK_PUSD_DECIMALS } from "@/lib/constants";

const PUSD_SCALE = 10 ** MOCK_PUSD_DECIMALS;

function isTriggered(v: OnChainVault, nowSec: number): boolean {
  if (v.status !== "active") return false;
  const expiry = Number(v.lastHeartbeat) + Number(v.heartbeatInterval);
  return nowSec > expiry;
}

export function BeneficiarySection() {
  const { authenticated } = usePrivy();
  const { wallet } = useQuiesceProgram();
  const { vaults, isLoading } = useBeneficiaryVaults();

  // Hide the entire section pre-auth so a logged-out homepage doesn't show
  // "No vaults currently name this wallet" — confusing for someone who hasn't
  // even signed in.
  if (!authenticated || !wallet?.address) return null;

  // Only actionable vaults appear here. Claimed and cancelled are settled —
  // they belong in a future "history" view, not the beneficiary inbox.
  const active = vaults.filter((v) => v.status === "active");

  return (
    <section style={{ marginTop: 64 }}>
      <div className="h-section" style={{ marginBottom: 18 }}>
        Vaults naming you as beneficiary
      </div>

      {isLoading && active.length === 0 ? (
        <div className="meta" style={{ padding: "12px 0" }}>
          Querying Solana devnet…
        </div>
      ) : active.length === 0 ? (
        <div
          className="body-sm"
          style={{ color: "var(--ink-3)", padding: "12px 0" }}
        >
          No vaults currently name this wallet as beneficiary.
        </div>
      ) : (
        <div style={{ borderTop: "1px solid var(--rule)" }}>
          {active.map((v) => (
            <BeneficiaryRow
              key={v.publicKey.toBase58()}
              vault={v}
            />
          ))}
        </div>
      )}

      {active.length > 0 && (
        <div className="meta" style={{ marginTop: 16, color: "var(--ink-3)" }}>
          Claimed and cancelled vaults are not shown.
        </div>
      )}
    </section>
  );
}

function BeneficiaryRow({ vault }: { vault: OnChainVault }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const nowSec = Math.floor(Date.now() / 1000);
  const triggered = isTriggered(vault, nowSec);
  const amountPusd = Number(vault.amount) / PUSD_SCALE;
  const ownerStr = vault.owner.toBase58();
  const pda = vault.publicKey.toBase58();
  const displayName = vault.name || `Vault #${vault.vaultId.toString()}`;

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(ownerStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // copy unavailable — user can still read the address from the vault page
    }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/vaults/${pda}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/vaults/${pda}`);
      }}
      style={{
        cursor: "pointer",
        padding: "20px 0",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 16, color: "var(--ink)" }}>{displayName}</div>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: triggered ? "var(--accent)" : "var(--ink-3)",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {triggered ? "Triggered" : "Active"}
        </span>
      </div>
      <div
        className="meta"
        style={{
          marginTop: 6,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span className="tnum" style={{ color: "var(--ink-2)" }}>
          {fmtUSD(amountPusd)} PUSD
        </span>
        <span aria-hidden>·</span>
        <span>from</span>
        <span className="addr" style={{ color: "var(--ink-2)" }}>
          {truncateAddress(ownerStr)}
        </span>
        <button
          onClick={handleCopy}
          aria-label="Copy owner address"
          style={{
            background: "transparent",
            border: "none",
            padding: "0 4px",
            cursor: "pointer",
            font: "inherit",
            color: copied ? "var(--accent)" : "var(--ink-3)",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </div>
  );
}
