# Quiesce

Programmable on-chain inheritance for stablecoin-denominated wealth, built on Solana with Palm USD.

## What it does

A vault owner deposits PUSD and configures a heartbeat — a check-in cadence they commit to (60 seconds for the demo, 90 days in practice). While they keep checking in, the vault is dormant. If they stop, the heartbeat expires and any signed-in user can trigger a release; the program transfers the full balance to the configured beneficiary's wallet, atomically, on the next confirmed block. The owner can also cancel at any time before the heartbeat expires and recover the funds.

The whole arrangement is governed by an immutable Anchor program. Quiesce holds no keys, takes no custody, and cannot intervene at the moment of transfer.

## Why PUSD specifically

Most USD-pegged stablecoins (USDC, USDT) ship with a freeze authority — the issuer can disable a token account at will. That capability defeats the point of an inheritance protocol: a bequest must execute when its conditions are met, regardless of jurisdiction, sanctions exposure, or institutional pressure. PUSD is the only major Solana stablecoin issued with no freeze function, no blacklist, and no pause mechanism. Compliance is enforced at the mint and redeem layer; once issued, the tokens are governed entirely by the on-chain logic that holds them. PUSD's non-freezability is what makes guaranteed settlement at trigger time a real property of this protocol, not a marketing claim.

PUSD is also the first major Shariah-compliant stablecoin (issued by Palm Azgar Finance, backed by AED and SAR reserves). Inheritance (*wasiyyah*) is a core obligation in Islamic finance, and the existing $3T Islamic finance market has no native digital inheritance infrastructure. Quiesce is built to fit that market structurally.

## Status

Hackathon submission for the **Palm USD side track of the Frontier Hackathon (organized with Superteam UAE)**, April 2026. Working prototype on Solana devnet — five program instructions deployed, eight integration tests passing, full end-to-end flow exercised in the browser (faucet → create vault → check in / cancel / let trigger → claim).

## Architecture

- **On-chain program**: Anchor 0.32, Rust, deployed to Solana devnet. Source at [programs/quiesce/](programs/quiesce/).
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind v4, design tokens in `app/src/app/globals.css`. Source at [app/](app/).
- **Auth & wallets**: Privy v3 — email/Google login provisions a Solana embedded wallet on first sign-in. No browser extension required.
- **Token**: PUSD (SPL token, 6 decimals). A mock PUSD mint with no freeze authority is deployed to devnet for testing. Mainnet PUSD address slot is reserved in `app/src/lib/constants.ts`.
- **Faucet**: server-side `POST /api/faucet` with a 60-second per-recipient rate limit. Mints/transfers 1,000 mock PUSD to first-time users.

## On-chain state (Solana devnet)

The program exposes five instructions: `create_vault`, `deposit`, `heartbeat`, `claim`, `cancel`. Account constraints, status state machine (`Active → Claimed | Cancelled`), and PDA derivation are all in [programs/quiesce/src/lib.rs](programs/quiesce/src/lib.rs); the canonical TypeScript invocation is in [tests/quiesce.ts](tests/quiesce.ts).

```
Quiesce program:    4ZswCL1xpQcs1uESm4x6ijKPYRhT5K8XiSHZkVLKckdg
Mock PUSD mint:     Ao9pLARzSv1LijK5GFhTXBFsLdN5LtSsG41NeEsbe33K
Cluster:            devnet
```

## Local development

```bash
anchor build && anchor test --provider.cluster localnet   # 8 integration tests
cd app && pnpm install && pnpm dev                        # http://localhost:3000
```

You'll need `app/.env.local` with `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_SOLANA_RPC_URL`, `FAUCET_KEYPAIR_BASE58`, `FAUCET_AMOUNT_BASE_UNITS`, and `ANTHROPIC_API_KEY` (for the agent). See `scripts/deploy-mock-pusd.ts` for the mock-mint deploy script and `app/src/app/api/faucet/route.ts` for the faucet route.

## Sign-in options

Two paths land you in the same authenticated state:

- **Continue with Google or email** — Privy provisions a Solana embedded wallet on first sign-in. No browser extension required. Best for first-time users.
- **Connect wallet** — bring an existing Solana wallet (Phantom, Solflare, Backpack, etc.) via the Privy modal's "Connect wallet" option. The connected wallet becomes the owner of any vaults you create.

Both flows produce a usable Solana wallet. Faucet, vault creation, heartbeat, claim, and the AI agent work identically in either mode. Enabling the `Wallet` login method requires it to also be enabled in the Privy dashboard for the configured `NEXT_PUBLIC_PRIVY_APP_ID`.

## Demo flow

A hosted public version is planned. Until then, follow the Local development steps to run the demo locally; a recorded walkthrough is included in the hackathon submission.

1. Visit `http://localhost:3000`. Click **Launch app**.
2. Sign in with email or Google. Privy provisions a Solana embedded wallet.
3. On `/dashboard`, the **Funding required** banner appears (you have 0 PUSD). Click **Get 1,000 PUSD**.
4. Wallet balance updates to `1,000.00 PUSD`. Banner disappears.
5. Click **Create vault**. Fill in: name `Test vault`, beneficiary (any other Solana address), heartbeat `60 seconds (demo)`, deposit `100 PUSD`.
6. Click **Sign and submit**. Privy prompts once. Approve. Single transaction creates the vault PDA and deposits 100 PUSD into the vault's escrow ATA.
7. Land on `/vaults/<pda>`. Watch the heartbeat clock count down second by second.
8. Choose your branch:
   - **Check in**: click the button before the clock expires. Heartbeat resets to zero. Vault stays Armed.
   - **Cancel**: confirm the dialog. Funds return to your wallet. Vault status flips to Cancelled.
   - **Let it trigger**: wait 60+ seconds. Vault flips to Triggered. The page surfaces a **Beneficiary actions** block with a copyable claim URL.
9. Open the claim URL `/claim/<pda>` (in another tab, optionally signed in as a different user). Page reads the live vault state. Click **Release {amount} PUSD**. Sign once.
10. After confirmation: success state with the transaction signature linked to Solana Explorer. The funds are in the beneficiary's PUSD ATA. The vault account on-chain has `status: Claimed` and `amount: 0`.

## Roadmap and known limitations

- **Beneficiary discoverability**: today the claim URL is shared out-of-band (text, email). Planned: an AI agent that scans devnet for vaults targeting a given beneficiary address and reports back, plus optional email notification on heartbeat expiry.
- **Event indexing**: the program emits `VaultCreated`, `VaultDeposit`, `HeartbeatRecorded`, `VaultClaimed`, `VaultCancelled` events but the activity table on the vault detail page currently shows only state-derived rows (no historical event log).
- **Conditional logic beyond heartbeat**: the form anticipates date triggers, oracle triggers, and co-signer quorums (UI mocks visible, disabled). Only heartbeat is wired on-chain in this release.
- **AI agent integration**: in progress. Conversational vault creation and beneficiary discovery are the next milestone.
- **Mainnet deployment**: pending PUSD mainnet launch. The frontend's `MAINNET_PUSD_MINT` slot is reserved.
- **Recovery & multi-sig**: out of scope for v1. Privy embedded wallets do not currently expose a recovery flow in this app.
- **Heartbeat notifications**: the on-chain logic doesn't notify; reminders before expiry would live in an off-chain agent.

## License

All rights reserved. Granted access to `hello@palmusd.com` for hackathon evaluation.
