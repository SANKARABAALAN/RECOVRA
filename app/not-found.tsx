"use client";

import Link from "next/link";
import { Search, ArrowLeft, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 shadow-lg shadow-emerald-500/5">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
          Error 404
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">Page Not Found</h1>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          The page or recovery resource you requested could not be located on RECOVRA servers.
        </p>

        <div className="flex items-center justify-center gap-4 w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
