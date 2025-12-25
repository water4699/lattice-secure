import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "./client-providers";

export const metadata: Metadata = {
  title: "Encrypted Identity Authentication",
  description: "Privacy-preserving identity authentication using FHE",
  keywords: ["FHE", "blockchain", "privacy", "authentication", "encryption"],
  authors: [{ name: "Encrypted Identity Auth Team" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-foreground antialiased selection:bg-blue-100 selection:text-blue-900">
        <div className="fixed inset-0 z-[-10] h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="fixed inset-0 z-[-20] h-full w-full bg-gradient-to-tr from-blue-50/50 via-white to-indigo-50/50"></div>
        <ClientProviders>
          <div className="relative flex min-h-screen flex-col">
            <main className="flex-1">
              <div className="container mx-auto px-4 md:px-6 max-w-5xl py-8">
                {children}
              </div>
            </main>
            <footer className="border-t py-6 md:py-0">
              <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row max-w-5xl px-4">
                <p className="text-center text-sm leading-loose text-slate-500 md:text-left">
                  Built with <span className="text-blue-600">FHEVM</span> & <span className="text-indigo-600">Zama</span>. 
                  Secure, private, and verifiable.
                </p>
              </div>
            </footer>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}

