"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Wordmark } from "@/components/chrome/Wordmark";
import { fmtUSD, truncateAddress } from "@/lib/format";
import { MOCK_PUSD_DECIMALS } from "@/lib/constants";
import { useQuiesceProgram } from "@/hooks/useQuiesceProgram";
import { useVault } from "@/hooks/useVault";
import { buildClaimTx } from "@/lib/transactions/claim";

const PUSD_SCALE = 10 ** MOCK_PUSD_DECIMALS;
const MIN_SOL_LAMPORTS = 0.005 * LAMPORTS_PER_SOL;

type ActionState =
  | { kind: "idle" }
  | { kind: "running"; label: string }
  | { kind: "success"; signature: string }
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
  return `${d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })} · ${d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;
}

function ClaimShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-screen-label="Beneficiary claim"
      style={{ minHeight: "100vh", background: "var(--paper)" }}
    >
      <header
        style={{
          padding: "32px",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div className="topbar-inner">
          <Wordmark />
          <div className="meta">Notice of release</div>
        </div>
      </header>
      <div
        className="shell-narrow"
        style={{ paddingTop: 96, paddingBottom: 120 }}
      >
        {children}
      </div>
    </div>
  );
}

export default function ClaimPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? null;
  const { program, connection, wallet } = useQuiesceProgram();
  const { vault, isLoading, notFound, refresh } = useVault(id);

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
    return {
      lastHeartbeat,
      intervalSec,
      expirySec,
      remainingSec: expirySec - nowSec,
      triggered: vault.status === "active" && nowSec > expirySec,
      claimable: vault.status === "active" && nowSec > expirySec,
    };
  }, [vault, nowMs]);

  async function handleRelease() {
    if (!program || !wallet?.address || !vault) return;
    setAction({ kind: "running", label: "Building transaction…" });
    try {
      const caller = new PublicKey(wallet.address);

      const sol = await connection.getBalance(caller);
      if (sol < MIN_SOL_LAMPORTS) {
        setAction({
          kind: "error",
          message:
            "Your wallet has less than 0.005 SOL. You need devnet SOL to pay for the network fee (and beneficiary ATA rent if it doesn't exist yet). Run: solana airdrop 1 " +
            wallet.address +
            " --url devnet",
        });
        return;
      }

      const { tx } = await buildClaimTx({
        program,
        connection,
        caller,
        vaultPda: vault.publicKey,
        vault,
      });

      setAction({ kind: "running", label: "Awaiting signature…" });
      const serialized = tx.serialize({ requireAllSignatures: false });
      const signed = await wallet.signTransaction({
        transaction: new Uint8Array(serialized),
        chain: "solana:devnet",
      });

      setAction({ kind: "running", label: "Submitting…" });
      const signature = await connection.sendRawTransaction(
        signed.signedTransaction,
        { skipPreflight: false }
      );

      setAction({ kind: "running", label: "Confirming on devnet…" });
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, ...latest },
        "confirmed"
      );

      refresh();
      setAction({ kind: "success", signature });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setAction({ kind: "error", message: `Release failed: ${msg}` });
    }
  }

  // ----------------- render -----------------

  if (notFound) {
    return (
      <ClaimShell>
        <div className="h-section" style={{ marginBottom: 28 }}>
          Vault not found
        </div>
        <h1
          className="serif"
          style={{
            fontSize: "clamp(40px, 4.6vw, 60px)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            fontWeight: 400,
            margin: 0,
            maxWidth: "22ch",
          }}
        >
          No vault exists at that address.
        </h1>
        <p className="body" style={{ marginTop: 36, fontSize: 18 }}>
          The vault may never have been deployed, or the address in the URL is
          malformed.
        </p>
      </ClaimShell>
    );
  }

  if (isLoading || !vault || !derived) {
    return (
      <ClaimShell>
        <div className="meta" style={{ paddingTop: 80 }}>
          Loading vault from Solana devnet…
        </div>
      </ClaimShell>
    );
  }

  const amountPusd = Number(vault.amount) / PUSD_SCALE;
  const beneficiaryFull = vault.beneficiary.toBase58();
  const beneficiaryShort = truncateAddress(beneficiaryFull);
  const ownerFull = vault.owner.toBase58();
  const ownerShort = truncateAddress(ownerFull);
  const createdAt = Number(vault.createdAt);
  const intervalLabel = describeInterval(derived.intervalSec);

  // ---- Active + still valid (cannot claim yet) ----
  if (vault.status === "active" && !derived.triggered) {
    return (
      <ClaimShell>
        <div className="h-section" style={{ marginBottom: 28 }}>
          For {beneficiaryShort}
        </div>
        <h1
          className="serif"
          style={{
            fontSize: "clamp(40px, 4.6vw, 60px)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            fontWeight: 400,
            margin: 0,
            maxWidth: "22ch",
          }}
        >
          This vault is still active.
        </h1>
        <div style={{ marginTop: 56, maxWidth: "60ch" }}>
          <p className="body" style={{ fontSize: 18, color: "var(--ink)" }}>
            On <span className="tnum">{fmtDateLong(createdAt)}</span>, the
            owner deposited{" "}
            <span className="tnum">{fmtUSD(amountPusd)} PUSD</span> into a
            Quiesce vault and named you as its sole beneficiary. The vault is
            configured to release if {intervalLabel} pass without a check-in
            from the owner&apos;s key.
          </p>
          <p
            className="body"
            style={{ marginTop: 22, fontSize: 18, color: "var(--ink)" }}
          >
            Funds cannot be claimed yet. The next check-in is required by{" "}
            <span className="tnum">{fmtDateLongTime(derived.expirySec)}</span>.
            If that moment passes without a check-in, this page will let you
            release the funds.
          </p>
        </div>

        <hr className="hr-strong" style={{ margin: "72px 0 0" }} />

        <div
          style={{ padding: "48px 0", borderBottom: "1px solid var(--rule-2)" }}
        >
          <ParticularsBlock
            amountPusd={amountPusd}
            ownerShort={ownerShort}
            ownerFull={ownerFull}
            beneficiaryShort={beneficiaryShort}
            beneficiaryFull={beneficiaryFull}
            vaultName={vault.name}
            createdAt={createdAt}
            vaultPda={vault.publicKey.toBase58()}
            statusLine="Awaiting heartbeat expiry"
          />
        </div>
      </ClaimShell>
    );
  }

  // ---- Claimed ----
  if (vault.status === "claimed") {
    return (
      <ClaimShell>
        <div className="h-section" style={{ marginBottom: 28 }}>
          For {beneficiaryShort}
        </div>
        <h1
          className="serif"
          style={{
            fontSize: "clamp(40px, 4.6vw, 60px)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            fontWeight: 400,
            margin: 0,
            maxWidth: "22ch",
          }}
        >
          This vault has already been claimed.
        </h1>
        <p className="body" style={{ marginTop: 36, fontSize: 18 }}>
          The full balance was released to{" "}
          <span className="addr" style={{ fontSize: 16 }}>
            {beneficiaryShort}
          </span>
          . On-chain state shows status: Claimed and a balance of zero.
        </p>

        <hr className="hr-strong" style={{ margin: "72px 0 0" }} />

        <div
          style={{ padding: "48px 0", borderBottom: "1px solid var(--rule-2)" }}
        >
          <ParticularsBlock
            amountPusd={amountPusd}
            ownerShort={ownerShort}
            ownerFull={ownerFull}
            beneficiaryShort={beneficiaryShort}
            beneficiaryFull={beneficiaryFull}
            vaultName={vault.name}
            createdAt={createdAt}
            vaultPda={vault.publicKey.toBase58()}
            statusLine="Claimed"
          />
        </div>
      </ClaimShell>
    );
  }

  // ---- Cancelled ----
  if (vault.status === "cancelled") {
    return (
      <ClaimShell>
        <div className="h-section" style={{ marginBottom: 28 }}>
          For {beneficiaryShort}
        </div>
        <h1
          className="serif"
          style={{
            fontSize: "clamp(40px, 4.6vw, 60px)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            fontWeight: 400,
            margin: 0,
            maxWidth: "22ch",
          }}
        >
          This vault was cancelled by the owner.
        </h1>
        <p className="body" style={{ marginTop: 36, fontSize: 18 }}>
          Funds were returned to the owner&apos;s wallet. There is nothing to
          claim.
        </p>

        <hr className="hr-strong" style={{ margin: "72px 0 0" }} />

        <div
          style={{ padding: "48px 0", borderBottom: "1px solid var(--rule-2)" }}
        >
          <ParticularsBlock
            amountPusd={amountPusd}
            ownerShort={ownerShort}
            ownerFull={ownerFull}
            beneficiaryShort={beneficiaryShort}
            beneficiaryFull={beneficiaryFull}
            vaultName={vault.name}
            createdAt={createdAt}
            vaultPda={vault.publicKey.toBase58()}
            statusLine="Cancelled by owner"
          />
        </div>
      </ClaimShell>
    );
  }

  // ---- Active + Triggered (the main UI) ----

  const succeeded = action.kind === "success";

  return (
    <ClaimShell>
      <div className="h-section" style={{ marginBottom: 28 }}>
        For {beneficiaryShort}
      </div>
      <h1
        className="serif"
        style={{
          fontSize: "clamp(40px, 4.6vw, 60px)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          fontWeight: 400,
          margin: 0,
          maxWidth: "22ch",
        }}
      >
        {succeeded
          ? "Released."
          : "A vault designated for you is now ready to be claimed."}
      </h1>

      {!succeeded && (
        <div style={{ marginTop: 56, maxWidth: "60ch" }}>
          <p className="body" style={{ fontSize: 18, color: "var(--ink)" }}>
            On <span className="tnum">{fmtDateLong(createdAt)}</span>, the
            owner deposited{" "}
            <span className="tnum">{fmtUSD(amountPusd)} PUSD</span> into a
            Quiesce vault and named you as its sole beneficiary. The vault was
            set to release if {intervalLabel} passed without a check-in from
            the owner&apos;s key.
          </p>
          <p
            className="body"
            style={{ marginTop: 22, fontSize: 18, color: "var(--ink)" }}
          >
            That interval has elapsed. The vault is open. The full balance can
            now be released to the beneficiary&apos;s wallet.
          </p>
        </div>
      )}

      {succeeded && (
        <p className="body" style={{ marginTop: 36, fontSize: 18, color: "var(--ink)" }}>
          <span className="tnum">{fmtUSD(amountPusd)} PUSD</span> has been
          transferred to{" "}
          <span className="addr" style={{ fontSize: 16 }}>
            {beneficiaryShort}
          </span>
          . The release is final and recorded on-chain.
        </p>
      )}

      <hr className="hr-strong" style={{ margin: "72px 0 0" }} />

      <div
        style={{ padding: "48px 0 56px", borderBottom: "1px solid var(--rule-2)" }}
      >
        <ParticularsBlock
          amountPusd={amountPusd}
          ownerShort={ownerShort}
          ownerFull={ownerFull}
          beneficiaryShort={beneficiaryShort}
          beneficiaryFull={beneficiaryFull}
          vaultName={vault.name}
          createdAt={createdAt}
          vaultPda={vault.publicKey.toBase58()}
          statusLine={
            succeeded
              ? "Released"
              : `Triggered. Heartbeat expired ${fmtDateLongTime(
                  derived.expirySec
                )}.`
          }
        />
      </div>

      <div style={{ padding: "64px 0 0" }}>
        <div className="h-section" style={{ marginBottom: 18 }}>
          {succeeded ? "Confirmation" : "To release"}
        </div>

        {!succeeded && (
          <p className="body" style={{ fontSize: 17, maxWidth: "60ch" }}>
            By clicking Release, you&apos;ll sign a transaction that transfers
            the full balance to{" "}
            <span className="addr" style={{ fontSize: 14 }}>
              {beneficiaryShort}
            </span>
            . You pay only the network fee (~0.000005 SOL, plus a small ATA
            rent if the beneficiary doesn&apos;t already hold PUSD). The funds
            go to the beneficiary regardless of who clicks. The release is
            final.
          </p>
        )}

        {!succeeded && (
          <div
            style={{
              marginTop: 36,
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {wallet?.address ? (
              <button
                className="btn btn-accent"
                onClick={handleRelease}
                disabled={action.kind === "running"}
                style={{ opacity: action.kind === "running" ? 0.6 : 1 }}
              >
                {action.kind === "running"
                  ? action.label
                  : `Release ${fmtUSD(amountPusd)} PUSD`}
              </button>
            ) : (
              <p className="meta" style={{ margin: 0 }}>
                Sign in from the top of the app to release this vault. Any
                signed-in user may trigger the release; the funds always go to
                the named beneficiary.
              </p>
            )}
          </div>
        )}

        {action.kind === "error" && (
          <div
            style={{
              marginTop: 18,
              padding: "12px 16px",
              border: "1px solid var(--rule-2)",
              borderLeft: "3px solid var(--accent)",
              background: "var(--paper-2)",
              fontSize: 13.5,
              color: "var(--ink)",
              whiteSpace: "pre-wrap",
              maxWidth: "62ch",
            }}
          >
            {action.message}
          </div>
        )}

        {succeeded && (
          <div style={{ marginTop: 24, maxWidth: "62ch" }}>
            <dl className="dl" style={{ gridTemplateColumns: "180px 1fr" }}>
              <dt>Amount released</dt>
              <dd className="tnum">{fmtUSD(amountPusd)} PUSD</dd>
              <dt>To</dt>
              <dd className="addr" style={{ fontSize: 13, wordBreak: "break-all" }}>
                {beneficiaryFull}
              </dd>
              <dt>Transaction</dt>
              <dd className="addr" style={{ fontSize: 12, wordBreak: "break-all" }}>
                {action.signature}
              </dd>
              <dt>Verify on Explorer</dt>
              <dd>
                <a
                  href={`https://explorer.solana.com/tx/${action.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--ink-2)", textDecoration: "underline" }}
                >
                  explorer.solana.com →
                </a>
              </dd>
            </dl>
            <div style={{ marginTop: 36 }}>
              <Link href="/dashboard" className="btn btn-ghost">
                Back to vaults
              </Link>
            </div>
          </div>
        )}

        <div className="meta" style={{ marginTop: 32, maxWidth: "60ch" }}>
          {succeeded
            ? "Quiesce never held these funds. The vault released them directly from the on-chain program to the beneficiary's wallet."
            : "There is no deadline. The vault remains open indefinitely. Anyone with the link can trigger the release; only the configured beneficiary can receive the funds."}
        </div>
      </div>
    </ClaimShell>
  );
}

function ParticularsBlock({
  amountPusd,
  ownerShort,
  ownerFull,
  beneficiaryShort,
  beneficiaryFull,
  vaultName,
  createdAt,
  vaultPda,
  statusLine,
}: {
  amountPusd: number;
  ownerShort: string;
  ownerFull: string;
  beneficiaryShort: string;
  beneficiaryFull: string;
  vaultName: string;
  createdAt: number;
  vaultPda: string;
  statusLine: string;
}) {
  return (
    <div
      className="responsive-stack"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 64,
        alignItems: "start",
      }}
    >
      <div>
        <div className="h-section" style={{ marginBottom: 14 }}>
          Amount
        </div>
        <div
          className="serif tnum"
          style={{ fontSize: 56, lineHeight: 1, letterSpacing: "-0.022em" }}
        >
          {fmtUSD(amountPusd)}
        </div>
        <div className="meta" style={{ marginTop: 10 }}>
          PUSD · non-freezable
        </div>
      </div>
      <div>
        <dl className="dl" style={{ gridTemplateColumns: "150px 1fr" }}>
          <dt>From</dt>
          <dd>
            <div className="addr">{ownerShort}</div>
            <div
              className="meta"
              style={{ marginTop: 4, fontSize: 11, wordBreak: "break-all" }}
            >
              {ownerFull}
            </div>
          </dd>
          <dt>To beneficiary</dt>
          <dd>
            <div className="addr">{beneficiaryShort}</div>
            <div
              className="meta"
              style={{ marginTop: 4, fontSize: 11, wordBreak: "break-all" }}
            >
              {beneficiaryFull}
            </div>
          </dd>
          <dt>Vault</dt>
          <dd>{vaultName || "Unnamed vault"}</dd>
          <dt>Designation made</dt>
          <dd className="tnum">{fmtDateLong(createdAt)}</dd>
          <dt>Status</dt>
          <dd>{statusLine}</dd>
          <dt>Vault address</dt>
          <dd className="addr" style={{ fontSize: 12, wordBreak: "break-all" }}>
            {vaultPda}
          </dd>
        </dl>
      </div>
    </div>
  );
}

function describeInterval(seconds: number): string {
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
