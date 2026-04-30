"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import type { ReactNode } from "react";
import { SOLANA_RPC_URL } from "@/lib/constants";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

if (!PRIVY_APP_ID) {
  throw new Error(
    "NEXT_PUBLIC_PRIVY_APP_ID is not set. Add it to app/.env.local."
  );
}

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || SOLANA_RPC_URL;

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID as string}
      config={{
        loginMethods: ["email", "google"],
        appearance: {
          theme: "light",
          accentColor: "#5A1A1A",
          walletChainType: "solana-only",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "users-without-wallets" },
        },
        externalWallets: {
          solana: { connectors: toSolanaWalletConnectors() },
        },
        solanaClusters: [{ name: "devnet", rpcUrl: RPC_URL }],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
