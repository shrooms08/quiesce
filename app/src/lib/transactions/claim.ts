import { Program } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import type { Quiesce } from "@/lib/idl/quiesce";
import type { OnChainVault } from "@/hooks/useUserVaults";

export async function buildClaimTx(params: {
  program: Program<Quiesce>;
  connection: Connection;
  caller: PublicKey;
  vaultPda: PublicKey;
  vault: OnChainVault;
}): Promise<{ tx: Transaction }> {
  const { program, connection, caller, vaultPda, vault } = params;

  // PDA-owned ATA — allowOwnerOffCurve must be true.
  const vaultAta = await getAssociatedTokenAddress(
    vault.mint,
    vaultPda,
    true
  );
  // Default ATA for the beneficiary (a regular wallet address).
  // The program's init_if_needed creates this if it doesn't exist; caller pays rent.
  const beneficiaryAta = await getAssociatedTokenAddress(
    vault.mint,
    vault.beneficiary
  );

  // Account list mirrors tests/quiesce.ts:326-338 (and 383-395) exactly.
  const ix = await program.methods
    .claim()
    .accountsStrict({
      caller,
      vault: vaultPda,
      vaultTokenAccount: vaultAta,
      beneficiary: vault.beneficiary,
      beneficiaryTokenAccount: beneficiaryAta,
      mint: vault.mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  const tx = new Transaction().add(ix);
  tx.feePayer = caller;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  return { tx };
}
