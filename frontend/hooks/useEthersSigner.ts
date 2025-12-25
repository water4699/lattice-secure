import { useMemo } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { BrowserProvider, JsonRpcSigner } from "ethers";

export function useEthersSigner() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  return useMemo(() => {
    if (!isConnected || !walletClient || !address) return undefined;

    const provider = new BrowserProvider(walletClient as any);
    return provider.getSigner(address) as Promise<JsonRpcSigner>;
  }, [walletClient, address, isConnected]);
}

