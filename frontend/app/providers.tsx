"use client";

import type { ReactNode } from "react";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sepolia } from "wagmi/chains";
import { defineChain } from "viem";
import { createStorage } from "wagmi";
import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";

import "@rainbow-me/rainbowkit/styles.css";

// Define custom Hardhat Local network
const hardhatLocal = defineChain({
  id: 31337,
  name: "Hardhat Local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://localhost:8545"],
    },
  },
  blockExplorers: {
    default: {
      name: "Hardhat Local",
      url: "http://localhost:8545",
    },
  },
  testnet: true,
});

// Create memory storage to avoid indexedDB issues in SSR
const memoryStorage = createStorage({
  storage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
});

const config = getDefaultConfig({
  appName: "Encrypted Identity Auth",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [hardhatLocal, sepolia],
  ssr: false,
  storage: memoryStorage,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false, // Disable retries to prevent repeated failed fetch attempts
    },
    mutations: {
      retry: false,
    },
  },
});

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

