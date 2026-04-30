/**
 * deploy-mock-pusd.ts
 *
 * Creates a mock PUSD SPL token mint on Solana devnet for use during
 * Quiesce development and demos. Mints 1,000,000 tokens (6 decimals) to
 * the deployer's associated token account so we have a treasury to
 * airdrop from.
 *
 * PUSD on mainnet is non-freezable by design. This mock mirrors that
 * property by passing null as the freeze authority.
 *
 * The mint address is written to scripts/mock-pusd-mint.txt. If that file
 * already exists, this script is a no-op so we don't accidentally create
 * a second mint and lose track of the first.
 *
 * Usage:
 *   yarn deploy:mock-pusd
 */

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const DEVNET_RPC = "https://api.devnet.solana.com";
const DECIMALS = 6;
const SUPPLY = 1_000_000 * Math.pow(10, DECIMALS); // 1e12 base units = 1,000,000 PUSD
const MINT_FILE = path.join(__dirname, "mock-pusd-mint.txt");
const KEYPAIR_PATH = path.join(os.homedir(), ".config", "solana", "id.json");

function loadKeypair(file: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main() {
  if (fs.existsSync(MINT_FILE)) {
    const existing = fs.readFileSync(MINT_FILE, "utf8").trim();
    console.log("Mock PUSD mint already exists. Not creating a new one.");
    console.log(`  Mint: ${existing}`);
    console.log(`  (To force re-deploy, delete ${MINT_FILE} first.)`);
    return;
  }

  const connection = new Connection(DEVNET_RPC, "confirmed");
  const deployer = loadKeypair(KEYPAIR_PATH);
  const balance = await connection.getBalance(deployer.publicKey);
  console.log(`Deployer:        ${deployer.publicKey.toBase58()}`);
  console.log(`Deployer SOL:    ${(balance / LAMPORTS_PER_SOL).toFixed(4)}`);

  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    throw new Error("Deployer has < 0.5 SOL. Top up before deploying.");
  }

  console.log("Creating mock PUSD mint (6 decimals, no freeze authority)...");
  const mint = await createMint(
    connection,
    deployer,
    deployer.publicKey, // mint authority
    null,               // freeze authority — INTENTIONALLY null to mirror real PUSD
    DECIMALS
  );
  console.log(`Mint:            ${mint.toBase58()}`);

  console.log("Creating deployer ATA...");
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    deployer,
    mint,
    deployer.publicKey
  );
  console.log(`Deployer ATA:    ${ata.address.toBase58()}`);

  console.log(`Minting ${SUPPLY} base units (1,000,000 PUSD) to ATA...`);
  const sig = await mintTo(
    connection,
    deployer,
    mint,
    ata.address,
    deployer,
    SUPPLY
  );
  console.log(`Mint signature:  ${sig}`);

  fs.writeFileSync(MINT_FILE, mint.toBase58() + "\n");
  console.log(`Wrote mint address to ${MINT_FILE}`);

  console.log("");
  console.log("Add this to app/src/lib/constants.ts:");
  console.log(`  export const MOCK_PUSD_MINT = '${mint.toBase58()}';`);
  console.log(`  export const MOCK_PUSD_TREASURY = '${ata.address.toBase58()}';`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
