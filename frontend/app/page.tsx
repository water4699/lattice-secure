import { IdentityAuth } from "@/components/IdentityAuth";
import { Navbar } from "@/app/components/Navbar";

export default function Home() {
  return (
    <div className="flex flex-col gap-12">
      <Navbar />
      
      <div className="flex flex-col gap-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-4 py-1.5 text-sm font-bold text-blue-600 shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
            </span>
            Next-Gen Privacy Infrastructure
          </div>
          
          <h1 className="mx-auto max-w-3xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Secure your identity <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">without revealing it</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-xl text-slate-500 leading-relaxed">
            Lattice Secure uses cutting-edge Fully Homomorphic Encryption to verify your credentials on the blockchain while keeping your raw data completely private.
          </p>
        </section>

        <IdentityAuth />
      </div>
    </div>
  );
}

