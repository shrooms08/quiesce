"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useQuiesceProgram } from "@/hooks/useQuiesceProgram";
import { useUserVaults } from "@/hooks/useUserVaults";
import { useUserPusdBalance } from "@/hooks/useUserPusdBalance";
import { buildCreateVaultTx } from "@/lib/transactions/createVault";
import { MOCK_PUSD_MINT } from "@/lib/constants";
import { truncateAddress } from "@/lib/format";
import type { VaultProposal } from "@/lib/agent/types";

const MIN_SOL_LAMPORTS = 0.005 * LAMPORTS_PER_SOL;

type CardState =
  | { kind: "idle" }
  | { kind: "running"; label: string }
  | { kind: "signed"; signature: string; vaultPda: string }
  | { kind: "error"; message: string };

export function ProposalCard({
  proposal,
  onSigned,
}: {
  proposal: VaultProposal;
  onSigned: (signature: string, vaultPda: string) => void;
}) {
  const { program, connection, wallet } = useQuiesceProgram();
  const { vaults, refresh: refreshVaults } = useUserVaults();
  const { balance: pusdBalance, refresh: refreshPusd } = useUserPusdBalance();
  const [state, setState] = useState<CardState>({ kind: "idle" });

  const nextVaultId = useMemo<bigint>(() => {
    if (vaults.length === 0) return 0n;
    let max = vaults[0].vaultId;
    for (const v of vaults) if (v.vaultId > max) max = v.vaultId;
    return max + 1n;
  }, [vaults]);

  const running = state.kind === "running";
  const signed = state.kind === "signed";

  async function handleSign() {
    if (signed || running) return;

    if (!program || !wallet?.address) {
      setState({
        kind: "error",
        message: "Wallet not connected. Sign in from the top of the app.",
      });
      return;
    }

    let owner: PublicKey;
    try {
      owner = new PublicKey(wallet.address);
    } catch {
      setState({
        kind: "error",
        message: "Connected wallet address is invalid.",
      });
      return;
    }

    let beneficiary: PublicKey;
    try {
      beneficiary = new PublicKey(proposal.params.beneficiaryAddress);
    } catch {
      setState({
        kind: "error",
        message: "Beneficiary in the proposal is not a valid Solana address.",
      });
      return;
    }

    if (beneficiary.equals(owner)) {
      setState({
        kind: "error",
        message:
          "Beneficiary cannot equal the owner. Ask the agent to propose with a different beneficiary address.",
      });
      return;
    }

    const depositBaseUnits = BigInt(proposal.params.depositAmountBaseUnits);
    if (pusdBalance !== null && depositBaseUnits > pusdBalance) {
      setState({
        kind: "error",
        message: `Insufficient PUSD. Wallet holds ${
          (Number(pusdBalance) / 1_000_000).toLocaleString()
        } PUSD; proposal requires ${proposal.summary.depositHumanReadable}.`,
      });
      return;
    }

    setState({ kind: "running", label: "Checking SOL balance…" });
    try {
      const sol = await connection.getBalance(owner);
      if (sol < MIN_SOL_LAMPORTS) {
        setState({
          kind: "error",
          message:
            "Wallet has less than 0.005 SOL. Top up devnet SOL before signing.",
        });
        return;
      }
    } catch (e) {
      setState({
        kind: "error",
        message: `Could not read SOL balance: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
      return;
    }

    setState({ kind: "running", label: "Building transaction…" });

    let vaultPda: PublicKey;
    let tx;
    try {
      const built = await buildCreateVaultTx({
        program,
        connection,
        owner,
        beneficiary,
        mint: new PublicKey(MOCK_PUSD_MINT),
        vaultId: nextVaultId,
        name: proposal.params.name,
        heartbeatIntervalSec: BigInt(proposal.params.heartbeatIntervalSec),
        depositAmount: depositBaseUnits,
      });
      vaultPda = built.vaultPda;
      tx = built.tx;
    } catch (e) {
      setState({
        kind: "error",
        message: `Failed to build transaction: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
      return;
    }

    setState({ kind: "running", label: "Awaiting signature…" });

    let signedBytes: Uint8Array;
    try {
      const serialized = tx.serialize({ requireAllSignatures: false });
      const result = await wallet.signTransaction({
        transaction: new Uint8Array(serialized),
        chain: "solana:devnet",
      });
      signedBytes = result.signedTransaction;
    } catch (e) {
      setState({
        kind: "error",
        message: `Signing failed or was rejected: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
      return;
    }

    setState({ kind: "running", label: "Submitting…" });
    let signature: string;
    try {
      signature = await connection.sendRawTransaction(signedBytes, {
        skipPreflight: false,
      });
    } catch (e) {
      setState({
        kind: "error",
        message: `Submit failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
      return;
    }

    setState({ kind: "running", label: "Confirming on devnet…" });
    try {
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, ...latest },
        "confirmed"
      );
    } catch (e) {
      setState({
        kind: "error",
        message: `Sent but not confirmed. Signature: ${signature}. (${
          e instanceof Error ? e.message : String(e)
        })`,
      });
      return;
    }

    refreshPusd();
    refreshVaults();
    setState({ kind: "signed", signature, vaultPda: vaultPda.toBase58() });
    onSigned(signature, vaultPda.toBase58());
  }

  const beneficiaryFull = proposal.params.beneficiaryAddress;

  return (
    <div
      style={{
        marginTop: 16,
        padding: 20,
        background: "var(--paper-2)",
        border: "1px solid var(--rule-2)",
        borderRadius: 4,
        maxWidth: "62ch",
      }}
    >
      <div className="h-section" style={{ marginBottom: 14 }}>
        Vault proposal
      </div>

      <dl
        className="dl"
        style={{
          gridTemplateColumns: "140px 1fr",
          marginBottom: 18,
        }}
      >
        <dt>Name</dt>
        <dd>{proposal.params.name}</dd>
        <dt>Beneficiary</dt>
        <dd>
          <span className="addr">{truncateAddress(beneficiaryFull)}</span>
          <div
            className="meta"
            style={{ marginTop: 4, fontSize: 11, wordBreak: "break-all" }}
          >
            {beneficiaryFull}
          </div>
        </dd>
        <dt>Heartbeat</dt>
        <dd>{proposal.summary.heartbeatHumanReadable}</dd>
        <dt>Deposit</dt>
        <dd className="tnum">{proposal.summary.depositHumanReadable}</dd>
      </dl>

      {!signed && (
        <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-accent"
              onClick={handleSign}
              disabled={running || !wallet?.address}
              style={{ opacity: running || !wallet?.address ? 0.6 : 1 }}
            >
              {running ? "Working…" : "Review and sign"}
            </button>
            {!wallet?.address && (
              <span className="meta">Sign in to create the vault.</span>
            )}
            {state.kind === "running" && (
              <span className="meta">{state.label}</span>
            )}
          </div>
          {state.kind === "error" && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                border: "1px solid var(--rule-2)",
                borderLeft: "3px solid var(--accent)",
                background: "var(--paper)",
                fontSize: 13,
                color: "var(--ink)",
                whiteSpace: "pre-wrap",
              }}
            >
              {state.message}
            </div>
          )}
        </>
      )}

      {signed && (
        <div>
          <div className="h-section" style={{ marginBottom: 8 }}>
            Created
          </div>
          <div className="body-sm" style={{ marginBottom: 12 }}>
            Transaction confirmed on devnet.
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Link href={`/vaults/${state.vaultPda}`} className="btn btn-sm">
              View vault
            </Link>
            <a
              href={`https://explorer.solana.com/tx/${state.signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="meta"
              style={{ color: "var(--ink-2)", textDecoration: "underline" }}
            >
              View on Explorer →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
