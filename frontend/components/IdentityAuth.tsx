"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useEthersSigner } from "@/hooks/useEthersSigner";
import { useZamaInstance } from "@/hooks/useZamaInstance";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { EncryptedIdentityAuthAddresses } from "@/abi/EncryptedIdentityAuthAddresses";
import { EncryptedIdentityAuthABI } from "@/abi/EncryptedIdentityAuthABI";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";

export const IdentityAuth = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const ethersSignerPromise = useEthersSigner();
  const { instance: zama, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const { storage } = useInMemoryStorage();

  const [userIdentity, setUserIdentity] = useState<string>("");
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");
  const [contractAddress, setContractAddress] = useState<string | undefined>(undefined);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [registrationTimestamp, setRegistrationTimestamp] = useState<number | null>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get contract address based on current chain
  useEffect(() => {
    if (chainId && isMounted) {
      const entry = EncryptedIdentityAuthAddresses[chainId.toString() as keyof typeof EncryptedIdentityAuthAddresses];
      if (entry && "address" in entry && entry.address !== ethers.ZeroAddress) {
        setContractAddress(entry.address);
      } else {
        setContractAddress(undefined);
      }
    } else if (!chainId && isMounted) {
      setContractAddress(undefined);
    }
  }, [chainId, isMounted]);

  // Check registration status
  const checkRegistration = useCallback(async () => {
    if (!contractAddress || !address || !publicClient) return;

    try {
      setRpcError(null);
      const registered = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: EncryptedIdentityAuthABI.abi,
        functionName: "isRegistered",
        args: [address as `0x${string}`],
      });
      setIsRegistered(registered as boolean);

      // Get registration timestamp if registered
      if (registered) {
        const timestamp = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: EncryptedIdentityAuthABI.abi,
          functionName: "getRegistrationTimestamp",
          args: [address as `0x${string}`],
        });
        setRegistrationTimestamp(Number(timestamp));
      } else {
        setRegistrationTimestamp(null);
      }
    } catch (error: unknown) {
      setIsRegistered(false);

      // Check if it's a network/RPC error
      const errorMessage = error instanceof Error ? error.message : "";
      const isNetworkError =
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("fetch failed") ||
        errorMessage.includes("ECONNREFUSED") ||
        (error instanceof Error && 'code' in error && error.code === "NETWORK_ERROR");
      
      if (isNetworkError) {
        if (chainId === 31337) {
          setRpcError("Hardhat node is not running. Please start it with: npx hardhat node");
        } else {
          setRpcError("Failed to connect to RPC. Please check your network connection.");
        }
        // Don't log network errors to console as they're expected when node is not running
      } else {
        // Only log non-network errors
        console.error("Error checking registration:", error);
      }
    }
  }, [contractAddress, address, publicClient, chainId]);

  useEffect(() => {
    if (isConnected && contractAddress) {
      checkRegistration();
    }
  }, [isConnected, contractAddress, checkRegistration]);

  const handleRegister = useCallback(async () => {
    if (!userIdentity) {
      setMessage("⚠️ Please enter your identity number");
      return;
    }

    if (!isConnected || !address) {
      setMessage("⚠️ Please connect your wallet first");
      return;
    }

    if (!contractAddress) {
      setMessage("⚠️ Contract not deployed on this network. Please switch to the correct network or deploy the contract.");
      return;
    }

    if (zamaLoading) {
      setMessage("⏳ Please wait while the encryption system is loading... This may take a few seconds.");
      return;
    }

    if (!zama) {
      if (zamaError) {
        const errorMsg = zamaError instanceof Error ? zamaError.message : String(zamaError);
        setMessage(`⚠️ Encryption system initialization failed: ${errorMsg}. Please check your network connection and try refreshing the page.`);
      } else if (zamaLoading) {
        setMessage("⏳ Encryption system is loading... Please wait.");
      } else {
        setMessage("⚠️ Encryption system is not ready. Please wait a moment for the encryption system to initialize. If this persists, try refreshing the page.");
      }
      return;
    }

    if (!ethersSignerPromise) {
      setMessage("⚠️ Wallet signer is not available. Please reconnect your wallet.");
      return;
    }

    const identityNum = parseInt(userIdentity);
    if (isNaN(identityNum) || identityNum < 0) {
      setMessage("⚠️ Identity must be a positive number");
      return;
    }

    setIsRegistering(true);
    setCurrentStep("encrypting");
    setMessage("Encrypting identity...");

    try {
      const signer = await ethersSignerPromise;
      const contract = new ethers.Contract(
        contractAddress,
        EncryptedIdentityAuthABI.abi,
        signer
      );

      // Encrypt identity
      setCurrentStep("encrypting");
      setMessage(`Encrypting identity "${identityNum}" locally...`);
      const input = zama.createEncryptedInput(contractAddress, address);
      input.add32(identityNum);
      const encrypted = await input.encrypt();
      
      // Store encrypted handle for display
      const handleString = Array.from(encrypted.handles[0]).map(b => b.toString(16).padStart(2, '0')).join('');
      setMessage(`✓ Encrypted! Handle: ${handleString.slice(0, 20)}...`);

      setCurrentStep("registering");
      setMessage("Sending encrypted identity to blockchain...");
      const tx = await contract.register(encrypted.handles[0], encrypted.inputProof);
      setMessage(`Transaction sent: ${tx.hash}. Waiting for confirmation...`);

      await tx.wait();
      setCurrentStep("complete");
      setMessage("✓ Registration successful! Your encrypted identity is now stored on-chain.");
      setIsRegistered(true);
      // Refresh registration status
      await checkRegistration();
    } catch (error: unknown) {
      console.error("Registration error:", error);
      
      let errorMessage = "Registration failed";
      let errorDetails = "";

      if (error instanceof Error) {
        const errorStr = error.message.toLowerCase();
        
        // Handle user rejection
        if (errorStr.includes("user rejected") || errorStr.includes("user denied") || errorStr.includes("action rejected")) {
          errorMessage = "❌ Transaction rejected";
          errorDetails = "You cancelled the transaction. Please try again if you want to proceed.";
        }
        // Handle insufficient funds
        else if (errorStr.includes("insufficient funds") || errorStr.includes("balance")) {
          errorMessage = "❌ Insufficient funds";
          errorDetails = "You don't have enough funds to pay for the transaction gas fees.";
        }
        // Handle network errors
        else if (errorStr.includes("network") || errorStr.includes("rpc") || errorStr.includes("connection")) {
          errorMessage = "❌ Network error";
          if (chainId === 31337) {
            errorDetails = "Cannot connect to Hardhat node. Please make sure it's running with: npx hardhat node";
          } else {
            errorDetails = "Failed to connect to the blockchain network. Please check your internet connection and try again.";
          }
        }
        // Handle encryption errors
        else if (errorStr.includes("encrypt") || errorStr.includes("fhevm") || errorStr.includes("relayer")) {
          errorMessage = "❌ Encryption error";
          errorDetails = "Failed to encrypt your identity. This might be due to network issues with the encryption service. Please try again.";
        }
        // Handle contract errors
        else if (errorStr.includes("already registered") || errorStr.includes("duplicate")) {
          errorMessage = "⚠️ Already registered";
          errorDetails = "This identity is already registered. You can verify it using the verification section below.";
          setIsRegistered(true);
          await checkRegistration();
        }
        // Generic error
        else {
          errorMessage = "❌ Registration failed";
          errorDetails = error.message;
        }

        // Add helpful troubleshooting information
        errorDetails += "\n\nTroubleshooting tips:\n• Ensure your wallet is connected\n• Check if Hardhat node is running (npx hardhat node)\n• Verify you have sufficient ETH for gas fees\n• Make sure you're on the correct network";
      } else {
        errorDetails = String(error);
      }

      setMessage(`${errorMessage}${errorDetails ? `: ${errorDetails}` : ""}`);
      setCurrentStep("");
    } finally {
      setIsRegistering(false);
    }
  }, [userIdentity, zama, zamaLoading, zamaError, ethersSignerPromise, contractAddress, address, isConnected, chainId, checkRegistration]);

  // Memoize button disabled states for performance
  const isRegistrationDisabled = useMemo(() =>
    !userIdentity || isRegistering || isVerifying || zamaLoading || isRegistered,
    [userIdentity, isRegistering, isVerifying, zamaLoading, isRegistered]
  );

  const isVerificationDisabled = useMemo(() =>
    !userIdentity || isRegistering || isVerifying || zamaLoading,
    [userIdentity, isRegistering, isVerifying, zamaLoading]
  );

  const handleVerify = useCallback(async () => {
    if (!userIdentity) {
      setMessage("⚠️ Please enter your identity number");
      return;
    }

    if (!isConnected || !address) {
      setMessage("⚠️ Please connect your wallet first");
      return;
    }

    if (!contractAddress) {
      setMessage("⚠️ Contract not deployed on this network. Please switch to the correct network or deploy the contract.");
      return;
    }

    if (zamaLoading) {
      setMessage("⏳ Please wait while the encryption system is loading... This may take a few seconds.");
      return;
    }

    if (!zama) {
      if (zamaError) {
        const errorMsg = zamaError instanceof Error ? zamaError.message : String(zamaError);
        setMessage(`⚠️ Encryption system initialization failed: ${errorMsg}. Please check your network connection and try refreshing the page.`);
      } else if (zamaLoading) {
        setMessage("⏳ Encryption system is loading... Please wait.");
      } else {
        setMessage("⚠️ Encryption system is not ready. Please wait a moment for the encryption system to initialize. If this persists, try refreshing the page.");
      }
      return;
    }

    if (!ethersSignerPromise) {
      setMessage("⚠️ Wallet signer is not available. Please reconnect your wallet.");
      return;
    }

    const identityNum = parseInt(userIdentity);
    if (isNaN(identityNum) || identityNum < 0) {
      setMessage("⚠️ Identity must be a positive number");
      return;
    }

    setIsVerifying(true);
    setCurrentStep("encrypting");
    setMessage("Encrypting identity for verification...");

    try {
      const signer = await ethersSignerPromise;
      const contract = new ethers.Contract(
        contractAddress,
        EncryptedIdentityAuthABI.abi,
        signer
      );

      // Step 1: Encrypt identity
      setCurrentStep("encrypting");
      setMessage(`Step 1/3: Encrypting identity "${identityNum}" locally...`);
      const input = zama.createEncryptedInput(contractAddress, address);
      input.add32(identityNum);
      const encrypted = await input.encrypt();
      const handleString = Array.from(encrypted.handles[0]).map(b => b.toString(16).padStart(2, '0')).join('');
      setMessage(`✓ Step 1 Complete: Encrypted! Handle: ${handleString.slice(0, 20)}...`);

      // Step 2: Verify on-chain (FHE comparison)
      setCurrentStep("verifying");
      setMessage("Step 2/3: Comparing encrypted identities on-chain (FHE operation)...");
      
      // Call verify function - it returns an ebool (handle string)
      // In ethers.js, non-view functions that return values will return the value after transaction confirmation
      const verifyResult = await contract.verify(encrypted.handles[0], encrypted.inputProof);
      
      // Extract the handle string from the result
      // The result should be a string (handle), but handle different return types
      let encryptedResult: string;
      if (typeof verifyResult === 'string') {
        encryptedResult = verifyResult;
      } else if (verifyResult && typeof verifyResult === 'object') {
        // If it's an object, it might be a transaction response
        // Wait for it and try to get the return value
        if ('wait' in verifyResult) {
          await verifyResult.wait();
          // Try to extract return value from receipt
          // For FHE contracts, the return value is usually the handle string
          // We might need to decode it from logs or use a different approach
          // For now, let's use staticCall to get the return value without sending a transaction
          const staticResult = await contract.verify.staticCall(encrypted.handles[0], encrypted.inputProof);
          encryptedResult = typeof staticResult === 'string' ? staticResult : String(staticResult);
        } else {
          encryptedResult = String(verifyResult);
        }
      } else {
        encryptedResult = String(verifyResult);
      }
      
      setMessage(`✓ Step 2 Complete: FHE comparison done! Encrypted result handle: ${encryptedResult.slice(0, 20)}...`);

      // Step 3: Decrypt result
      setCurrentStep("decrypting");
      setMessage("Step 3/3: Decrypting verification result locally...");
      
      // Get decryption signature
      const sig = await FhevmDecryptionSignature.loadOrSign(
        zama,
        [contractAddress],
        signer,
        storage
      );

      if (!sig) {
        setMessage("Failed to get decryption signature");
        return;
      }

      // Decrypt result - ensure encryptedResult is a string
      const resultHandle = typeof encryptedResult === 'string' ? encryptedResult : String(encryptedResult);
      const result = await zama.userDecrypt(
        [{ handle: resultHandle, contractAddress }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const isValid = result[resultHandle] === true;
      setVerificationResult(isValid);
      setCurrentStep("complete");
      setMessage(isValid 
        ? "✓ Step 3 Complete: Decrypted result = true. Verification successful! Identity matches." 
        : "✓ Step 3 Complete: Decrypted result = false. Verification failed. Identity does not match.");
    } catch (error: unknown) {
      console.error("Verification error:", error);
      
      let errorMessage = "Verification failed";
      let errorDetails = "";

      if (error instanceof Error) {
        const errorStr = error.message.toLowerCase();
        
        // Handle user rejection
        if (errorStr.includes("user rejected") || errorStr.includes("user denied") || errorStr.includes("action rejected")) {
          errorMessage = "❌ Transaction rejected";
          errorDetails = "You cancelled the transaction. Please try again if you want to proceed.";
        }
        // Handle insufficient funds
        else if (errorStr.includes("insufficient funds") || errorStr.includes("balance")) {
          errorMessage = "❌ Insufficient funds";
          errorDetails = "You don't have enough funds to pay for the transaction gas fees.";
        }
        // Handle network errors
        else if (errorStr.includes("network") || errorStr.includes("rpc") || errorStr.includes("connection")) {
          errorMessage = "❌ Network error";
          if (chainId === 31337) {
            errorDetails = "Cannot connect to Hardhat node. Please make sure it's running with: npx hardhat node";
          } else {
            errorDetails = "Failed to connect to the blockchain network. Please check your internet connection and try again.";
          }
        }
        // Handle encryption errors
        else if (errorStr.includes("encrypt") || errorStr.includes("decrypt") || errorStr.includes("fhevm") || errorStr.includes("relayer")) {
          errorMessage = "❌ Encryption/Decryption error";
          errorDetails = "Failed to encrypt or decrypt your identity. This might be due to network issues with the encryption service. Please try again.";
        }
        // Handle contract errors
        else if (errorStr.includes("not registered")) {
          errorMessage = "⚠️ Identity not registered";
          errorDetails = "This identity has not been registered yet. Please register it first using the registration section above.";
        }
        // Generic error
        else {
          errorMessage = "❌ Verification failed";
          errorDetails = error.message;
        }
      } else {
        errorDetails = String(error);
      }

      setMessage(`${errorMessage}${errorDetails ? `: ${errorDetails}` : ""}`);
      setVerificationResult(null);
      setCurrentStep("");
    } finally {
      setIsVerifying(false);
    }
  }, [userIdentity, zama, zamaLoading, zamaError, ethersSignerPromise, contractAddress, address, isConnected, chainId, storage]);

  // Prevent hydration mismatch - show loading state until mounted
  if (!isMounted) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-500 animate-pulse font-medium">Initializing secure environment...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="mx-auto mt-12 max-w-md text-center">
        <div className="rounded-3xl border border-slate-200 bg-white/50 p-10 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-4xl shadow-inner">
            👋
          </div>
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900">Welcome</h2>
          <p className="mb-8 text-slate-600 leading-relaxed">
            Please connect your wallet to access the privacy-preserving identity authentication system.
          </p>
          <div className="flex justify-center scale-110">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (!contractAddress) {
    const chainName = chainId === 31337 ? "Hardhat Local" : chainId === 11155111 ? "Sepolia Testnet" : `Chain ID ${chainId || "unknown"}`;
    return (
      <div className="mx-auto mt-12 max-w-lg">
        <div className="rounded-3xl border border-red-100 bg-red-50/30 p-8 shadow-xl backdrop-blur-md">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl">
            ⚠️
          </div>
          <h2 className="mb-2 text-2xl font-bold text-red-900">Contract Not Deployed</h2>
          <p className="mb-6 text-red-700/80">
            The authentication contract is not available on <span className="font-bold text-red-900">{chainName}</span>.
          </p>
          <div className="space-y-4 rounded-2xl bg-white/60 p-5 border border-red-100/50">
            <p className="text-sm font-semibold text-red-900 uppercase tracking-wider">Supported Networks</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-red-800">
                <span className="h-2 w-2 rounded-full bg-red-400"></span>
                <span>Hardhat Local (Chain: 31337)</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-red-800">
                <span className="h-2 w-2 rounded-full bg-red-400"></span>
                <span>Sepolia Testnet (Chain: 11155111)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const primaryBtnClass =
    "group relative inline-flex items-center justify-center rounded-2xl bg-slate-900 px-8 py-4 text-base font-bold text-white shadow-xl transition-all duration-300 hover:bg-slate-800 hover:shadow-slate-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none w-full sm:w-auto overflow-hidden";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 pb-12">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-2xl sm:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-50/50 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-50/50 blur-3xl"></div>
        
        <div className="relative">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-slate-900">
                Identity <span className="text-blue-600">Authentication</span>
              </h2>
              <p className="text-lg text-slate-500">
                Secured by Fully Homomorphic Encryption (FHE)
              </p>
            </div>
            
            <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 border ${
              isRegistered ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"
            }`}>
              <div className={`h-3 w-3 rounded-full animate-pulse ${isRegistered ? "bg-emerald-500" : "bg-amber-500"}`}></div>
              <span className="font-bold tracking-wide uppercase text-xs">
                {isRegistered ? "System Active: Registered" : "System Ready: Unregistered"}
              </span>
            </div>
          </div>

          {(rpcError || zamaError) && (
            <div className="mb-8 rounded-2xl border border-red-100 bg-red-50/50 p-5 backdrop-blur-sm animate-in fade-in slide-in-from-top-4">
              <div className="flex gap-4">
                <span className="text-2xl">🚨</span>
                <div className="flex-1">
                  <h3 className="font-bold text-red-900">System Alert</h3>
                  <p className="mt-1 text-sm text-red-700 leading-relaxed">
                    {rpcError || (zamaError instanceof Error ? zamaError.message : String(zamaError))}
                  </p>
                  <button 
                    onClick={() => { setRpcError(null); }}
                    className="mt-3 text-xs font-bold text-red-900 underline underline-offset-4 hover:no-underline"
                  >
                    Dismiss Alert
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-10 mt-10">
            {/* Input Section */}
            <div className="group relative space-y-3">
              <label className="text-sm font-bold uppercase tracking-widest text-slate-400 ml-1">
                Personal Identification Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-5 text-2xl">
                  🆔
                </div>
                <input
                  type="number"
                  value={userIdentity}
                  onChange={(e) => setUserIdentity(e.target.value)}
                  placeholder="e.g. 88294021"
                  className="h-20 w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 pl-16 pr-6 text-2xl font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 group-hover:border-slate-200 disabled:opacity-50"
                  disabled={isRegistering || isVerifying}
                />
              </div>
              <p className="text-sm text-slate-400 ml-1 italic">
                Your number is encrypted locally before being sent to the blockchain.
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Register Card */}
              <div className={`relative overflow-hidden rounded-[2rem] border-2 p-8 transition-all duration-300 ${
                isRegistered 
                  ? "border-emerald-100 bg-emerald-50/30" 
                  : "border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl"
              }`}>
                <div className="relative z-10 space-y-6">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm ${
                    isRegistered ? "bg-emerald-100" : "bg-blue-50"
                  }`}>
                    {isRegistered ? "✅" : "➕"}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Register</h3>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                      Encrypt and anchor your identity securely on-chain.
                    </p>
                  </div>
                  <button
                    className={`${primaryBtnClass} ${isRegistered ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"} !w-full`}
                    onClick={handleRegister}
                    disabled={isRegistrationDisabled}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {isRegistering ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : isRegistered ? "Registered" : "Secure Register"}
                    </span>
                  </button>
                  {isRegistered && registrationTimestamp && (
                    <div className="mt-4 pt-4 border-t border-emerald-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Registration Date</p>
                      <p className="text-xs font-medium text-emerald-700 mt-1">
                        {new Date(registrationTimestamp * 1000).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Verify Card */}
              <div className={`relative overflow-hidden rounded-[2rem] border-2 p-8 transition-all duration-300 ${
                !isRegistered 
                  ? "border-slate-100 bg-slate-50/50 opacity-60" 
                  : "border-slate-100 bg-white hover:border-indigo-200 hover:shadow-xl"
              }`}>
                <div className="relative z-10 space-y-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl shadow-sm">
                    🔍
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Verify</h3>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                      Zero-knowledge comparison of your current identification.
                    </p>
                  </div>
                  <button
                    className={`${primaryBtnClass} bg-slate-900 hover:bg-slate-800 !w-full`}
                    onClick={handleVerify}
                    disabled={isVerificationDisabled}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {isVerifying ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : "Run Verification"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Status & Messages */}
            {(message || verificationResult !== null) && (
              <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Process Log</h4>
                  <div className="h-px flex-1 mx-6 bg-slate-200"></div>
                  {currentStep && currentStep !== "complete" && (
                    <span className="flex items-center gap-2 text-xs font-bold text-blue-600 animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                      {currentStep.toUpperCase()}...
                    </span>
                  )}
                </div>

                {verificationResult !== null && (
                  <div className={`mb-6 flex items-center gap-6 rounded-[2rem] p-6 ${
                    verificationResult ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  } shadow-lg transition-all duration-500`}>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl">
                      {verificationResult ? "✨" : "❌"}
                    </div>
                    <div>
                      <h5 className="text-xl font-bold">{verificationResult ? "Verification Success" : "Verification Failed"}</h5>
                      <p className="mt-1 font-medium opacity-90 text-sm">
                        {verificationResult ? "Your identity has been confirmed securely." : "The provided identification does not match our records."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className={`rounded-2xl border p-4 transition-all ${
                    message.startsWith("✓") || message.startsWith("✅")
                      ? "border-emerald-100 bg-white text-emerald-800"
                      : message.startsWith("❌") || message.startsWith("⚠️")
                      ? "border-red-100 bg-white text-red-800"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}>
                    <div className="flex gap-3">
                      <span className="shrink-0">{message.startsWith("✓") ? "✅" : message.startsWith("❌") ? "❌" : message.startsWith("⚠️") ? "⚠️" : "ℹ️"}</span>
                      <p className="text-sm font-medium leading-relaxed">{message}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Features Info */}
      <div className="grid gap-6 sm:grid-cols-3">
        {[
          { title: "Privacy First", icon: "🕶️", desc: "Data is encrypted on your device. Only you can access your plaintext." },
          { title: "ZKP Ready", icon: "🧪", desc: "Prove your identity without revealing the actual number to任何人." },
          { title: "FHE Compute", icon: "⚡", desc: "Computations happen directly on encrypted data for maximum security." }
        ].map((feat, i) => (
          <div key={i} className="rounded-[2rem] border border-slate-100 bg-white/60 p-6 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-xl shadow-inner">
              {feat.icon}
            </div>
            <h4 className="mb-2 font-bold text-slate-900">{feat.title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

