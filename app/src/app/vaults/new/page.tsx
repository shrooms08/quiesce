"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { TopBar } from "@/components/chrome/TopBar";
import { BackLink } from "@/components/chrome/BackLink";
import { fmtUSD, truncateAddress } from "@/lib/format";
import { MOCK_PUSD_DECIMALS, MOCK_PUSD_MINT } from "@/lib/constants";
import { useQuiesceProgram } from "@/hooks/useQuiesceProgram";
import { useUserVaults } from "@/hooks/useUserVaults";
import { useUserPusdBalance } from "@/hooks/useUserPusdBalance";
import { buildCreateVaultTx } from "@/lib/transactions/createVault";

const PUSD_SCALE = 10 ** MOCK_PUSD_DECIMALS;
const MIN_HEARTBEAT_SEC = 60n;
const MAX_HEARTBEAT_SEC = 3_153_600_000n; // 100 years
const MIN_SOL_LAMPORTS = 0.005 * LAMPORTS_PER_SOL;

const HEARTBEAT_PRESETS: Array<{ label: string; seconds: number }> = [
  { label: "60 seconds (demo)", seconds: 60 },
  { label: "7 days", seconds: 7 * 86400 },
  { label: "30 days", seconds: 30 * 86400 },
  { label: "90 days", seconds: 90 * 86400 },
  { label: "1 year", seconds: 365 * 86400 },
];

function formatIntervalLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) {
    const m = Math.round(seconds / 60);
    return `${m} ${m === 1 ? "minute" : "minutes"}`;
  }
  if (seconds < 86400) {
    const h = Math.round(seconds / 3600);
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  const d = Math.round(seconds / 86400);
  return `${d} ${d === 1 ? "day" : "days"}`;
}

function Step({
  number,
  eyebrow,
  title,
  children,
}: {
  number: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="responsive-stack"
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: 48,
        padding: "72px 0",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div>
        <div
          className="serif"
          style={{
            fontSize: 32,
            color: "var(--ink-3)",
            lineHeight: 1,
            letterSpacing: "0.01em",
          }}
        >
          {number}
        </div>
        <div className="h-section" style={{ marginTop: 18 }}>
          {eyebrow}
        </div>
      </div>
      <div>
        <h2 className="h-2" style={{ marginTop: 0, marginBottom: 18 }}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ConditionRow({
  selected,
  onSelect,
  title,
  desc,
  last,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
  last?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      style={{
        textAlign: "left",
        background: selected ? "var(--paper-2)" : "transparent",
        border: "none",
        borderBottom: last
          ? "1px solid var(--rule-2)"
          : "1px solid var(--rule)",
        padding: "22px 20px",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        fontFamily: "inherit",
        transition: "background-color 150ms ease",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "1px solid var(--ink-3)",
          background: selected ? "var(--ink)" : "transparent",
          boxShadow: selected ? "inset 0 0 0 2px var(--paper-2)" : "none",
          marginTop: 5,
          flexShrink: 0,
        }}
      />
      <span>
        <span
          style={{
            display: "block",
            fontSize: 15,
            color: "var(--ink)",
            fontWeight: 500,
          }}
        >
          {title}
        </span>
        <span
          className="body-sm"
          style={{ display: "block", marginTop: 4, color: "var(--ink-3)" }}
        >
          {desc}
        </span>
      </span>
    </button>
  );
}

function PresetButton({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={selected ? "btn btn-sm" : "btn btn-ghost btn-sm"}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {label}
    </button>
  );
}

function Ack({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "10px 0",
      }}
    >
      <input
        type="checkbox"
        defaultChecked
        style={{ marginTop: 4, accentColor: "var(--accent)" }}
      />
      <span className="body-sm" style={{ color: "var(--ink-2)" }}>
        {children}
      </span>
    </label>
  );
}

type SubmitStatus =
  | { kind: "idle" }
  | { kind: "validating" }
  | { kind: "building" }
  | { kind: "signing" }
  | { kind: "submitting"; signature?: string }
  | { kind: "confirming"; signature: string }
  | { kind: "error"; message: string; signature?: string };

export default function CreateVaultPage() {
  const router = useRouter();
  const { program, connection, wallet } = useQuiesceProgram();
  const { vaults } = useUserVaults();
  const { balance: pusdBalance, refresh: refreshPusd } = useUserPusdBalance();

  const [name, setName] = useState("Test vault");
  const [amount, setAmount] = useState("100");
  const [conditionType, setConditionType] = useState("heartbeat");
  const [intervalSec, setIntervalSec] = useState<number>(60);
  const [customDays, setCustomDays] = useState<string>("");
  const [beneficiaryLabel, setBeneficiaryLabel] = useState("");
  const [beneficiaryAddr, setBeneficiaryAddr] = useState("");
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" });

  const inFlight =
    status.kind === "validating" ||
    status.kind === "building" ||
    status.kind === "signing" ||
    status.kind === "submitting" ||
    status.kind === "confirming";

  const amountNum = Number(amount.replace(/,/g, "")) || 0;
  const walletPusd =
    pusdBalance !== null ? Number(pusdBalance) / PUSD_SCALE : null;

  const nextVaultId = useMemo<bigint>(() => {
    if (vaults.length === 0) return 0n;
    let max = vaults[0].vaultId;
    for (const v of vaults) if (v.vaultId > max) max = v.vaultId;
    return max + 1n;
  }, [vaults]);

  const setPreset = (seconds: number) => {
    setIntervalSec(seconds);
    setCustomDays("");
  };

  const setCustomDaysValue = (raw: string) => {
    setCustomDays(raw);
    const days = Number(raw);
    if (!Number.isFinite(days) || days <= 0) return;
    setIntervalSec(Math.round(days * 86400));
  };

  const statusMessage = (() => {
    switch (status.kind) {
      case "idle":
        return "Wallet will request one signature.";
      case "validating":
        return "Validating…";
      case "building":
        return "Building transaction…";
      case "signing":
        return "Awaiting signature…";
      case "submitting":
        return "Submitting…";
      case "confirming":
        return "Confirming on devnet…";
      case "error":
        return null;
    }
  })();

  async function handleSubmit() {
    setStatus({ kind: "validating" });

    if (!program || !wallet?.address) {
      setStatus({
        kind: "error",
        message: "Wallet not connected. Sign in first.",
      });
      return;
    }

    if (conditionType !== "heartbeat") {
      setStatus({
        kind: "error",
        message:
          "Only the heartbeat condition is implemented on-chain in this release.",
      });
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setStatus({ kind: "error", message: "Vault name is required." });
      return;
    }
    const encodedName = new TextEncoder().encode(trimmedName);
    if (encodedName.length > 32) {
      setStatus({
        kind: "error",
        message: `Vault name is ${encodedName.length} bytes; the on-chain field holds 32.`,
      });
      return;
    }

    let owner: PublicKey;
    try {
      owner = new PublicKey(wallet.address);
    } catch {
      setStatus({ kind: "error", message: "Connected wallet address is invalid." });
      return;
    }

    let beneficiary: PublicKey;
    try {
      beneficiary = new PublicKey(beneficiaryAddr.trim());
    } catch {
      setStatus({
        kind: "error",
        message: "Beneficiary is not a valid Solana address.",
      });
      return;
    }

    if (beneficiary.equals(owner)) {
      setStatus({
        kind: "error",
        message: "Beneficiary cannot be the same as the vault owner.",
      });
      return;
    }

    const intervalBig = BigInt(intervalSec);
    if (intervalBig < MIN_HEARTBEAT_SEC || intervalBig > MAX_HEARTBEAT_SEC) {
      setStatus({
        kind: "error",
        message:
          "Heartbeat interval must be between 60 seconds and 100 years.",
      });
      return;
    }

    if (!(amountNum > 0)) {
      setStatus({ kind: "error", message: "Deposit amount must be greater than zero." });
      return;
    }
    const depositBaseUnits = BigInt(Math.round(amountNum * PUSD_SCALE));

    if (pusdBalance === null) {
      setStatus({
        kind: "error",
        message: "Still reading wallet PUSD balance. Try again in a moment.",
      });
      return;
    }
    if (depositBaseUnits > pusdBalance) {
      setStatus({
        kind: "error",
        message: `Insufficient PUSD. Wallet holds ${
          walletPusd !== null ? fmtUSD(walletPusd) : "0"
        } PUSD.`,
      });
      return;
    }

    try {
      const sol = await connection.getBalance(owner);
      if (sol < MIN_SOL_LAMPORTS) {
        setStatus({
          kind: "error",
          message:
            "Wallet has less than 0.005 SOL for transaction fees. Top up devnet SOL and retry.",
        });
        return;
      }
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Could not read SOL balance: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
      return;
    }

    setStatus({ kind: "building" });

    let vaultPda: PublicKey;
    let tx: Transaction;
    try {
      const built = await buildCreateVaultTx({
        program,
        connection,
        owner,
        beneficiary,
        mint: new PublicKey(MOCK_PUSD_MINT),
        vaultId: nextVaultId,
        name: trimmedName,
        heartbeatIntervalSec: intervalBig,
        depositAmount: depositBaseUnits,
      });
      vaultPda = built.vaultPda;
      tx = built.tx;
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Failed to build transaction: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
      return;
    }

    setStatus({ kind: "signing" });

    let signedBytes: Uint8Array;
    try {
      const serialized = tx.serialize({ requireAllSignatures: false });
      const result = await wallet.signTransaction({
        transaction: new Uint8Array(serialized),
        chain: "solana:devnet",
      });
      signedBytes = result.signedTransaction;
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Signing failed or was rejected: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
      return;
    }

    setStatus({ kind: "submitting" });

    let signature: string;
    try {
      signature = await connection.sendRawTransaction(signedBytes, {
        skipPreflight: false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const logs =
        e && typeof e === "object" && "logs" in e
          ? `\nLogs:\n${(e as { logs?: string[] }).logs?.join("\n")}`
          : "";
      setStatus({
        kind: "error",
        message: `Submit failed: ${msg}${logs}`,
      });
      return;
    }

    setStatus({ kind: "confirming", signature });

    try {
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, ...latest },
        "confirmed"
      );
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Sent but not confirmed. Signature: ${signature}. Check Explorer. (${
          e instanceof Error ? e.message : String(e)
        })`,
        signature,
      });
      return;
    }

    refreshPusd();
    router.push(`/vaults/${vaultPda.toBase58()}`);
  }

  return (
    <div data-screen-label="Create vault">
      <TopBar mode="app" />

      <div className="shell-narrow" style={{ paddingBottom: 80 }}>
        <div style={{ paddingTop: 32 }}>
          <BackLink>Back to vaults</BackLink>
        </div>

        <div style={{ padding: "32px 0 28px", borderBottom: "1px solid var(--rule-2)" }}>
          <div className="h-section" style={{ marginBottom: 14 }}>
            New vault
          </div>
          <div className="h-1">
            Set the conditions under which this vault will release.
          </div>
          <p className="body" style={{ marginTop: 18, fontSize: 16 }}>
            Each section below is part of a single vault definition. Once
            submitted, the vault is deployed to Solana devnet and the conditions
            become immutable. Modifications afterward require deploying a new
            vault.
          </p>
        </div>

        <Step number="01" eyebrow="Identification" title="Name the vault.">
          <p className="body body-sm" style={{ marginBottom: 24 }}>
            For your own reference. The name is stored on-chain in a 32-byte
            field; choose something short.
          </p>
          <Field label="Vault name">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={inFlight}
            />
          </Field>
        </Step>

        <Step number="02" eyebrow="Deposit" title="The amount of PUSD to hold.">
          <p className="body body-sm" style={{ marginBottom: 24 }}>
            Funds are transferred from your wallet on submission. PUSD is
            non-freezable; once deposited, it is governed entirely by the
            conditions you set below.
          </p>
          <div className="responsive-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <Field label="Amount">
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  borderBottom: "1px solid var(--rule-2)",
                  paddingBottom: 10,
                }}
              >
                <input
                  className="input tnum"
                  style={{
                    borderBottom: "none",
                    padding: "12px 0 0",
                    fontSize: 22,
                    flex: 1,
                  }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={inFlight}
                />
                <span className="meta" style={{ marginLeft: 8, fontSize: 13 }}>
                  PUSD
                </span>
              </div>
              <div className="help">
                Wallet balance:{" "}
                <span className="tnum">
                  {walletPusd !== null ? fmtUSD(walletPusd) : "—"}
                </span>{" "}
                PUSD
              </div>
            </Field>
            <Field label="Source">
              <div style={{ paddingTop: 10 }}>
                <div className="addr" style={{ fontSize: 14, color: "var(--ink)" }}>
                  {wallet?.address ? truncateAddress(wallet.address) : "—"}
                </div>
                <div className="help">Connected wallet · Privy embedded</div>
              </div>
            </Field>
          </div>
        </Step>

        <Step number="03" eyebrow="Condition" title="What unlocks the vault.">
          <p className="body body-sm" style={{ marginBottom: 28 }}>
            Choose the trigger that will release funds. Each is evaluated
            on-chain. Only the heartbeat condition is wired to the program in
            this release; the others are roadmap.
          </p>

          <div
            className="responsive-stack"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              borderTop: "1px solid var(--rule-2)",
            }}
          >
            <ConditionRow
              selected={conditionType === "heartbeat"}
              onSelect={() => setConditionType("heartbeat")}
              title="Missed heartbeat"
              desc="Vault releases if you do not check in within a set interval."
              disabled={inFlight}
            />
            <ConditionRow
              selected={conditionType === "date"}
              onSelect={() => setConditionType("date")}
              title="Date passes"
              desc="Vault releases at a specific calendar date and time."
              disabled
            />
            <ConditionRow
              selected={conditionType === "oracle"}
              onSelect={() => setConditionType("oracle")}
              title="Oracle signal"
              desc="Vault releases when a Pyth or Switchboard feed crosses a threshold."
              disabled
            />
            <ConditionRow
              selected={conditionType === "cosigner"}
              onSelect={() => setConditionType("cosigner")}
              title="Co-signer approval"
              desc="Vault releases on signatures from a quorum of designated keys."
              last
              disabled
            />
          </div>

          {conditionType === "heartbeat" && (
            <div
              style={{
                marginTop: 36,
                paddingTop: 28,
                borderTop: "1px solid var(--rule)",
              }}
            >
              <Field label="Interval">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  {HEARTBEAT_PRESETS.map((p) => (
                    <PresetButton
                      key={p.seconds}
                      label={p.label}
                      selected={intervalSec === p.seconds}
                      onClick={() => setPreset(p.seconds)}
                      disabled={inFlight}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  <input
                    className="input tnum"
                    style={{ width: 160, fontSize: 18 }}
                    placeholder="Or N"
                    value={customDays}
                    onChange={(e) => setCustomDaysValue(e.target.value)}
                    disabled={inFlight}
                  />
                  <span className="meta">days (custom)</span>
                </div>
                <div className="help">
                  Currently selected: {formatIntervalLabel(intervalSec)} between
                  required check-ins. Minimum 60 seconds; maximum 100 years.
                </div>
              </Field>
            </div>
          )}
        </Step>

        <Step number="04" eyebrow="Beneficiary" title="Who receives the release.">
          <p className="body body-sm" style={{ marginBottom: 28 }}>
            The destination address is final. Add a label for your records (kept
            client-side only in this release).
          </p>
          <div className="responsive-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <Field label="Label (private)">
              <input
                className="input"
                value={beneficiaryLabel}
                onChange={(e) => setBeneficiaryLabel(e.target.value)}
                disabled={inFlight}
                placeholder="e.g. Aliyah"
              />
            </Field>
            <Field label="Notification email (optional)">
              <input
                className="input"
                placeholder="not stored on-chain"
                disabled={inFlight}
              />
            </Field>
          </div>
          <div style={{ marginTop: 24 }}>
            <Field label="Solana address">
              <input
                className="input addr"
                style={{ fontSize: 14 }}
                value={beneficiaryAddr}
                onChange={(e) => setBeneficiaryAddr(e.target.value)}
                disabled={inFlight}
                placeholder="base58 Solana address"
              />
              <div className="help">
                Verify carefully. Releases to incorrect addresses cannot be
                reversed.
              </div>
            </Field>
          </div>
        </Step>

        <Step number="05" eyebrow="Review" title="Read this before signing.">
          <p className="body body-sm" style={{ marginBottom: 28 }}>
            The following summarizes the vault you are about to deploy. The
            on-chain transaction is final once signed.
          </p>

          <div className="inset" style={{ padding: "32px 36px" }}>
            <div
              className="serif"
              style={{
                fontSize: 20,
                color: "var(--ink)",
                lineHeight: 1.45,
                maxWidth: "62ch",
              }}
            >
              I deposit{" "}
              <span className="tnum">{fmtUSD(amountNum)} PUSD</span> into a vault
              designated <em style={{ fontStyle: "italic" }}>&quot;{name}&quot;</em>. If{" "}
              <span style={{ borderBottom: "1px dotted var(--ink-3)" }}>
                {formatIntervalLabel(intervalSec)}
              </span>{" "}
              pass without a check-in transaction signed by my key, the vault
              releases its full balance to{" "}
              <span className="addr" style={{ fontSize: 16 }}>
                {beneficiaryAddr
                  ? `${beneficiaryAddr.slice(0, 6)}…${beneficiaryAddr.slice(-4)}`
                  : "(beneficiary address required)"}
              </span>
              {beneficiaryLabel && (
                <>
                  , designated{" "}
                  <em style={{ fontStyle: "italic" }}>{beneficiaryLabel}</em>
                </>
              )}
              .
            </div>
            <div
              style={{
                marginTop: 28,
                paddingTop: 24,
                borderTop: "1px solid var(--rule)",
              }}
            >
              <div className="h-section" style={{ marginBottom: 14 }}>
                Acknowledgements
              </div>
              <Ack>
                I understand Quiesce holds no keys to this vault and cannot
                reverse a release.
              </Ack>
              <Ack>
                I understand the on-chain program is immutable and will not be
                upgraded against me.
              </Ack>
              <Ack>
                I understand I am responsible for the heartbeat schedule. Missed
                check-ins will trigger release.
              </Ack>
            </div>
          </div>

          <div style={{ marginTop: 40 }}>
            <div className="h-section" style={{ marginBottom: 14 }}>
              Transaction
            </div>
            <dl className="dl">
              <dt>Vault id</dt>
              <dd className="tnum">#{nextVaultId.toString()}</dd>
              <dt>Network</dt>
              <dd>Solana devnet</dd>
              <dt>Instructions</dt>
              <dd>create_vault + deposit (single transaction)</dd>
              <dt>Network fee</dt>
              <dd className="tnum">~ 0.00001 SOL</dd>
              <dt>Estimated confirmation</dt>
              <dd>~ 12 seconds</dd>
            </dl>
          </div>

          <div
            style={{
              marginTop: 48,
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn-accent"
              onClick={handleSubmit}
              disabled={inFlight || !program || !wallet?.address}
              style={{ opacity: inFlight ? 0.6 : 1 }}
            >
              {inFlight ? "Working…" : "Sign and submit"}
            </button>
            <BackLink>Cancel</BackLink>
            {statusMessage && (
              <span className="meta" style={{ marginLeft: 8 }}>
                {statusMessage}
                {status.kind === "confirming" && status.signature && (
                  <>
                    {" · "}
                    <span className="addr" style={{ fontSize: 11 }}>
                      {status.signature.slice(0, 8)}…
                    </span>
                  </>
                )}
              </span>
            )}
          </div>
          {status.kind === "error" && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 16px",
                border: "1px solid var(--rule-2)",
                borderLeft: "3px solid var(--accent)",
                background: "var(--paper-2)",
                fontSize: 13.5,
                color: "var(--ink)",
                whiteSpace: "pre-wrap",
              }}
            >
              {status.message}
              {status.signature && (
                <div className="meta" style={{ marginTop: 6 }}>
                  Signature:{" "}
                  <span className="addr" style={{ fontSize: 11 }}>
                    {status.signature}
                  </span>
                </div>
              )}
            </div>
          )}
        </Step>
      </div>
    </div>
  );
}
