import Anthropic from "@anthropic-ai/sdk";
import { AnchorProvider, Program, type Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { QUIESCE_PROGRAM_ID, SOLANA_RPC_URL } from "@/lib/constants";
import quiesceIdl from "@/lib/idl/quiesce.json";
import type { Quiesce } from "@/lib/idl/quiesce";

// ----- Tool schemas -----

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "read_vaults_for_beneficiary",
    description:
      "Query Solana devnet for all Quiesce vaults where the given address is the configured beneficiary. " +
      "Use this when a user asks whether they (or someone) are a beneficiary on any vaults, or wants to see what " +
      "vaults are designated for a specific wallet. Returns vault details including PDA, name, amount, owner, " +
      "status (Active/Claimed/Cancelled), heartbeat timing, and whether each is currently claimable.",
    input_schema: {
      type: "object",
      properties: {
        beneficiary_address: {
          type: "string",
          description:
            "A Solana wallet address in base58 format (32-44 characters). The address whose beneficiary-status to check.",
        },
      },
      required: ["beneficiary_address"],
    },
  },
  {
    name: "propose_create_vault",
    description:
      "Propose a new Quiesce vault for the user to sign and create. Use this when a user describes " +
      "a vault they want to set up — e.g., 'create a vault for my daughter with 1000 PUSD and a 90-day " +
      "heartbeat'. Extract the parameters from the conversation, validate them against Quiesce's " +
      "constraints, and call this tool. The user will then review the proposal and sign the transaction. " +
      "DO NOT call this tool until you have all four required fields (name, beneficiary, heartbeat, deposit). " +
      "If any field is missing or ambiguous, ask the user for clarification first.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "A human-readable name for the vault, max 32 bytes when UTF-8 encoded. E.g., 'Aliyah college fund'.",
        },
        beneficiary_address: {
          type: "string",
          description:
            "The Solana base58 wallet address of the beneficiary. Must not equal the owner's address.",
        },
        heartbeat_interval_seconds: {
          type: "integer",
          description:
            "Time between required check-ins, in seconds. Min 60, max 3,153,600,000 (100 years).",
        },
        deposit_amount_pusd: {
          type: "number",
          description:
            "Initial deposit, in PUSD (not base units). E.g., 100.5 means 100.5 PUSD.",
        },
      },
      required: [
        "name",
        "beneficiary_address",
        "heartbeat_interval_seconds",
        "deposit_amount_pusd",
      ],
    },
  },
];

// ----- Dispatcher -----

export async function executeToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  if (name === "read_vaults_for_beneficiary") {
    const addr =
      typeof input.beneficiary_address === "string"
        ? input.beneficiary_address
        : "";
    return readVaultsForBeneficiary(addr);
  }
  if (name === "propose_create_vault") {
    return proposeCreateVault(input);
  }
  throw new Error(`Unknown tool: ${name}`);
}

// ----- Read-only program client (server-side) -----

let cachedProgram: Program<Quiesce> | null = null;

function getReadOnlyProgram(): Program<Quiesce> {
  if (cachedProgram) return cachedProgram;
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  // No real wallet on the server. We never sign; we only fetch accounts.
  const dummyWallet = {
    publicKey: PublicKey.default,
    signTransaction: () => {
      throw new Error("Server-side agent client is read-only.");
    },
    signAllTransactions: () => {
      throw new Error("Server-side agent client is read-only.");
    },
  } as unknown as Wallet;
  const provider = new AnchorProvider(connection, dummyWallet, {
    commitment: "confirmed",
  });
  cachedProgram = new Program<Quiesce>(quiesceIdl as Quiesce, provider);
  return cachedProgram;
}

// ----- Tool implementations -----

type VaultStatusKind = "Active" | "Claimed" | "Cancelled";

type VaultSummary = {
  vaultPda: string;
  name: string;
  ownerAddress: string;
  beneficiaryAddress: string;
  amountPusd: number;
  status: VaultStatusKind;
  heartbeatIntervalSeconds: number;
  lastHeartbeatUnix: number;
  expiryUnix: number;
  isExpired: boolean;
  secondsUntilExpiry: number;
  claimUrl: string;
};

function statusKindOf(status: unknown): VaultStatusKind {
  if (status && typeof status === "object") {
    if ("active" in status) return "Active";
    if ("claimed" in status) return "Claimed";
    if ("cancelled" in status) return "Cancelled";
  }
  return "Active";
}

function decodeName(bytes: number[] | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  let end = arr.length;
  while (end > 0 && arr[end - 1] === 0) end--;
  return new TextDecoder("utf-8").decode(arr.subarray(0, end));
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (v && typeof (v as { toString: () => string }).toString === "function") {
    return Number((v as { toString: () => string }).toString());
  }
  return 0;
}

async function readVaultsForBeneficiary(addressStr: string): Promise<string> {
  const trimmed = (addressStr || "").trim();
  if (!trimmed) {
    return JSON.stringify({
      error: "beneficiary_address is required.",
    });
  }

  let beneficiary: PublicKey;
  try {
    beneficiary = new PublicKey(trimmed);
  } catch {
    return JSON.stringify({
      error: `'${trimmed}' is not a valid Solana base58 address.`,
    });
  }

  let program: Program<Quiesce>;
  try {
    program = getReadOnlyProgram();
  } catch (e) {
    return JSON.stringify({
      error: `Could not initialize on-chain client: ${
        e instanceof Error ? e.message : String(e)
      }`,
    });
  }

  let accounts;
  try {
    // Vault layout: 8 (discriminator) + 32 (owner Pubkey) = 40 → beneficiary starts here.
    accounts = await program.account.vault.all([
      {
        memcmp: {
          offset: 40,
          bytes: beneficiary.toBase58(),
        },
      },
    ]);
  } catch (e) {
    return JSON.stringify({
      error: `Solana RPC error while fetching vaults: ${
        e instanceof Error ? e.message : String(e)
      }`,
      programId: QUIESCE_PROGRAM_ID,
      cluster: "devnet",
    });
  }

  const nowSec = Math.floor(Date.now() / 1000);

  const vaults: VaultSummary[] = accounts.map((a) => {
    const acc = a.account as unknown as {
      owner: PublicKey;
      beneficiary: PublicKey;
      amount: { toString: () => string };
      heartbeatInterval: { toString: () => string };
      lastHeartbeat: { toString: () => string };
      status: unknown;
      name: number[];
    };
    const lastHeartbeat = toNumber(acc.lastHeartbeat);
    const heartbeatInterval = toNumber(acc.heartbeatInterval);
    const expiryUnix = lastHeartbeat + heartbeatInterval;
    const status = statusKindOf(acc.status);
    const pda = a.publicKey.toBase58();
    return {
      vaultPda: pda,
      name: decodeName(acc.name),
      ownerAddress: acc.owner.toBase58(),
      beneficiaryAddress: acc.beneficiary.toBase58(),
      amountPusd: toNumber(acc.amount) / 1_000_000,
      status,
      heartbeatIntervalSeconds: heartbeatInterval,
      lastHeartbeatUnix: lastHeartbeat,
      expiryUnix,
      isExpired: status === "Active" && nowSec > expiryUnix,
      secondsUntilExpiry: expiryUnix - nowSec,
      claimUrl: `/claim/${pda}`,
    };
  });

  // Sort: triggered first, then active by soonest expiry, then closed states last.
  vaults.sort((a, b) => {
    const rank = (v: VaultSummary) =>
      v.status === "Active" && v.isExpired
        ? 0
        : v.status === "Active"
        ? 1
        : 2;
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.expiryUnix - b.expiryUnix;
  });

  if (vaults.length === 0) {
    return JSON.stringify({
      vaults: [],
      message: `No vaults found targeting ${beneficiary.toBase58()} as beneficiary on Solana devnet.`,
      cluster: "devnet",
      programId: QUIESCE_PROGRAM_ID,
    });
  }

  return JSON.stringify({
    vaults,
    count: vaults.length,
    cluster: "devnet",
    programId: QUIESCE_PROGRAM_ID,
    queriedAt: new Date().toISOString(),
    nowUnix: nowSec,
  });
}

// ----- propose_create_vault -----

function humanizeSeconds(s: number): string {
  if (s < 60) return `${s} ${s === 1 ? "second" : "seconds"}`;
  if (s < 3600) {
    const m = Math.round(s / 60);
    return `${m} ${m === 1 ? "minute" : "minutes"}`;
  }
  if (s < 86400) {
    const h = Math.round(s / 3600);
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  if (s < 31_536_000) {
    const d = Math.round(s / 86400);
    return `${d} ${d === 1 ? "day" : "days"}`;
  }
  const y = (s / 31_536_000).toFixed(1).replace(/\.0$/, "");
  return `${y} ${y === "1" ? "year" : "years"}`;
}

function fmtPusd(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 6,
  });
}

async function proposeCreateVault(
  input: Record<string, unknown>
): Promise<string> {
  const name = String(input.name ?? "").trim();
  const beneficiaryStr = String(input.beneficiary_address ?? "").trim();
  const heartbeatSec = Number(input.heartbeat_interval_seconds);
  const depositPusd = Number(input.deposit_amount_pusd);

  if (!name) {
    return JSON.stringify({ error: "name is required" });
  }
  const nameBytes = new TextEncoder().encode(name);
  if (nameBytes.length > 32) {
    return JSON.stringify({
      error: `name is ${nameBytes.length} bytes when UTF-8 encoded; the on-chain field holds 32. Shorten it.`,
    });
  }

  if (!beneficiaryStr) {
    return JSON.stringify({ error: "beneficiary_address is required" });
  }
  try {
    new PublicKey(beneficiaryStr);
  } catch {
    return JSON.stringify({
      error: `'${beneficiaryStr}' is not a valid Solana base58 address`,
    });
  }

  if (
    !Number.isInteger(heartbeatSec) ||
    heartbeatSec < 60 ||
    heartbeatSec > 3_153_600_000
  ) {
    return JSON.stringify({
      error:
        "heartbeat_interval_seconds must be an integer between 60 and 3,153,600,000 (100 years)",
    });
  }

  if (!Number.isFinite(depositPusd) || depositPusd <= 0) {
    return JSON.stringify({
      error: "deposit_amount_pusd must be a positive number",
    });
  }

  const depositBaseUnits = BigInt(Math.floor(depositPusd * 1_000_000));
  if (depositBaseUnits === 0n) {
    return JSON.stringify({
      error: "deposit too small after PUSD precision conversion (6 decimals)",
    });
  }

  // Note: we cannot validate beneficiary != owner here because the owner is
  // the user's Privy embedded wallet, which is only known client-side.
  // The frontend re-validates at sign time.

  const proposal = {
    success: true,
    kind: "create_vault" as const,
    params: {
      name,
      beneficiaryAddress: beneficiaryStr,
      heartbeatIntervalSec: heartbeatSec,
      depositAmountPusd: depositPusd,
      depositAmountBaseUnits: depositBaseUnits.toString(),
    },
    summary: {
      heartbeatHumanReadable: humanizeSeconds(heartbeatSec),
      depositHumanReadable: `${fmtPusd(depositPusd)} PUSD`,
      beneficiaryShort: `${beneficiaryStr.slice(0, 5)}…${beneficiaryStr.slice(-4)}`,
    },
  };

  return JSON.stringify(proposal);
}
