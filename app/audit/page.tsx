"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import UserAccountMenu from "@/components/UserAccountMenu";
import Link from "next/link";
import { useDesignSystem } from "@/src/context/DesignContext";

export default function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState("");
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isSidebarCollapsed } = useDesignSystem();

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        setLoading(true);
        const res = await fetch("/api/audit");
        if (!res.ok) throw new Error("Failed to fetch audit logs.");
        const data = await res.json();
        setAuditEvents(data.audit_logs || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAuditLogs();
  }, []);

  const getLevelStyle = (level: string) => {
    switch (level) {
      case "SUCCESS":
      case "PAYMENT_SUCCESS":
      case "POLICY_APPROVED":
        return "text-success border-success/30 bg-success/10";
      case "ERR":
      case "PAYMENT_FAILED":
      case "POLICY_BLOCKED":
      case "EXCEPTION_CREATED":
        return "text-error border-error/30 bg-error/10";
      case "AI_EVAL":
      case "DIAGNOSIS_CREATED":
      case "INTENT_DETECTED":
        return "text-primary border-primary/30 bg-primary/10";
      case "POLICY":
      case "POLICY_ESCALATED":
        return "text-warning border-warning/30 bg-warning/10";
      case "EXECUTE":
      default:
        return "text-text-primary border-border bg-surface-secondary";
    }
  };

  const filteredEvents = auditEvents.filter((item) =>
    (item.event_type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.result || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.actor || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mainMarginClass = isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]";

  return (
    <div className="flex bg-bg min-h-screen text-text-primary">
      <Sidebar />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
        {/* Top App Bar */}
        <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-headline text-xl font-bold tracking-tight text-text-primary">Audit Trail</h1>
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
          {/* Controls */}
          <div className="max-w-md relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-[18px]">
              search
            </span>
            <input
              className="w-full bg-surface border border-border text-text-primary font-mono text-xs py-2.5 pl-10 pr-3 focus:outline-none focus:border-primary placeholder:text-text-secondary/70 transition-all rounded-[14px] shadow-sm"
              placeholder="Search audit events, reasons, results..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Audit events list */}
          <div className="glass-panel overflow-hidden rounded-[18px] shadow-lg">
            <div className="bg-surface-secondary/60 px-4 py-3 border-b border-border font-mono text-[10px] font-bold text-text-secondary flex justify-between items-center">
              <span>SYSTEM AUDIT TRAIL // CHRONOLOGICAL ORDER</span>
              <span className="text-text-secondary">{filteredEvents.length} Recorded Events</span>
            </div>
            
            <div className="divide-y divide-border/50">
              {loading ? (
                <div className="p-8 text-center text-text-secondary font-mono text-xs animate-pulse">
                  LOADING SYSTEM AUDIT TRAIL FROM SUPABASE...
                </div>
              ) : error ? (
                <div className="p-8 text-center text-error font-mono text-xs">
                  ERROR LOADING AUDIT TRAIL: {error}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-12 text-center text-text-secondary font-mono text-xs">
                  &gt; NO LOG RECORDS MATCHING SEARCH CRITERIA
                </div>
              ) : (
                filteredEvents.map((evt) => (
                  <div key={evt.id} className="p-5 hover:bg-surface-secondary/40 transition-colors font-mono text-xs space-y-2.5">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-text-primary font-bold text-[11px]">
                          {new Date(evt.created_at).toLocaleString()}
                        </span>
                        <span className={`px-2.5 py-0.5 border text-[9px] font-bold uppercase ${getLevelStyle(evt.event_type)} rounded-full`}>
                          {evt.actor || "SYSTEM"}
                        </span>
                      </div>
                      <span className="text-primary font-bold uppercase tracking-wider text-[11px]">{evt.event_type}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-text-secondary pl-0 md:pl-2">
                      <div>
                        <span className="text-[9px] text-text-secondary/70 block uppercase font-bold">Triggering Cause / Reason</span>
                        <span className="text-text-secondary mt-0.5 block leading-relaxed">{evt.reason}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-text-secondary/70 block uppercase font-bold">Execution Output / Result</span>
                        <span className="text-text-primary mt-0.5 block leading-relaxed">{evt.result}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
