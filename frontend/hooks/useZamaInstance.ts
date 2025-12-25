import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { createFhevmInstance } from "@/fhevm/internal/fhevm";

export function useZamaInstance() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [instance, setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    if (!isConnected || !address || !chainId) {
      setInstance(undefined);
      return;
    }

    setIsLoading(true);
    setError(undefined);

    const abortController = new AbortController();
    const mockChains: Record<number, string> = {
      31337: "http://localhost:8545", // Hardhat localhost
    };

    createFhevmInstance({
      signal: abortController.signal,
      provider: window.ethereum as any,
      mockChains: mockChains,
      onStatusChange: (s) => {
        // Only log status changes, suppress other logs
        if (s && typeof s === 'string') {
          console.log(`[useZamaInstance] status: ${s}`);
        }
      },
    })
      .then((inst) => {
        if (!abortController.signal.aborted) {
          setInstance(inst);
          setIsLoading(false);
          setError(undefined);
        }
      })
      .catch((e) => {
        if (!abortController.signal.aborted) {
          // Log detailed error information for debugging
          const errorMessage = e instanceof Error ? e.message : String(e);
          const errorStack = e instanceof Error ? e.stack : undefined;
          
          console.error("[useZamaInstance] Failed to create FHEVM instance:", {
            error: errorMessage,
            stack: errorStack,
            chainId,
            isConnected,
            address,
          });
          
          // Check error type
          const isNetworkError = 
            errorMessage.includes("relayer") ||
            errorMessage.includes("connection") ||
            errorMessage.includes("keyurl") ||
            errorMessage.includes("ERR_CONNECTION_CLOSED") ||
            errorMessage.includes("network") ||
            errorMessage.includes("fetch") ||
            errorMessage.includes("timeout");
          
          const isSDKError = 
            errorMessage.includes("SDK") ||
            errorMessage.includes("relayerSDK") ||
            errorMessage.includes("window.relayerSDK") ||
            errorMessage.includes("Failed to load");
          
          const isMockChainError = 
            chainId === 31337 && (
              errorMessage.includes("ECONNREFUSED") ||
              errorMessage.includes("localhost") ||
              errorMessage.includes("Hardhat") ||
              errorMessage.includes("metadata")
            );
          
          const isRelayerBadJsonError = 
            errorMessage.includes("Bad JSON") ||
            errorMessage.includes("didn't response correctly") ||
            errorMessage.includes("Relayer didn't response");
          
          // Set error with more context
          if (isMockChainError) {
            const detailedError = new Error(
              `Failed to connect to local Hardhat node. Please ensure the Hardhat node is running: npx hardhat node`
            );
            setError(detailedError);
          } else if (isRelayerBadJsonError) {
            // This is a common issue with relayer server responses
            const detailedError = new Error(
              `Relayer didn't response correctly. Bad JSON. This may be due to network issues or relayer server problems. Try refreshing the page or wait a moment and try again.`
            );
            setError(detailedError);
          } else if (isSDKError) {
            setError(new Error(`Failed to load FHEVM SDK: ${errorMessage}`));
          } else if (!isNetworkError) {
            setError(e instanceof Error ? e : new Error(String(e)));
          } else {
            // For network errors, log but don't set as critical error
            // The instance might still work with cached data
            console.warn("[useZamaInstance] Network error during initialization (may be recoverable):", errorMessage);
          }
          
          setIsLoading(false);
          setInstance(undefined); // Ensure instance is cleared on error
        }
      });

    return () => {
      abortController.abort();
    };
  }, [isConnected, address, chainId]);

  return { instance, isLoading, error };
}

