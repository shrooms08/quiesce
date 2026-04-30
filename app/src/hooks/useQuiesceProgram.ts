"use client";

import { useMemo } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type { Wallet } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { SOLANA_RPC_URL } from "@/lib/constants";
import { getQuiesceProgram } from "@/lib/program";
import type { Quiesce } from "@/lib/idl/quiesce";

type AnyTx = Transaction | VersionedTransaction;

type PrivySolanaWallet = {
  address: string;
  signTransaction: (input: {
    transaction: Uint8Array;
    chain?: string;
  }) => Promise<{ signedTransaction: Uint8Array }>;
};

function buildAnchorWallet(privyWallet: PrivySolanaWallet): Wallet {
  const publicKey = new PublicKey(privyWallet.address);

  const signOne = async <T extends AnyTx>(tx: T): Promise<T> => {
    const isVersioned = tx instanceof VersionedTransaction;
    const serialized = isVersioned
      ? tx.serialize()
      : (tx as Transaction).serialize({ requireAllSignatures: false });
    const { signedTransaction } = await privyWallet.signTransaction({
      transaction: new Uint8Array(serialized),
      chain: "solana:devnet",
    });
    if (isVersioned) {
      return VersionedTransaction.deserialize(signedTransaction) as T;
    }
    return Transaction.from(signedTransaction) as T;
  };

  return {
    publicKey,
    signTransaction: signOne,
    signAllTransactions: async <T extends AnyTx>(txs: T[]): Promise<T[]> =>
      Promise.all(txs.map((t) => signOne(t))),
    payer: undefined as never,
  } as unknown as Wallet;
}

export function useQuiesceProgram(): {
  program: Program<Quiesce> | null;
  connection: Connection;
  wallet: PrivySolanaWallet | null;
  isReady: boolean;
} {
  const { authenticated } = usePrivy();
  const { wallets, ready } = useSolanaWallets();

  const connection = useMemo(
    () => new Connection(SOLANA_RPC_URL, "confirmed"),
    []
  );

  const wallet = (wallets[0] ?? null) as PrivySolanaWallet | null;

  const program = useMemo<Program<Quiesce> | null>(() => {
    if (!authenticated || !ready || !wallet) return null;
    try {
      const anchorWallet = buildAnchorWallet(wallet);
      return getQuiesceProgram(connection, anchorWallet);
    } catch {
      return null;
    }
  }, [authenticated, ready, wallet, connection]);

  return {
    program,
    connection,
    wallet,
    isReady: program !== null && wallet !== null,
  };
}
