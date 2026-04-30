import { BN, Program } from "@coral-xyz/anchor";
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
import { getVaultPda } from "@/lib/program";
import type { Quiesce } from "@/lib/idl/quiesce";

export type BuildCreateVaultParams = {
  program: Program<Quiesce>;
  connection: Connection;
  owner: PublicKey;
  beneficiary: PublicKey;
  mint: PublicKey;
  vaultId: bigint;
  name: string;
  heartbeatIntervalSec: bigint;
  depositAmount: bigint;
};

export async function buildCreateVaultTx(
  params: BuildCreateVaultParams
): Promise<{ vaultPda: PublicKey; tx: Transaction }> {
  const {
    program,
    connection,
    owner,
    beneficiary,
    mint,
    vaultId,
    name,
    heartbeatIntervalSec,
    depositAmount,
  } = params;

  const vaultIdBn = new BN(vaultId.toString());
  const [vaultPda] = getVaultPda(program.programId, owner, vaultIdBn);

  const ownerAta = await getAssociatedTokenAddress(mint, owner);
  // PDA-owned ATA — allowOwnerOffCurve must be true.
  const vaultAta = await getAssociatedTokenAddress(mint, vaultPda, true);

  // Encode vault name to a 32-byte array, padded with zeros.
  const encoded = new TextEncoder().encode(name);
  if (encoded.length > 32) {
    throw new Error("Vault name exceeds 32 bytes when UTF-8 encoded.");
  }
  const namePadded = new Uint8Array(32);
  namePadded.set(encoded);

  // Account list mirrors tests/quiesce.ts:100-110 exactly.
  const createIx = await program.methods
    .createVault(
      vaultIdBn,
      Array.from(namePadded),
      beneficiary,
      new BN(heartbeatIntervalSec.toString())
    )
    .accountsStrict({
      owner,
      beneficiary,
      mint,
      vault: vaultPda,
      vaultTokenAccount: vaultAta,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  // Account list mirrors tests/quiesce.ts:132-139 exactly.
  const depositIx = await program.methods
    .deposit(new BN(depositAmount.toString()))
    .accountsStrict({
      owner,
      vault: vaultPda,
      mint,
      vaultTokenAccount: vaultAta,
      ownerTokenAccount: ownerAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const tx = new Transaction().add(createIx).add(depositIx);
  tx.feePayer = owner;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  return { vaultPda, tx };
}
