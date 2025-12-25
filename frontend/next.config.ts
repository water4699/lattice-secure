import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers() {
    // Required by FHEVM Relayer SDK
    // These headers are essential for SharedArrayBuffer support (needed for FHE operations)
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin', // Required for FHEVM threads support
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp', // Required for SharedArrayBuffer
          },
        ],
      },
    ]);
  }
};

export default nextConfig;

