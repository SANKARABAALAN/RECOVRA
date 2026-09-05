"use client";

import { Wrench, RefreshCw } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 shadow-lg shadow-blue-500/5">
          <Wrench className="h-8 w-8 animate-pulse" />
        </div>
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-3">
          Maintenance Mode
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">Scheduled Maintenance</h1>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          RECOVRA infrastructure is currently undergoing scheduled system upgrades. Background recovery queues and webhook listeners remain operational.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors border border-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          Check System Status
        </button>
      </div>
    </div>
  );
}
