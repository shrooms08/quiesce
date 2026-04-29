# Quiesce

Programmable on-chain inheritance, built on PUSD.

Quiesce is a Solana protocol for conditional asset release. Users deposit PUSD into vaults that release funds to designated beneficiaries when on-chain conditions are met — a missed heartbeat check-in, a date passing, an oracle signal. The flagship use case is digital inheritance: a programmable bequest that executes without intermediary, reviewer, or interference.

## Why PUSD

PUSD is the only major USD-pegged stablecoin on Solana issued without a freeze function, blacklist, or pause mechanism. Compliance is enforced at the mint and redeem layer; once issued, tokens cannot be frozen or revoked by the issuer. For inheritance, this property is structural, not incidental — a bequest must execute when its conditions are met, regardless of jurisdiction, sanctions exposure, or institutional pressure. Conventional stablecoins cannot guarantee this. PUSD can.

PUSD is also the first major Shariah-compliant stablecoin, issued by Palm Azgar Finance and backed by AED and SAR reserves. Inheritance (*wasiyyah*) is a core obligation in Islamic finance, and the $3 trillion Islamic finance market currently has no native digital inheritance infrastructure. Quiesce is built to fit that market structurally — non-freezable rails, asset-backed reserves, no interest mechanics in the protocol — while remaining useful to anyone, anywhere, who needs durable conditional release.

## Tech stack

- **On-chain**: Anchor 0.30 (Rust), Solana devnet
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind
- **Auth & wallets**: Privy (embedded wallets, social login)
- **Token**: PUSD (SPL token); a mock PUSD mint is deployed to devnet for testing

## Setup

```bash
# Install Anchor program dependencies
anchor build

# Install frontend dependencies
cd app && pnpm install

# Run the frontend
pnpm dev
```

## Status

In active development for the Palm USD x Superteam UAE hackathon submission.
