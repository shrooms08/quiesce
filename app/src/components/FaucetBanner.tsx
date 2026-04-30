"use client";

import { useState } from "react";
import { useUserPusdBalance } from "@/hooks/useUserPusdBalance";
import { useQuiesceProgram } from "@/hooks/useQuiesceProgram";

type Status = "idle" | "sending" | "sent" | "error";

export function FaucetBanner() {
  const { wallet } = useQuiesceProgram();
  const { balance, refresh } = useUserPusdBalance();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  if (!wallet?.address) return null;
  if (balance === null) return null; // still loading first balance read
  if (balance > 0n) return null;

  const handleClick = async () => {
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: wallet.address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data?.error ?? `Request failed (${res.status}).`);
        return;
      }
      setStatus("sent");
      // give devnet a beat to propagate before refetching
      setTimeout(() => refresh(), 1500);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const sending = status === "sending";
  const sent = status === "sent";

  return (
    <div
      style={{
        marginTop: 24,
        padding: 24,
        background: "var(--paper-2)",
        border: "1px solid var(--rule-2)",
        borderRadius: 4,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 24,
      }}
    >
      <div style={{ maxWidth: "62ch" }}>
        <div className="h-section" style={{ marginBottom: 8 }}>
          Funding required
        </div>
        <p
          className="body-sm"
          style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.55 }}
        >
          You&apos;ll need test PUSD to fund a vault. This is mock PUSD on Solana
          devnet — no real value. Click below to receive 1,000 PUSD.
        </p>
        {error && (
          <div
            className="meta"
            style={{ marginTop: 12, color: "var(--accent)" }}
          >
            {error}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <button
          className="btn"
          onClick={handleClick}
          disabled={sending || sent}
          style={{ opacity: sending || sent ? 0.6 : 1 }}
        >
          {sending
            ? "Sending…"
            : sent
            ? "Sent. Refreshing balance…"
            : "Get 1,000 PUSD"}
        </button>
      </div>
    </div>
  );
}
