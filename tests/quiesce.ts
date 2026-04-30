import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Quiesce } from "../target/types/quiesce";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";

const VAULT_SEED = Buffer.from("vault");

function nameBytes(s: string): number[] {
  const buf = Buffer.alloc(32);
  buf.write(s, "utf-8");
  return Array.from(buf);
}

function vaultPda(
  programId: PublicKey,
  owner: PublicKey,
  vaultId: BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, owner.toBuffer(), vaultId.toArrayLike(Buffer, "le", 8)],
    programId
  );
}

async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  sol: number
) {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    { signature: sig, ...latest },
    "confirmed"
  );
}

describe("quiesce", function () {
  this.timeout(180_000);

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;
  const program = anchor.workspace.Quiesce as Program<Quiesce>;

  const owner = Keypair.generate();
  const beneficiary = Keypair.generate();
  const randomCaller = Keypair.generate();

  let mint: PublicKey;
  let ownerAta: PublicKey;

  before(async () => {
    await airdrop(connection, owner.publicKey, 5);
    await airdrop(connection, beneficiary.publicKey, 1);
    await airdrop(connection, randomCaller.publicKey, 2);

    mint = await createMint(
      connection,
      owner,
      owner.publicKey,
      null,
      6
    );

    const ownerAtaAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      owner,
      mint,
      owner.publicKey
    );
    ownerAta = ownerAtaAccount.address;

    await mintTo(connection, owner, mint, ownerAta, owner, 10_000);
  });

  it("creates a vault (id=1)", async () => {
    const vaultId = new BN(1);
    const [vaultPk] = vaultPda(program.programId, owner.publicKey, vaultId);
    const vaultAta = await getAssociatedTokenAddress(mint, vaultPk, true);

    await program.methods
      .createVault(vaultId, nameBytes("Test Vault"), beneficiary.publicKey, new BN(60))
      .accountsStrict({
        owner: owner.publicKey,
        beneficiary: beneficiary.publicKey,
        mint,
        vault: vaultPk,
        vaultTokenAccount: vaultAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([owner])
      .rpc();

    const vault = await program.account.vault.fetch(vaultPk);
    expect(vault.owner.toBase58()).to.equal(owner.publicKey.toBase58());
    expect(vault.beneficiary.toBase58()).to.equal(beneficiary.publicKey.toBase58());
    expect(vault.mint.toBase58()).to.equal(mint.toBase58());
    expect(vault.amount.toString()).to.equal("0");
    expect(vault.heartbeatInterval.toString()).to.equal("60");
    expect(vault.status).to.deep.equal({ active: {} });
    const expectedName = Buffer.from(nameBytes("Test Vault"));
    expect(Buffer.from(vault.name).equals(expectedName)).to.equal(true);
  });

  it("deposits 1000 base units", async () => {
    const vaultId = new BN(1);
    const [vaultPk] = vaultPda(program.programId, owner.publicKey, vaultId);
    const vaultAta = await getAssociatedTokenAddress(mint, vaultPk, true);

    await program.methods
      .deposit(new BN(1000))
      .accountsStrict({
        owner: owner.publicKey,
        vault: vaultPk,
        mint,
        vaultTokenAccount: vaultAta,
        ownerTokenAccount: ownerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();

    const vault = await program.account.vault.fetch(vaultPk);
    expect(vault.amount.toString()).to.equal("1000");

    const vaultTokenAccount = await getAccount(connection, vaultAta);
    expect(vaultTokenAccount.amount.toString()).to.equal("1000");
  });

  it("records a heartbeat", async () => {
    const vaultId = new BN(1);
    const [vaultPk] = vaultPda(program.programId, owner.publicKey, vaultId);

    const before = await program.account.vault.fetch(vaultPk);
    const oldHeartbeat = before.lastHeartbeat.toNumber();

    await new Promise((r) => setTimeout(r, 1100));

    await program.methods
      .heartbeat()
      .accountsStrict({
        owner: owner.publicKey,
        vault: vaultPk,
      })
      .signers([owner])
      .rpc();

    const after = await program.account.vault.fetch(vaultPk);
    expect(after.lastHeartbeat.toNumber()).to.be.greaterThan(oldHeartbeat);
  });

  it("cancels a vault (id=2) and returns funds to owner", async () => {
    const vaultId = new BN(2);
    const [vaultPk] = vaultPda(program.programId, owner.publicKey, vaultId);
    const vaultAta = await getAssociatedTokenAddress(mint, vaultPk, true);

    await program.methods
      .createVault(vaultId, nameBytes("Cancel Vault"), beneficiary.publicKey, new BN(60))
      .accountsStrict({
        owner: owner.publicKey,
        beneficiary: beneficiary.publicKey,
        mint,
        vault: vaultPk,
        vaultTokenAccount: vaultAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([owner])
      .rpc();

    await program.methods
      .deposit(new BN(500))
      .accountsStrict({
        owner: owner.publicKey,
        vault: vaultPk,
        mint,
        vaultTokenAccount: vaultAta,
        ownerTokenAccount: ownerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();

    const ownerBalanceBefore = (await getAccount(connection, ownerAta)).amount;

    await program.methods
      .cancel()
      .accountsStrict({
        owner: owner.publicKey,
        vault: vaultPk,
        vaultTokenAccount: vaultAta,
        ownerTokenAccount: ownerAta,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();

    const vault = await program.account.vault.fetch(vaultPk);
    expect(vault.status).to.deep.equal({ cancelled: {} });
    expect(vault.amount.toString()).to.equal("0");

    const ownerBalanceAfter = (await getAccount(connection, ownerAta)).amount;
    expect((ownerBalanceAfter - ownerBalanceBefore).toString()).to.equal("500");

    const vaultBalance = (await getAccount(connection, vaultAta)).amount;
    expect(vaultBalance.toString()).to.equal("0");
  });

  it("rejects a vault with self as beneficiary", async () => {
    const vaultId = new BN(99);
    const [vaultPk] = vaultPda(program.programId, owner.publicKey, vaultId);
    const vaultAta = await getAssociatedTokenAddress(mint, vaultPk, true);

    try {
      await program.methods
        .createVault(vaultId, nameBytes("Self"), owner.publicKey, new BN(60))
        .accountsStrict({
          owner: owner.publicKey,
          beneficiary: owner.publicKey,
          mint,
          vault: vaultPk,
          vaultTokenAccount: vaultAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([owner])
        .rpc();
      expect.fail("expected SelfBeneficiary");
    } catch (err: any) {
      expect(err.error?.errorCode?.code ?? err.toString()).to.contain("SelfBeneficiary");
    }
  });

  it("rejects a vault with heartbeat_interval=30", async () => {
    const vaultId = new BN(98);
    const [vaultPk] = vaultPda(program.programId, owner.publicKey, vaultId);
    const vaultAta = await getAssociatedTokenAddress(mint, vaultPk, true);

    try {
      await program.methods
        .createVault(vaultId, nameBytes("Short"), beneficiary.publicKey, new BN(30))
        .accountsStrict({
          owner: owner.publicKey,
          beneficiary: beneficiary.publicKey,
          mint,
          vault: vaultPk,
          vaultTokenAccount: vaultAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([owner])
        .rpc();
      expect.fail("expected InvalidHeartbeatInterval");
    } catch (err: any) {
      expect(err.error?.errorCode?.code ?? err.toString()).to.contain("InvalidHeartbeatInterval");
    }
  });

  it("rejects claim before heartbeat expires (id=4)", async () => {
    const vaultId = new BN(4);
    const [vaultPk] = vaultPda(program.programId, owner.publicKey, vaultId);
    const vaultAta = await getAssociatedTokenAddress(mint, vaultPk, true);
    const beneficiaryAta = await getAssociatedTokenAddress(
      mint,
      beneficiary.publicKey
    );

    await program.methods
      .createVault(vaultId, nameBytes("Early Claim"), beneficiary.publicKey, new BN(60))
      .accountsStrict({
        owner: owner.publicKey,
        beneficiary: beneficiary.publicKey,
        mint,
        vault: vaultPk,
        vaultTokenAccount: vaultAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([owner])
      .rpc();

    await program.methods
      .deposit(new BN(100))
      .accountsStrict({
        owner: owner.publicKey,
        vault: vaultPk,
        mint,
        vaultTokenAccount: vaultAta,
        ownerTokenAccount: ownerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();

    try {
      await program.methods
        .claim()
        .accountsStrict({
          caller: randomCaller.publicKey,
          vault: vaultPk,
          vaultTokenAccount: vaultAta,
          beneficiary: beneficiary.publicKey,
          beneficiaryTokenAccount: beneficiaryAta,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([randomCaller])
        .rpc();
      expect.fail("expected HeartbeatStillValid");
    } catch (err: any) {
      expect(err.error?.errorCode?.code ?? err.toString()).to.contain("HeartbeatStillValid");
    }
  });

  it("waits for heartbeat expiry, then claims (id=1) and rejects late cancel (id=3)", async () => {
    // Create vault id=3 (will be used to test post-expiry cancel).
    const vault3Id = new BN(3);
    const [vault3Pk] = vaultPda(program.programId, owner.publicKey, vault3Id);
    const vault3Ata = await getAssociatedTokenAddress(mint, vault3Pk, true);

    await program.methods
      .createVault(vault3Id, nameBytes("Expired Cancel"), beneficiary.publicKey, new BN(60))
      .accountsStrict({
        owner: owner.publicKey,
        beneficiary: beneficiary.publicKey,
        mint,
        vault: vault3Pk,
        vaultTokenAccount: vault3Ata,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([owner])
      .rpc();

    // Vault id=1 is already created and funded with 1000 from earlier tests.
    const vault1Id = new BN(1);
    const [vault1Pk] = vaultPda(program.programId, owner.publicKey, vault1Id);
    const vault1Ata = await getAssociatedTokenAddress(mint, vault1Pk, true);
    const beneficiaryAta = await getAssociatedTokenAddress(
      mint,
      beneficiary.publicKey
    );

    // Sleep past the 60s heartbeat window.
    await new Promise((r) => setTimeout(r, 65_000));

    // Claim vault id=1 from randomCaller.
    await program.methods
      .claim()
      .accountsStrict({
        caller: randomCaller.publicKey,
        vault: vault1Pk,
        vaultTokenAccount: vault1Ata,
        beneficiary: beneficiary.publicKey,
        beneficiaryTokenAccount: beneficiaryAta,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([randomCaller])
      .rpc();

    const vault1 = await program.account.vault.fetch(vault1Pk);
    expect(vault1.status).to.deep.equal({ claimed: {} });
    expect(vault1.amount.toString()).to.equal("0");

    const beneficiaryBalance = (await getAccount(connection, beneficiaryAta)).amount;
    expect(beneficiaryBalance.toString()).to.equal("1000");

    // Cannot cancel vault id=3 — heartbeat has expired.
    try {
      await program.methods
        .cancel()
        .accountsStrict({
          owner: owner.publicKey,
          vault: vault3Pk,
          vaultTokenAccount: vault3Ata,
          ownerTokenAccount: ownerAta,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc();
      expect.fail("expected HeartbeatExpired");
    } catch (err: any) {
      expect(err.error?.errorCode?.code ?? err.toString()).to.contain("HeartbeatExpired");
    }

    // Cannot deposit to claimed vault id=1.
    try {
      await program.methods
        .deposit(new BN(1))
        .accountsStrict({
          owner: owner.publicKey,
          vault: vault1Pk,
          mint,
          vaultTokenAccount: vault1Ata,
          ownerTokenAccount: ownerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc();
      expect.fail("expected VaultNotActive");
    } catch (err: any) {
      expect(err.error?.errorCode?.code ?? err.toString()).to.contain("VaultNotActive");
    }
  });
});
