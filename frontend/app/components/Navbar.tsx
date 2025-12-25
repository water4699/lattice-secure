"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useChainId } from "wagmi";

export function Navbar() {
  const chainId = useChainId();
  
  const getNetworkBadge = () => {
    if (chainId === 31337) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Hardhat Local
        </span>
      );
    } else if (chainId === 11155111) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          Sepolia
        </span>
      );
    }
    return null;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/70 backdrop-blur-md transition-all">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20">
            <span className="text-xl">🛡️</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
              Lattice <span className="text-blue-600">Secure</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {getNetworkBadge()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <ConnectButton 
            chainStatus="icon" 
            showBalance={false}
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
        </div>
      </div>
    </nav>
  );
}

