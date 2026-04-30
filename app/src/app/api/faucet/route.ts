import { NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { MOCK_PUSD_MINT, SOLANA_RPC_URL } from "@/lib/constants";

const RATE_LIMIT_MS = 60_000;
const lastRequest = new Map<string, number>();

function loadFaucetKeypair(): Keypair {
  const b58 = process.env.FAUCET_KEYPAIR_BASE58;
  if (!b58) {
    throw new Error("FAUCET_KEYPAIR_BASE58 is not set in app/.env.local");
  }
  return Keypair.fromSecretKey(bs58.decode(b58));
}

export async function POST(request: Request) {
  let recipientStr: string;
  try {
    const body = await request.json();
    recipientStr = body?.recipient;
    if (typeof recipientStr !== "string") {
      return NextResponse.json(
        { error: "recipient is required" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  let recipient: PublicKey;
  try {
    recipient = new PublicKey(recipientStr);
  } catch {
    return NextResponse.json(
      { error: "recipient is not a valid Solana address" },
      { status: 400 }
    );
  }

  const now = Date.now();
  const last = lastRequest.get(recipientStr);
  if (last !== undefined && now - last < RATE_LIMIT_MS) {
    const wait = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
    return NextResponse.json(
      { error: `Please wait ${wait}s before requesting again.` },
      { status: 429 }
    );
  }

  try {
    const faucet = loadFaucetKeypair();
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const mint = new PublicKey(MOCK_PUSD_MINT);
    const amount = BigInt(
      process.env.FAUCET_AMOUNT_BASE_UNITS ?? "1000000000"
    );

    const faucetBalanceLamports = await connection.getBalance(faucet.publicKey);
    if (faucetBalanceLamports < 0.005 * LAMPORTS_PER_SOL) {
      return NextResponse.json(
        { error: "Faucet wallet has insufficient SOL for fees." },
        { status: 500 }
      );
    }

    const sourceAta = await getAssociatedTokenAddress(mint, faucet.publicKey);
    const recipientAtaAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      faucet,
      mint,
      recipient
    );

    const tx = new Transaction().add(
      createTransferInstruction(
        sourceAta,
        recipientAtaAccount.address,
        faucet.publicKey,
        amount
      )
    );
    tx.feePayer = faucet.publicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.sign(faucet);

    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });
    await connection.confirmTransaction(signature, "confirmed");

    lastRequest.set(recipientStr, now);

    return NextResponse.json({ signature, amount: amount.toString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
