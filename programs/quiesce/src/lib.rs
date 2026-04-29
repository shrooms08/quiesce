use anchor_lang::prelude::*;

declare_id!("4ZswCL1xpQcs1uESm4x6ijKPYRhT5K8XiSHZkVLKckdg");

#[program]
pub mod quiesce {
    use super::*;

    pub fn create_vault(_ctx: Context<CreateVault>) -> Result<()> {
        // TODO: implement
        Ok(())
    }

    pub fn deposit(_ctx: Context<Deposit>) -> Result<()> {
        // TODO: implement
        Ok(())
    }

    pub fn heartbeat(_ctx: Context<Heartbeat>) -> Result<()> {
        // TODO: implement
        Ok(())
    }

    pub fn claim(_ctx: Context<Claim>) -> Result<()> {
        // TODO: implement
        Ok(())
    }

    pub fn cancel(_ctx: Context<Cancel>) -> Result<()> {
        // TODO: implement
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateVault<'info> {
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Heartbeat<'info> {
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    pub authority: Signer<'info>,
}

#[account]
pub struct Vault {}

#[error_code]
pub enum Quiescence {
    Unauthorized,
    InvalidHeartbeatInterval,
    HeartbeatNotExpired,
    HeartbeatStillValid,
    VaultAlreadyClaimed,
}
