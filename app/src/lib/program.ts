import { AnchorProvider, BN, Program, type Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { QUIESCE_PROGRAM_ID } from "./constants";
import quiesceIdl from "./idl/quiesce.json";
import type { Quiesce } from "./idl/quiesce";

export const QUIESCE_PROGRAM_PUBKEY = new PublicKey(QUIESCE_PROGRAM_ID);

const VAULT_SEED = Buffer.from("vault");

export function getQuiesceProgram(
  connection: Connection,
  wallet: Wallet
): Program<Quiesce> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program<Quiesce>(quiesceIdl as Quiesce, provider);
}

export function getVaultPda(
  programId: PublicKey,
  owner: PublicKey,
  vaultId: BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, owner.toBuffer(), vaultId.toArrayLike(Buffer, "le", 8)],
    programId
  );
}
