"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import type { OnChainVault, VaultStatusKind } from "./useUserVaults";
import { useQuiesceProgram } from "./useQuiesceProgram";

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

export function useVault(vaultPdaString: string | null): {
  vault: OnChainVault | null;
  isLoading: boolean;
  notFound: boolean;
  refresh: () => void;
} {
  const { program } = useQuiesceProgram();
  const [vault, setVault] = useState<OnChainVault | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!vaultPdaString) {
      setVault(null);
      setIsLoading(false);
      setNotFound(false);
      return;
    }

    let pda: PublicKey;
    try {
      pda = new PublicKey(vaultPdaString);
    } catch {
      setVault(null);
      setIsLoading(false);
      setNotFound(true);
      return;
    }

    if (!program) {
      // program not yet ready — defer
      setIsLoading(true);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setNotFound(false);

    (async () => {
      try {
        const acc = (await program.account.vault.fetch(pda)) as unknown as {
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
        if (cancelled) return;
        const decoded: OnChainVault = {
          publicKey: pda,
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
        setVault(decoded);
        setNotFound(false);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        if (
          /Account does not exist/i.test(message) ||
          /could not find account/i.test(message)
        ) {
          setVault(null);
          setNotFound(true);
        } else {
          setVault(null);
          setNotFound(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [program, vaultPdaString, tick]);

  return { vault, isLoading, notFound, refresh };
}
