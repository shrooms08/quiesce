use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("4ZswCL1xpQcs1uESm4x6ijKPYRhT5K8XiSHZkVLKckdg");

const VAULT_SEED: &[u8] = b"vault";
const VAULT_SPACE: usize = 178;
const MIN_HEARTBEAT_INTERVAL: i64 = 60;
const MAX_HEARTBEAT_INTERVAL: i64 = 3_153_600_000;

#[program]
pub mod quiesce {
    use super::*;

    pub fn create_vault(
        ctx: Context<CreateVault>,
        vault_id: u64,
        name: [u8; 32],
        beneficiary: Pubkey,
        heartbeat_interval: i64,
    ) -> Result<()> {
        require!(
            heartbeat_interval >= MIN_HEARTBEAT_INTERVAL
                && heartbeat_interval <= MAX_HEARTBEAT_INTERVAL,
            Quiescence::InvalidHeartbeatInterval
        );
        require_keys_neq!(
            beneficiary,
            ctx.accounts.owner.key(),
            Quiescence::SelfBeneficiary
        );

        let now = Clock::get()?.unix_timestamp;
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.beneficiary = beneficiary;
        vault.mint = ctx.accounts.mint.key();
        vault.amount = 0;
        vault.heartbeat_interval = heartbeat_interval;
        vault.last_heartbeat = now;
        vault.created_at = now;
        vault.status = VaultStatus::Active;
        vault.vault_id = vault_id;
        vault.bump = ctx.bumps.vault;
        vault.name = name;

        emit!(VaultCreated {
            vault: vault.key(),
            owner: vault.owner,
            beneficiary: vault.beneficiary,
            heartbeat_interval,
        });

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        require!(vault.status == VaultStatus::Active, Quiescence::VaultNotActive);
        require_keys_eq!(
            vault.owner,
            ctx.accounts.owner.key(),
            Quiescence::Unauthorized
        );
        require!(amount > 0, Quiescence::ZeroAmount);

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.owner_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;

        vault.amount = vault
            .amount
            .checked_add(amount)
            .ok_or(Quiescence::ArithmeticOverflow)?;

        emit!(VaultDeposit {
            vault: vault.key(),
            amount,
            new_total: vault.amount,
        });

        Ok(())
    }

    pub fn heartbeat(ctx: Context<Heartbeat>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        require!(vault.status == VaultStatus::Active, Quiescence::VaultNotActive);

        let now = Clock::get()?.unix_timestamp;
        vault.last_heartbeat = now;

        emit!(HeartbeatRecorded {
            vault: vault.key(),
            last_heartbeat: now,
        });

        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let vault = &ctx.accounts.vault;

        require!(vault.status == VaultStatus::Active, Quiescence::VaultNotActive);

        let now = Clock::get()?.unix_timestamp;
        let expiry = vault
            .last_heartbeat
            .checked_add(vault.heartbeat_interval)
            .ok_or(Quiescence::ArithmeticOverflow)?;
        require!(now > expiry, Quiescence::HeartbeatStillValid);
        require!(vault.amount > 0, Quiescence::ZeroAmount);

        let owner = vault.owner;
        let vault_id_bytes = vault.vault_id.to_le_bytes();
        let bump = vault.bump;
        let amount = vault.amount;

        let signer_seeds: &[&[&[u8]]] = &[&[
            VAULT_SEED,
            owner.as_ref(),
            &vault_id_bytes,
            &[bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.beneficiary_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        let vault = &mut ctx.accounts.vault;
        vault.status = VaultStatus::Claimed;
        vault.amount = 0;

        emit!(VaultClaimed {
            vault: vault.key(),
            beneficiary: vault.beneficiary,
            amount,
        });

        Ok(())
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        let vault = &ctx.accounts.vault;

        require!(vault.status == VaultStatus::Active, Quiescence::VaultNotActive);
        require_keys_eq!(
            vault.owner,
            ctx.accounts.owner.key(),
            Quiescence::Unauthorized
        );

        let now = Clock::get()?.unix_timestamp;
        let expiry = vault
            .last_heartbeat
            .checked_add(vault.heartbeat_interval)
            .ok_or(Quiescence::ArithmeticOverflow)?;
        require!(now <= expiry, Quiescence::HeartbeatExpired);

        let owner = vault.owner;
        let vault_id_bytes = vault.vault_id.to_le_bytes();
        let bump = vault.bump;
        let amount = vault.amount;

        let signer_seeds: &[&[&[u8]]] = &[&[
            VAULT_SEED,
            owner.as_ref(),
            &vault_id_bytes,
            &[bump],
        ]];

        if amount > 0 {
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(cpi_ctx, amount)?;
        }

        let vault = &mut ctx.accounts.vault;
        vault.status = VaultStatus::Cancelled;
        vault.amount = 0;

        emit!(VaultCancelled {
            vault: vault.key(),
            owner: vault.owner,
            amount,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(vault_id: u64)]
pub struct CreateVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: We only store this account's pubkey on the vault. It is not
    /// read or written, and need not be a signer.
    pub beneficiary: AccountInfo<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = owner,
        space = VAULT_SPACE,
        seeds = [VAULT_SEED, owner.key().as_ref(), vault_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, vault.owner.as_ref(), vault.vault_id.to_le_bytes().as_ref()],
        bump = vault.bump,
        has_one = owner @ Quiescence::Unauthorized,
        has_one = mint,
    )]
    pub vault: Account<'info, Vault>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Heartbeat<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, vault.owner.as_ref(), vault.vault_id.to_le_bytes().as_ref()],
        bump = vault.bump,
        has_one = owner @ Quiescence::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, vault.owner.as_ref(), vault.vault_id.to_le_bytes().as_ref()],
        bump = vault.bump,
        has_one = beneficiary,
        has_one = mint,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Address is enforced to equal vault.beneficiary via the
    /// has_one constraint on `vault`. We only need the AccountInfo so the
    /// associated-token-account program can use it as the ATA authority.
    #[account(address = vault.beneficiary)]
    pub beneficiary: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = caller,
        associated_token::mint = mint,
        associated_token::authority = beneficiary,
    )]
    pub beneficiary_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, vault.owner.as_ref(), vault.vault_id.to_le_bytes().as_ref()],
        bump = vault.bump,
        has_one = owner @ Quiescence::Unauthorized,
        has_one = mint,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub beneficiary: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub heartbeat_interval: i64,
    pub last_heartbeat: i64,
    pub created_at: i64,
    pub status: VaultStatus,
    pub vault_id: u64,
    pub bump: u8,
    pub name: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum VaultStatus {
    Active,
    Claimed,
    Cancelled,
}

#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub beneficiary: Pubkey,
    pub heartbeat_interval: i64,
}

#[event]
pub struct VaultDeposit {
    pub vault: Pubkey,
    pub amount: u64,
    pub new_total: u64,
}

#[event]
pub struct HeartbeatRecorded {
    pub vault: Pubkey,
    pub last_heartbeat: i64,
}

#[event]
pub struct VaultClaimed {
    pub vault: Pubkey,
    pub beneficiary: Pubkey,
    pub amount: u64,
}

#[event]
pub struct VaultCancelled {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum Quiescence {
    #[msg("Caller is not authorized to perform this action.")]
    Unauthorized,
    #[msg("Heartbeat interval must be between 60 seconds and 100 years.")]
    InvalidHeartbeatInterval,
    #[msg("Beneficiary cannot be the same as the vault owner.")]
    SelfBeneficiary,
    #[msg("Vault is not in an active state.")]
    VaultNotActive,
    #[msg("Heartbeat is still valid; the vault cannot be claimed yet.")]
    HeartbeatStillValid,
    #[msg("Heartbeat has expired; the vault can no longer be cancelled by the owner.")]
    HeartbeatExpired,
    #[msg("Amount must be greater than zero.")]
    ZeroAmount,
    #[msg("Arithmetic overflow.")]
    ArithmeticOverflow,
}
