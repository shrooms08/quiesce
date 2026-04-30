"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddress,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";
import { MOCK_PUSD_MINT } from "@/lib/constants";
import { useQuiesceProgram } from "./useQuiesceProgram";

export function useUserPusdBalance(): {
  balance: bigint | null;
  isLoading: boolean;
  refresh: () => void;
} {
  const { connection, wallet } = useQuiesceProgram();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!wallet?.address) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const owner = new PublicKey(wallet.address);
        const mint = new PublicKey(MOCK_PUSD_MINT);
        const ata = await getAssociatedTokenAddress(mint, owner);
        try {
          const account = await getAccount(connection, ata);
          if (!cancelled) setBalance(account.amount);
        } catch (err) {
          if (
            err instanceof TokenAccountNotFoundError ||
            err instanceof TokenInvalidAccountOwnerError
          ) {
            if (!cancelled) setBalance(0n);
          } else {
            throw err;
          }
        }
      } catch {
        if (!cancelled) setBalance(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallet?.address, connection, tick]);

  return { balance, isLoading, refresh };
}
