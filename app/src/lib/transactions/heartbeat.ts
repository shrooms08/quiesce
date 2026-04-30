import { Program } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import type { Quiesce } from "@/lib/idl/quiesce";

export async function buildHeartbeatTx(params: {
  program: Program<Quiesce>;
  connection: Connection;
  owner: PublicKey;
  vaultPda: PublicKey;
}): Promise<Transaction> {
  const { program, connection, owner, vaultPda } = params;

  // Account list mirrors tests/quiesce.ts:159-166 exactly.
  const ix = await program.methods
    .heartbeat()
    .accountsStrict({
      owner,
      vault: vaultPda,
    })
    .instruction();

  const tx = new Transaction().add(ix);
  tx.feePayer = owner;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  return tx;
}
