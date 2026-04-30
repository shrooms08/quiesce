import { Program } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import type { Quiesce } from "@/lib/idl/quiesce";

export async function buildCancelTx(params: {
  program: Program<Quiesce>;
  connection: Connection;
  owner: PublicKey;
  vaultPda: PublicKey;
  mint: PublicKey;
}): Promise<Transaction> {
  const { program, connection, owner, vaultPda, mint } = params;

  const ownerAta = await getAssociatedTokenAddress(mint, owner);
  // PDA-owned ATA: allowOwnerOffCurve must be true.
  const vaultAta = await getAssociatedTokenAddress(mint, vaultPda, true);

  // Account list mirrors tests/quiesce.ts:208-219 exactly.
  const ix = await program.methods
    .cancel()
    .accountsStrict({
      owner,
      vault: vaultPda,
      vaultTokenAccount: vaultAta,
      ownerTokenAccount: ownerAta,
      mint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const tx = new Transaction().add(ix);
  tx.feePayer = owner;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  return tx;
}
