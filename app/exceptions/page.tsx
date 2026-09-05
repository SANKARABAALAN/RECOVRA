"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import UserAccountMenu from "@/components/UserAccountMenu";
import Link from "next/link";
import { useDesignSystem } from "@/src/context/DesignContext";

export default function Exceptions() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isSidebarCollapsed } = useDesignSystem();

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/exceptions", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load exceptions.");
      const data = await res.json();
      setExceptions(data.exceptions || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/exceptions/${id}/resolve`, { method: "PATCH" });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to resolve exception");
      }
      fetchExceptions();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const s = (severity || "").toUpperCase();
    if (s === "CRITICAL" || s === "HIGH") return "bg-error/20 text-error border-error/40";
    if (s === "MEDIUM") return "bg-warning/20 text-warning border-warning/40";
    return "bg-primary/20 text-primary border-primary/40";
  };

  const activeExceptions = exceptions.filter((e) => !e.resolved);
  const mainMarginClass = isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]";

  return (
    <div className="flex bg-bg min-h-screen text-text-primary">
      <Sidebar />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
        {/* Top App Bar */}
        <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-headline text-xl font-bold tracking-tight text-text-primary">Exceptions & Halt Monitor</h1>
          </div>
          <div className="flex items-center gap-3 text-text-secondary">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-primary hover:border-primary hover:text-primary transition-all font-mono text-xs uppercase rounded-[12px] bg-surface-secondary/50"
            >
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Home</span>
            </Link>

            <span className="font-mono text-[10px] text-text-secondary border border-border px-2.5 py-1 uppercase rounded-full">
              Razorpay Test Mode
            </span>

            {/* Profile Avatar Pop-up Menu */}
            <UserAccountMenu />
          </div>
        </header>

        {/* Dashboard Canvas */}
        <div className="p-6 md:p-margin-page max-w-container-max mx-auto w-full space-y-6 overflow-y-auto">
          {/* Summary counters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            <div className="glass-panel p-6 border-l-4 border-l-error rounded-[16px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold">Active Exceptions</div>
              <div className="font-headline text-3xl font-bold mt-1 text-error">{activeExceptions.length}</div>
            </div>
            <div className="glass-panel p-6 rounded-[16px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold">Total Events Tracked</div>
              <div className="font-headline text-3xl font-bold mt-1">{exceptions.length}</div>
            </div>
            <div className="glass-panel p-6 rounded-[16px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold">Resolved Exceptions</div>
              <div className="font-headline text-3xl font-bold mt-1 text-success">
                {exceptions.filter((e) => e.resolved).length}
              </div>
            </div>
          </div>

          {/* Exceptions listing */}
          <div className="space-y-4">
            <div className="font-mono text-[10px] font-bold text-text-secondary uppercase">
              HALTED AUTOMATIONS // POLICY INTERRUPTS
            </div>

            {loading ? (
              <div className="p-8 text-center text-text-secondary font-mono text-xs border border-dashed border-border animate-pulse">
                LOADING SYSTEM EXCEPTIONS...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-error font-mono text-xs border border-dashed border-error/30">
                ERROR: {error}
              </div>
            ) : exceptions.length === 0 ? (
              <div className="glass-panel p-12 text-center text-text-secondary font-mono text-xs rounded-[20px]">
                &gt; ALL SYSTEM EXCEPTIONS RESOLVED. SAFETY MONITOR STABLE.
              </div>
            ) : (
              exceptions.map((exc) => (
                <div
                  key={exc.id}
                  className={`glass-panel p-6 relative overflow-hidden group hover:border-error transition-colors ${
                    exc.resolved ? "opacity-60" : ""
                  } rounded-[18px]`}
                >
                  {/* Visual red vertical marker */}
                  <div
                    className={`absolute top-0 bottom-0 left-0 w-[4px] ${
                      exc.resolved ? "bg-success" : "bg-error"
                    }`}
                  ></div>

                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="space-y-3 flex-1 font-mono text-xs">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-text-primary font-bold text-sm uppercase">
                          {exc.type || "SYSTEM EXCEPTION"}
                        </span>
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold border uppercase ${getSeverityBadge(exc.severity)} rounded-full`}>
                          SEVERITY: {exc.severity || "HIGH"}
                        </span>
                        <span className="text-text-secondary text-[11px]">
                          {new Date(exc.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-y border-border/40 py-3">
                        <div>
                          <span className="text-[9px] text-text-secondary/70 uppercase block mb-0.5">Source Component</span>
                          <span className="text-text-primary font-bold">{exc.source || "SYSTEM"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-secondary/70 uppercase block mb-0.5">Target Entity ID</span>
                          <span className="text-error font-bold break-all">{exc.related_entity_id || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-secondary/70 uppercase block mb-0.5">Resolution Status</span>
                          <span className={exc.resolved ? "text-success font-bold uppercase" : "text-warning font-bold uppercase"}>
                            {exc.resolved ? "RESOLVED" : "ACTION REQUIRED"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] text-text-secondary/70 uppercase block mb-0.5">Exception Message</span>
                        <p className="text-text-secondary text-[11px] leading-relaxed mt-0.5">{exc.message}</p>
                      </div>
                    </div>

                    {/* Manual Intervention CTAs */}
                    {!exc.resolved && (
                      <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto font-mono text-[10px] font-bold uppercase tracking-wider">
                        <button
                          onClick={() => handleResolve(exc.id)}
                          className="flex-1 lg:w-[150px] bg-primary text-white py-2.5 px-3 text-center hover:brightness-110 transition-all border-none shadow-md shadow-primary/20 rounded-[14px]"
                        >
                          Resolve Exception
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
