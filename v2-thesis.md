# Quiesce v2 — Roadmap

## Privacy by default — Umbra integration

Inheritance is one of the most privacy-sensitive financial flows in any
society. The current Quiesce protocol leaks: vault balances are public,
beneficiary identities are public, the relationship between owner and
beneficiary is graph-queryable. Islamic etiquette around wealth disclosure
and modern privacy norms both push against this default.

Umbra Privacy (https://umbraprivacy.com) provides confidential balances and
viewing keys via Arcium MPC on Solana. The integration is architecturally
non-trivial — Umbra encrypted accounts are owned by Umbra's program, not
Quiesce's, so the heartbeat-gated release logic and the privacy layer can't
share custody without protocol-level cryptographic design (threshold
encryption, MPC-assisted access control, or custom Arcium circuits).

V2 work:
- Investigate Architecture A (UTXO commitment in vault, MPC-gated reveal)
  and Architecture C (privacy-first vault redesign)
- Reach out to Umbra and Arcium teams for partnership conversation
- Map the Islamic wasi (executor) role onto viewing-key delegation —
  delegated visibility without delegated authority is the cryptographic
  shape of the wasi role

## Wallet/infrastructure framing

Quiesce's on-chain primitive is generic. Wallets (Phantom, Solflare,
Backpack) and custodians can integrate the same heartbeat-gated release
logic directly. The frontend shipped in v1 is a reference implementation,
not the product.

V2 work:
- Quiesce SDK (TypeScript wrapper + Anchor IDL distribution)
- Wallet partnership conversations post-hackathon
- Institutional executor pilots

## Beneficiary designation by email (zkEmail)

V1 requires the beneficiary to be a wallet address. v2 supports designating
beneficiaries by email via zero-knowledge email proofs (zkEmail), preserving
the no-custody guarantee while reducing onboarding friction for non-crypto
heirs.

## Optional notification layer

Opt-in watcher service that emails configured contacts (the wasi, family
member, or trusted friend) when a vault lapses. Convenience layer; on-chain
enforcement remains permissionless.
