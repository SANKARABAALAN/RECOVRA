"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js Error Boundary caught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-lg shadow-red-500/5">
          <AlertOctagon className="h-8 w-8" />
        </div>
        <span className="text-xs font-semibold text-red-400 uppercase tracking-widest px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-3">
          Error 500
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">System Execution Error</h1>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          An unhandled system error occurred. Our fault-tolerant recovery engine has logged the exception.
        </p>

        <div className="flex items-center justify-center gap-3 w-full">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Component
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors border border-zinc-700"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
