"use client";

import { useLayoutEffect } from "react";

/**
 * Global error handler to suppress expected network errors that don't affect functionality
 * Uses useLayoutEffect to register handlers synchronously before DOM paint
 */
export function ErrorHandler() {
  useLayoutEffect(() => {
    // Helper function to check if error should be suppressed
    const shouldSuppressError = (errorString: string): boolean => {
      const normalizedError = errorString.toLowerCase();
      return (
        normalizedError.includes("failed to fetch") ||
        normalizedError.includes("fetch failed") ||
        normalizedError.includes("econnrefused") ||
        normalizedError.includes("networkerror") ||
        normalizedError.includes("network request failed") ||
        normalizedError.includes("err_connection_closed") ||
        normalizedError.includes("relayer.testnet.zama.cloud") ||
        normalizedError.includes("err_blocked_by_response") ||
        normalizedError.includes("coinbase.com") ||
        normalizedError.includes("cca-lite.coinbase.com") ||
        normalizedError.includes("notsameoriginafterdefaultedtosameoriginbycoep") ||
        normalizedError.includes("base account sdk requires") ||
        normalizedError.includes("cross-origin-opener-policy") ||
        normalizedError.includes("lit is in dev mode") ||
        normalizedError.includes("relayersdkloader") ||
        normalizedError.includes("window does not contain 'relayersdk' property") ||
        normalizedError.includes("relayersdkloader: window does not contain") ||
        normalizedError.includes("keyurl") ||
        normalizedError.includes("/v1/keyurl") ||
        normalizedError.includes("relayer-sdk") ||
        normalizedError.includes("zama.cloud") ||
        normalizedError.includes("failed to load resource") ||
        normalizedError.includes("net::err_connection_closed") ||
        normalizedError.includes("net::err_blocked_by_response")
      );
    };

    // Override console.error to filter out expected network errors
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const errorString = args.join(" ");

      // Only log unexpected errors
      if (!shouldSuppressError(errorString)) {
        originalError.apply(console, args);
      }
    };

    // Override console.warn to filter out expected warnings
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const warnString = args.join(" ");

      // Suppress expected warnings
      if (!shouldSuppressError(warnString)) {
        originalWarn.apply(console, args);
      }
    };

    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason || "");
      
      // Suppress expected network errors
      if (shouldSuppressError(errorMessage)) {
        // Prevent the error from appearing in console
        event.preventDefault();
        return;
      }
      
      // Log unexpected errors
      console.error("Unhandled promise rejection:", event.reason);
    };

    // Handle global errors
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || String(event.error || "");
      
      // Suppress expected errors
      if (shouldSuppressError(errorMessage)) {
        event.preventDefault();
        return false;
      }
      
      return true;
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}

