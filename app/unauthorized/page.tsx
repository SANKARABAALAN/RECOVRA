"use client";

import Link from "next/link";
import { Lock, ArrowLeft, LogIn } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 shadow-lg shadow-amber-500/5">
          <Lock className="h-8 w-8" />
        </div>
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
          Error 401
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">Unauthorized Access</h1>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          You do not have administrative credentials to view this RECOVRA resource. Please authenticate to proceed.
        </p>

        <div className="flex items-center justify-center gap-3 w-full">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors border border-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
