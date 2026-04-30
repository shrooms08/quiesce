"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useQuiesceProgram } from "./useQuiesceProgram";

export type VaultStatusKind = "active" | "claimed" | "cancelled";

export type OnChainVault = {
  publicKey: PublicKey;
  owner: PublicKey;
  beneficiary: PublicKey;
  mint: PublicKey;
  amount: bigint;
  heartbeatInterval: bigint;
  lastHeartbeat: bigint;
  createdAt: bigint;
  status: VaultStatusKind;
  vaultId: bigint;
  bump: number;
  name: string;
};

function statusKindOf(status: unknown): VaultStatusKind {
  if (status && typeof status === "object") {
    if ("active" in status) return "active";
    if ("claimed" in status) return "claimed";
    if ("cancelled" in status) return "cancelled";
  }
  return "active";
}

function decodeName(bytes: number[] | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  // strip trailing nulls
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) end--;
  return new TextDecoder("utf-8").decode(arr.subarray(0, end));
}

function toBigInt(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(v);
  if (v && typeof (v as { toString: () => string }).toString === "function") {
    return BigInt((v as { toString: () => string }).toString());
  }
  return 0n;
}

export function useUserVaults(): {
  vaults: OnChainVault[];
  isLoading: boolean;
  refresh: () => void;
} {
  const { program, wallet } = useQuiesceProgram();
  const [vaults, setVaults] = useState<OnChainVault[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!program || !wallet?.address) {
      setVaults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const owner = new PublicKey(wallet.address);
        // owner is at offset 8 (right after the 8-byte discriminator)
        const accounts = await program.account.vault.all([
          { memcmp: { offset: 8, bytes: owner.toBase58() } },
        ]);

        const decoded: OnChainVault[] = accounts.map((a) => {
          const acc = a.account as unknown as {
            owner: PublicKey;
            beneficiary: PublicKey;
            mint: PublicKey;
            amount: { toString: () => string };
            heartbeatInterval: { toString: () => string };
            lastHeartbeat: { toString: () => string };
            createdAt: { toString: () => string };
            status: unknown;
            vaultId: { toString: () => string };
            bump: number;
            name: number[];
          };
          return {
            publicKey: a.publicKey,
            owner: acc.owner,
            beneficiary: acc.beneficiary,
            mint: acc.mint,
            amount: toBigInt(acc.amount),
            heartbeatInterval: toBigInt(acc.heartbeatInterval),
            lastHeartbeat: toBigInt(acc.lastHeartbeat),
            createdAt: toBigInt(acc.createdAt),
            status: statusKindOf(acc.status),
            vaultId: toBigInt(acc.vaultId),
            bump: acc.bump,
            name: decodeName(acc.name),
          };
        });

        decoded.sort((a, b) =>
          a.vaultId < b.vaultId ? -1 : a.vaultId > b.vaultId ? 1 : 0
        );

        if (!cancelled) setVaults(decoded);
      } catch {
        if (!cancelled) setVaults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [program, wallet?.address, tick]);

  return { vaults, isLoading, refresh };
}
