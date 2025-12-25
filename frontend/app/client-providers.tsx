"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { ErrorHandler } from "./error-handler";

// Dynamically import Providers to avoid SSR issues with WalletConnect
const Providers = dynamic(() => import("./providers").then((mod) => ({ default: mod.Providers })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Loading wallet connection...</p>
      </div>
    </div>
  ),
});

const Navbar = dynamic(() => import("./components/Navbar").then((mod) => ({ default: mod.Navbar })), {
  ssr: false,
});

type Props = {
  children: ReactNode;
};

export function ClientProviders({ children }: Props) {
  return (
    <>
      <ErrorHandler />
      <Providers>
        <Navbar />
        {children}
      </Providers>
    </>
  );
}

