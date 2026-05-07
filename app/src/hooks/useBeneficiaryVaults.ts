"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useQuiesceProgram } from "./useQuiesceProgram";
import type { OnChainVault, VaultStatusKind } from "./useUserVaults";

// Vault account layout (programs/quiesce/src/lib.rs):
//   8 bytes   account discriminator
//  32 bytes   owner: Pubkey      (offset  8)
//  32 bytes   beneficiary: Pubkey (offset 40)
//   ...
const BENEFICIARY_OFFSET = 40;

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

/**
 * Returns every Quiesce vault on devnet where the connected wallet is the
 * beneficiary. Runs once on mount and on wallet change; exposes refresh()
 * for explicit re-fetch.
 *
 * Mirrors useUserVaults but filters by beneficiary (offset 40) instead of
 * owner (offset 8).
 */
export function useBeneficiaryVaults(): {
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
        const beneficiary = new PublicKey(wallet.address);
        const accounts = await program.account.vault.all([
          {
            memcmp: {
              offset: BENEFICIARY_OFFSET,
              bytes: beneficiary.toBase58(),
            },
          },
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

        // Triggered (claimable) first, then active by soonest expiry, then closed.
        const nowSec = Math.floor(Date.now() / 1000);
        const rank = (v: OnChainVault) => {
          if (v.status !== "active") return 2;
          const expiry = Number(v.lastHeartbeat) + Number(v.heartbeatInterval);
          return nowSec > expiry ? 0 : 1;
        };
        decoded.sort((a, b) => {
          const ra = rank(a);
          const rb = rank(b);
          if (ra !== rb) return ra - rb;
          const ea = Number(a.lastHeartbeat) + Number(a.heartbeatInterval);
          const eb = Number(b.lastHeartbeat) + Number(b.heartbeatInterval);
          return ea - eb;
        });

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
