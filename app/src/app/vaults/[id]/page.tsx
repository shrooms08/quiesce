"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { TopBar } from "@/components/chrome/TopBar";
import { BackLink } from "@/components/chrome/BackLink";
import { Pip } from "@/components/chrome/Pip";
import { fmtUSD, truncateAddress } from "@/lib/format";
import { MOCK_PUSD_DECIMALS, MOCK_PUSD_MINT } from "@/lib/constants";
import { useQuiesceProgram } from "@/hooks/useQuiesceProgram";
import { useVault } from "@/hooks/useVault";
import { useUserPusdBalance } from "@/hooks/useUserPusdBalance";
import type { OnChainVault } from "@/hooks/useUserVaults";
import { buildHeartbeatTx } from "@/lib/transactions/heartbeat";
import { buildCancelTx } from "@/lib/transactions/cancel";
import { buildClaimTx } from "@/lib/transactions/claim";

const PUSD_SCALE = 10 ** MOCK_PUSD_DECIMALS;
const MIN_SOL_LAMPORTS = 0.005 * LAMPORTS_PER_SOL;

type ActionState =
  | { kind: "idle" }
  | { kind: "running"; label: string }
  | { kind: "error"; message: string };

function fmtDateLong(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateLongTime(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const date = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} · ${time}`;
}

function intervalLabel(seconds: number): string {
  if (seconds >= 86400) {
    const d = Math.round(seconds / 86400);
    return `${d} ${d === 1 ? "day" : "days"}`;
  }
  if (seconds >= 3600) {
    const h = Math.round(seconds / 3600);
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  if (seconds >= 60) {
    const m = Math.round(seconds / 60);
    return `${m} ${m === 1 ? "minute" : "minutes"}`;
  }
  return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
}

function VaultClock({
  progress,
  lastCheckin,
  nextDue,
  now,
  intervalSec,
  triggered,
}: {
  progress: number;
  lastCheckin: Date;
  nextDue: Date;
  now: Date;
  intervalSec: number;
  triggered: boolean;
}) {
  const remainingSec = Math.max(
    0,
    Math.floor((nextDue.getTime() - now.getTime()) / 1000)
  );

  let bigUnit: string;
  let bigValue: string;
  if (intervalSec >= 86400) {
    bigUnit = "Days remaining until trigger";
    bigValue = String(Math.ceil(remainingSec / 86400));
  } else if (intervalSec >= 3600) {
    bigUnit = "Hours remaining";
    bigValue = String(Math.ceil(remainingSec / 3600));
  } else if (intervalSec >= 60) {
    bigUnit = "Minutes remaining";
    bigValue = String(Math.ceil(remainingSec / 60));
  } else {
    bigUnit = "Seconds remaining";
    bigValue = String(remainingSec);
  }
  if (triggered) bigValue = "0";

  const trackBg = triggered ? "var(--accent)" : "var(--ink)";

  return (
    <div>
      <div style={{ position: "relative", padding: "44px 0 56px" }}>
        <div
          style={{ position: "relative", height: 1, background: "var(--rule-2)" }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: 1,
              width: `${progress * 100}%`,
              background: trackBg,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `${progress * 100}%`,
              top: -5,
              width: 10,
              height: 10,
              background: trackBg,
              transform: "translateX(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: -3,
              width: 1,
              height: 7,
              background: "var(--ink-3)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -5,
              top: -5,
              width: 10,
              height: 10,
              background: triggered ? trackBg : "var(--paper)",
              border: `1px solid ${triggered ? trackBg : "var(--ink)"}`,
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Last check-in
          </div>
          <div
            style={{
              fontSize: 11,
              color: triggered ? "var(--accent)" : "var(--ink-3)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {triggered ? "Triggered" : "Trigger"}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Now
          </div>
          <div className="tnum" style={{ fontSize: 12.5 }}>
            {now.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span className="tnum" style={{ fontSize: 12.5 }}>
            {fmtDateLong(Math.floor(lastCheckin.getTime() / 1000))}
          </span>
          <span className="tnum" style={{ fontSize: 12.5 }}>
            {fmtDateLong(Math.floor(nextDue.getTime() / 1000))}
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 20,
          borderTop: "1px solid var(--rule)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div>
          <div className="meta">{bigUnit}</div>
          <div
            className="serif tnum"
            style={{
              fontSize: 32,
              letterSpacing: "-0.012em",
              marginTop: 4,
              color: triggered ? "var(--accent)" : "var(--ink)",
            }}
          >
            {bigValue}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="meta">Interval</div>
          <div className="tnum" style={{ fontSize: 16, marginTop: 4 }}>
            {intervalLabel(intervalSec)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VaultDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? null;
  const router = useRouter();
  const { program, connection, wallet } = useQuiesceProgram();
  const { vault, isLoading, notFound, refresh } = useVault(id);
  const { refresh: refreshPusd } = useUserPusdBalance();

  // Live ticking clock
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const [action, setAction] = useState<ActionState>({ kind: "idle" });

  const derived = useMemo(() => {
    if (!vault) return null;
    const lastHeartbeat = Number(vault.lastHeartbeat);
    const intervalSec = Number(vault.heartbeatInterval);
    const expirySec = lastHeartbeat + intervalSec;
    const nowSec = Math.floor(nowMs / 1000);
    const remainingSec = expirySec - nowSec;
    const elapsedSec = nowSec - lastHeartbeat;
    const progress = Math.min(1, Math.max(0, elapsedSec / intervalSec));
    return {
      lastHeartbeat,
      intervalSec,
      expirySec,
      remainingSec,
      progress,
      lastCheckinDate: new Date(lastHeartbeat * 1000),
      nextDueDate: new Date(expirySec * 1000),
      nowDate: new Date(nowMs),
      triggered: vault.status === "active" && remainingSec <= 0,
      heartbeatValid: vault.status === "active" && remainingSec > 0,
    };
  }, [vault, nowMs]);

  const ownerIsViewer =
    !!vault && !!wallet?.address && vault.owner.toBase58() === wallet.address;
  const viewerIsBeneficiary =
    !!vault &&
    !!wallet?.address &&
    vault.beneficiary.toBase58() === wallet.address;

  // ----------------- actions -----------------

  async function signAndSend(tx: import("@solana/web3.js").Transaction) {
    if (!wallet) throw new Error("Wallet not available.");
    const serialized = tx.serialize({ requireAllSignatures: false });
    const result = await wallet.signTransaction({
      transaction: new Uint8Array(serialized),
      chain: "solana:devnet",
    });
    const signature = await connection.sendRawTransaction(
      result.signedTransaction,
      { skipPreflight: false }
    );
    const latest = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      { signature, ...latest },
      "confirmed"
    );
    return signature;
  }

  async function handleCheckIn() {
    if (!program || !wallet?.address || !vault) return;
    setAction({ kind: "running", label: "Building transaction…" });
    try {
      const owner = new PublicKey(wallet.address);
      const tx = await buildHeartbeatTx({
        program,
        connection,
        owner,
        vaultPda: vault.publicKey,
      });
      setAction({ kind: "running", label: "Awaiting signature…" });
      await signAndSend(tx);
      setAction({ kind: "running", label: "Confirmed. Refreshing…" });
      refresh();
      setTimeout(() => setAction({ kind: "idle" }), 800);
    } catch (e) {
      setAction({
        kind: "error",
        message: `Check-in failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
    }
  }

  async function handleCancel() {
    if (!program || !wallet?.address || !vault) return;
    const ok = window.confirm(
      "Cancel this vault and return funds to your wallet? This cannot be undone."
    );
    if (!ok) return;

    setAction({ kind: "running", label: "Building transaction…" });
    try {
      const owner = new PublicKey(wallet.address);
      const tx = await buildCancelTx({
        program,
        connection,
        owner,
        vaultPda: vault.publicKey,
        mint: new PublicKey(MOCK_PUSD_MINT),
      });
      setAction({ kind: "running", label: "Awaiting signature…" });
      await signAndSend(tx);
      refreshPusd();
      router.push("/dashboard");
    } catch (e) {
      setAction({
        kind: "error",
        message: `Cancel failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
    }
  }

  async function handleRelease() {
    if (!program || !wallet?.address || !vault) return;
    setAction({ kind: "running", label: "Checking SOL balance…" });
    try {
      const caller = new PublicKey(wallet.address);
      const sol = await connection.getBalance(caller);
      if (sol < MIN_SOL_LAMPORTS) {
        setAction({
          kind: "error",
          message:
            "Wallet has less than 0.005 SOL. Top up devnet SOL and retry.",
        });
        return;
      }
      setAction({ kind: "running", label: "Building transaction…" });
      const { tx } = await buildClaimTx({
        program,
        connection,
        caller,
        vaultPda: vault.publicKey,
        vault,
      });
      setAction({ kind: "running", label: "Awaiting signature…" });
      await signAndSend(tx);
      setAction({ kind: "running", label: "Confirmed. Refreshing…" });
      refresh();
      refreshPusd();
      setTimeout(() => setAction({ kind: "idle" }), 800);
    } catch (e) {
      setAction({
        kind: "error",
        message: `Release failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
    }
  }

  // ----------------- render -----------------

  if (notFound) {
    return (
      <div data-screen-label="Vault not found">
        <TopBar mode="app" />
        <div className="shell" style={{ paddingBottom: 80 }}>
          <div style={{ paddingTop: 32 }}>
            <BackLink>Back to vaults</BackLink>
          </div>
          <div
            style={{
              padding: "120px 0",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <div className="h-section" style={{ marginBottom: 14 }}>
              Vault not found
            </div>
            <div className="h-1" style={{ marginBottom: 18 }}>
              No vault exists at that address.
            </div>
            <p className="body" style={{ marginBottom: 24 }}>
              The vault may have never been deployed, or the address in the URL
              is malformed.
            </p>
            <Link href="/dashboard" className="btn">
              Back to vaults
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !vault || !derived) {
    return (
      <div data-screen-label="Vault detail">
        <TopBar mode="app" />
        <div className="shell" style={{ paddingBottom: 80 }}>
          <div style={{ paddingTop: 32 }}>
            <BackLink>Back to vaults</BackLink>
          </div>
          <div className="meta" style={{ padding: "80px 0" }}>
            Loading vault from Solana devnet…
          </div>
        </div>
      </div>
    );
  }

  const amountPusd = Number(vault.amount) / PUSD_SCALE;
  const beneficiaryAddrFull = vault.beneficiary.toBase58();
  const pdaShort = truncateAddress(vault.publicKey.toBase58());

  // status header
  let pipStatus: "armed" | "warning" | "released" | "dormant";
  let pipLabel: string;
  if (vault.status === "active") {
    if (derived.triggered) {
      pipStatus = "warning";
      pipLabel = "Triggered";
    } else {
      pipStatus = "armed";
      pipLabel = "Armed";
    }
  } else if (vault.status === "claimed") {
    pipStatus = "released";
    pipLabel = "Released";
  } else {
    pipStatus = "dormant";
    pipLabel = "Cancelled";
  }

  const createdSec = Number(vault.createdAt);
  const daysSinceCreated = Math.max(
    0,
    Math.floor((Math.floor(nowMs / 1000) - createdSec) / 86400)
  );

  return (
    <div data-screen-label="Vault detail">
      <TopBar mode="app" />

      <div className="shell" style={{ paddingBottom: 80 }}>
        <div style={{ paddingTop: 32 }}>
          <BackLink>Back to vaults</BackLink>
        </div>

        {/* Header */}
        <div
          className="responsive-stack"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "32px 0 28px",
            borderBottom: "1px solid var(--rule-2)",
            gap: 24,
          }}
        >
          <div>
            <div className="h-section" style={{ marginBottom: 14 }}>
              Vault · #{vault.vaultId.toString()} · {pdaShort}
            </div>
            <div className="h-1">{vault.name || `Vault #${vault.vaultId.toString()}`}</div>
            <div
              style={{ marginTop: 16, display: "flex", gap: 24, alignItems: "center" }}
            >
              <Pip status={pipStatus}>{pipLabel}</Pip>
              <span className="meta">
                Deployed {fmtDateLong(createdSec)} ·{" "}
                {daysSinceCreated} {daysSinceCreated === 1 ? "day" : "days"} ago
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="h-section" style={{ marginBottom: 8 }}>
              Held
            </div>
            <div
              className="serif tnum"
              style={{ fontSize: 40, letterSpacing: "-0.018em" }}
            >
              {fmtUSD(amountPusd)}
            </div>
            <div className="meta" style={{ marginTop: 4 }}>
              PUSD · non-freezable
            </div>
          </div>
        </div>

        {/* Triggered + owner: surface the claim URL so the owner can share it */}
        {vault.status === "active" && derived.triggered && ownerIsViewer && (
          <ClaimLinkBlock
            vaultPda={vault.publicKey.toBase58()}
            beneficiaryShort={truncateAddress(beneficiaryAddrFull)}
          />
        )}

        {/* Two columns: condition logic + clock (only for Active state) */}
        {vault.status === "active" && (
          <div
            className="responsive-stack"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 64,
              padding: "48px 0",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <ConditionColumn
              vault={vault}
              triggered={derived.triggered}
              heartbeatValid={derived.heartbeatValid}
              ownerIsViewer={ownerIsViewer}
              viewerIsBeneficiary={viewerIsBeneficiary}
              action={action}
              onCheckIn={handleCheckIn}
              onCancel={handleCancel}
              onRelease={handleRelease}
              intervalSec={derived.intervalSec}
              beneficiary={beneficiaryAddrFull}
              amountPusd={amountPusd}
            />

            <div>
              <div className="h-section" style={{ marginBottom: 16 }}>
                Heartbeat clock
              </div>
              <VaultClock
                progress={derived.progress}
                lastCheckin={derived.lastCheckinDate}
                nextDue={derived.nextDueDate}
                now={derived.nowDate}
                intervalSec={derived.intervalSec}
                triggered={derived.triggered}
              />
            </div>
          </div>
        )}

        {vault.status === "claimed" && (
          <div
            style={{
              padding: "48px 0",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <div className="h-section" style={{ marginBottom: 16 }}>
              Released
            </div>
            <div
              className="serif"
              style={{
                fontSize: 22,
                lineHeight: 1.45,
                color: "var(--ink)",
                maxWidth: "62ch",
              }}
            >
              This vault was claimed.{" "}
              <span className="tnum">{fmtUSD(amountPusd)} PUSD</span> released
              to{" "}
              <span className="addr" style={{ fontSize: 17 }}>
                {truncateAddress(beneficiaryAddrFull)}
              </span>
              .
            </div>
          </div>
        )}

        {vault.status === "cancelled" && (
          <div
            style={{
              padding: "48px 0",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <div className="h-section" style={{ marginBottom: 16 }}>
              Cancelled
            </div>
            <div
              className="serif"
              style={{
                fontSize: 22,
                lineHeight: 1.45,
                color: "var(--ink)",
                maxWidth: "62ch",
              }}
            >
              This vault was cancelled by the owner. Funds were returned to the
              owner&apos;s wallet.
            </div>
          </div>
        )}

        {/* Definition list — vault parameters */}
        <div
          className="responsive-stack"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            padding: "48px 0",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <div>
            <div className="h-section" style={{ marginBottom: 18 }}>
              Beneficiary
            </div>
            <dl className="dl" style={{ gridTemplateColumns: "150px 1fr" }}>
              <dt>Address</dt>
              <dd className="addr" style={{ fontSize: 13, wordBreak: "break-all" }}>
                {beneficiaryAddrFull}
              </dd>
            </dl>
          </div>
          <div>
            <div className="h-section" style={{ marginBottom: 18 }}>
              Parameters
            </div>
            <dl className="dl" style={{ gridTemplateColumns: "180px 1fr" }}>
              <dt>Trigger</dt>
              <dd>Missed heartbeat · {intervalLabel(derived.intervalSec)}</dd>
              <dt>Last check-in</dt>
              <dd className="tnum">{fmtDateLongTime(derived.lastHeartbeat)}</dd>
              <dt>Next required by</dt>
              <dd className="tnum">{fmtDateLongTime(derived.expirySec)}</dd>
              <dt>Release fraction</dt>
              <dd className="tnum">100%</dd>
              <dt>Reversibility</dt>
              <dd>None after release</dd>
            </dl>
          </div>
        </div>

        {/* Activity log: minimal — we don't index events yet, so just show creation */}
        <div style={{ padding: "48px 0 0" }}>
          <div className="h-section" style={{ marginBottom: 18 }}>
            Activity
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 200 }}>Date</th>
                <th>Event</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="tnum" style={{ fontSize: 14 }}>
                    {fmtDateLongTime(derived.lastHeartbeat)}
                  </div>
                </td>
                <td>Last heartbeat recorded</td>
                <td>
                  <span className="meta">
                    On-chain timestamp from program state
                  </span>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="tnum" style={{ fontSize: 14 }}>
                    {fmtDateLongTime(createdSec)}
                  </div>
                </td>
                <td>Vault deployed</td>
                <td>
                  <span className="meta">
                    {fmtUSD(amountPusd)} PUSD escrowed under PDA{" "}
                    {truncateAddress(vault.publicKey.toBase58())}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConditionColumn({
  vault,
  triggered,
  heartbeatValid,
  ownerIsViewer,
  viewerIsBeneficiary,
  action,
  onCheckIn,
  onCancel,
  onRelease,
  intervalSec,
  beneficiary,
  amountPusd,
}: {
  vault: OnChainVault;
  triggered: boolean;
  heartbeatValid: boolean;
  ownerIsViewer: boolean;
  viewerIsBeneficiary: boolean;
  action: ActionState;
  onCheckIn: () => void;
  onCancel: () => void;
  onRelease: () => void;
  intervalSec: number;
  beneficiary: string;
  amountPusd: number;
}) {
  const running = action.kind === "running";
  const showActions = ownerIsViewer && heartbeatValid;
  const showReleaseAction = triggered && viewerIsBeneficiary;

  return (
    <div>
      <div className="h-section" style={{ marginBottom: 16 }}>
        Condition
      </div>
      {triggered ? (
        <div
          className="serif"
          style={{
            fontSize: 22,
            lineHeight: 1.45,
            color: "var(--ink)",
            maxWidth: "44ch",
          }}
        >
          Heartbeat expired. Anyone may now release{" "}
          <span className="tnum">{fmtUSD(amountPusd)} PUSD</span> to{" "}
          <span className="addr" style={{ fontSize: 17 }}>
            {truncateAddress(beneficiary)}
          </span>
          .
        </div>
      ) : (
        <div
          className="serif"
          style={{
            fontSize: 22,
            lineHeight: 1.45,
            color: "var(--ink)",
            maxWidth: "44ch",
          }}
        >
          If{" "}
          <span style={{ borderBottom: "1px dotted var(--ink-3)" }}>
            {intervalLabel(intervalSec)}
          </span>{" "}
          pass without a check-in, release{" "}
          <span className="tnum">100%</span> of the balance to{" "}
          <span className="addr" style={{ fontSize: 17 }}>
            {truncateAddress(beneficiary)}
          </span>
          .
        </div>
      )}

      {showActions && (
        <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-accent"
            onClick={onCheckIn}
            disabled={running}
            style={{ opacity: running ? 0.6 : 1 }}
          >
            {running && action.label.startsWith("Awaiting") ? "Awaiting…" : "Check in"}
          </button>
          <button
            className="btn-quiet"
            onClick={onCancel}
            disabled={running}
            style={{ opacity: running ? 0.6 : 1 }}
          >
            Cancel vault
          </button>
        </div>
      )}

      {showReleaseAction && (
        <div
          style={{
            marginTop: 24,
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn btn-accent"
            onClick={onRelease}
            disabled={running}
            style={{ opacity: running ? 0.6 : 1 }}
          >
            Release {fmtUSD(amountPusd)} PUSD to {truncateAddress(beneficiary)}
          </button>
        </div>
      )}

      {showReleaseAction && (
        <div className="meta" style={{ marginTop: 14, maxWidth: "60ch" }}>
          You are the configured beneficiary. Signing transfers the full balance
          to your wallet. Network fee ≈ 0.000005 SOL (plus a small ATA rent if
          you don&apos;t already hold PUSD).
        </div>
      )}

      {triggered && !viewerIsBeneficiary && (
        <div className="meta" style={{ marginTop: 18, maxWidth: "48ch" }}>
          If you are the beneficiary, claim from the dedicated claim link.
        </div>
      )}

      {!triggered && showActions && (
        <div className="meta" style={{ marginTop: 18, maxWidth: "48ch" }}>
          Check-in is a single signed transaction. Network fee ≈ 0.000005 SOL.
        </div>
      )}

      {action.kind === "running" && (
        <div className="meta" style={{ marginTop: 14 }}>
          {action.label}
        </div>
      )}
      {action.kind === "error" && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            border: "1px solid var(--rule-2)",
            borderLeft: "3px solid var(--accent)",
            background: "var(--paper-2)",
            fontSize: 13,
            color: "var(--ink)",
            whiteSpace: "pre-wrap",
            maxWidth: "60ch",
          }}
        >
          {action.message}
        </div>
      )}

      {!ownerIsViewer && vault.status === "active" && !triggered && (
        <div className="meta" style={{ marginTop: 18, maxWidth: "48ch" }}>
          You are not the owner of this vault. Owner actions (check in, cancel)
          are unavailable.
        </div>
      )}
    </div>
  );
}

function ClaimLinkBlock({
  vaultPda,
  beneficiaryShort,
}: {
  vaultPda: string;
  beneficiaryShort: string;
}) {
  const [origin, setOrigin] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const claimUrl = origin ? `${origin}/claim/${vaultPda}` : `/claim/${vaultPda}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(claimUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — copy not available; user can select the text manually
    }
  };

  return (
    <div
      style={{
        marginTop: 32,
        padding: 24,
        background: "var(--paper-2)",
        border: "1px solid var(--rule-2)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: 4,
      }}
    >
      <div className="h-section" style={{ marginBottom: 10 }}>
        Beneficiary actions
      </div>
      <p
        className="body-sm"
        style={{ margin: 0, color: "var(--ink)", maxWidth: "62ch" }}
      >
        This vault is triggered.{" "}
        <span className="addr" style={{ fontSize: 13 }}>
          {beneficiaryShort}
        </span>{" "}
        can claim it directly — it appears in their dashboard when they sign in
        to Quiesce. You can also share the link below if you want to send it
        manually. The funds always go to the configured beneficiary, regardless
        of who triggers the release.
      </p>
      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <code
          className="addr"
          style={{
            fontSize: 12,
            padding: "8px 12px",
            background: "var(--paper)",
            border: "1px solid var(--rule)",
            borderRadius: 3,
            wordBreak: "break-all",
            flex: "1 1 320px",
            maxWidth: "100%",
          }}
        >
          {claimUrl}
        </code>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleCopy}
          type="button"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
