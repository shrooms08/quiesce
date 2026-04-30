"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import type { ReactNode } from "react";
import { SOLANA_RPC_URL } from "@/lib/constants";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

if (!PRIVY_APP_ID) {
  throw new Error(
    "NEXT_PUBLIC_PRIVY_APP_ID is not set. Add it to app/.env.local."
  );
}

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || SOLANA_RPC_URL;
const WSS_URL = RPC_URL.replace(/^http/, "ws");

const solanaDevnetRpcs = {
  "solana:devnet": {
    rpc: createSolanaRpc(RPC_URL),
    rpcSubscriptions: createSolanaRpcSubscriptions(WSS_URL),
    blockExplorerUrl: "https://explorer.solana.com?cluster=devnet",
  },
};

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
        solana: { rpcs: solanaDevnetRpcs },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
