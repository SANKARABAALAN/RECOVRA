"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import UserAccountMenu from "@/components/UserAccountMenu";
import Link from "next/link";
import { useDesignSystem } from "@/src/context/DesignContext";

export default function AdminConsole() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cases, setCases] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);

  const [workerRunning, setWorkerRunning] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);

  const { isSidebarCollapsed } = useDesignSystem();

  async function fetchAdminData() {
    try {
      setLoading(true);
      const [casesRes, auditsRes, exceptionsRes] = await Promise.all([
        fetch("/api/recovery"),
        fetch("/api/audit"),
        fetch("/api/exceptions"),
      ]);

      if (!casesRes.ok || !auditsRes.ok || !exceptionsRes.ok) {
        throw new Error("Failed to load admin monitoring logs.");
      }

      const casesData = await casesRes.json();
      const auditsData = await auditsRes.json();
      const exceptionsData = await exceptionsRes.json();

      setCases(casesData || []);
      setAudits(auditsData.audit_logs || []);
      setExceptions(exceptionsData.exceptions || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdminData();
  }, []);

  // 1-Click Trigger Recovery Automation Worker
  const handleRunWorker = async () => {
    setWorkerRunning(true);
    try {
      const res = await fetch("/api/recovery/worker", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        alert(`Automation Worker Executed!\n\nProcessed: ${data.processed || 0}\nRecovered / Successful: ${data.successful ?? data.recovered ?? 0}\nFailed: ${data.failed || 0}\nSkipped: ${data.skipped ?? data.rescheduled ?? 0}`);
        fetchAdminData();
      } else {
        alert("Worker Error: " + data.error);
      }
    } catch (err: any) {
      alert("Worker execution error: " + err.message);
    } finally {
      setWorkerRunning(false);
    }
  };

  // 1-Click Demo Scenario Seeding (100 Records)
  const handleSeedDemo = async () => {
    setSeedLoading(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        alert(`🎉 1-Click Demo Generator Complete!\n\nSuccessfully seeded ${data.countCreated} realistic demo records across all tables.`);
        fetchAdminData();
      } else {
        alert("Seed error: " + data.error);
      }
    } catch (err: any) {
      alert("Demo seed error: " + err.message);
    } finally {
      setSeedLoading(false);
    }
  };

  // 1-Click Reset Demo Data
  const handleResetData = async () => {
    if (!confirm("Are you sure you want to reset demo data?")) return;
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Database environment cleanly reset.");
        fetchAdminData();
      }
    } catch (err: any) {
      alert("Reset error: " + err.message);
    }
  };

  // Export CSV Helper
  const exportCSV = (filename: string, rows: object[]) => {
    if (!rows || rows.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = Object.keys(rows[0]).join(",");
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows.map((e) => Object.values(e).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON Helper
  const exportJSON = (filename: string, data: any) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingRetries = cases.filter((c) => c.recovery_status !== "Recovered" && c.recovery_status !== "Failed");
  const mainMarginClass = isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]";

  return (
    <div className="flex bg-bg min-h-screen text-text-primary">
      <Sidebar />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
        {/* Top App Bar */}
        <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-headline text-xl font-bold tracking-tight text-text-primary">Admin & Operations Console</h1>
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

            <UserAccountMenu />
          </div>
        </header>

        {/* Dashboard Canvas */}
        <div className="p-6 md:p-margin-page max-w-container-max mx-auto w-full space-y-6 overflow-y-auto font-mono">
          {/* Quick Trigger Bar */}
          <div className="glass-panel p-5 rounded-[18px] flex flex-wrap justify-between items-center gap-4 bg-surface-secondary/40">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-success rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-text-primary uppercase">OPERATIONS CONTROL CENTER</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Trigger Worker */}
              <button
                onClick={handleRunWorker}
                disabled={workerRunning}
                className="bg-primary text-white text-xs font-bold uppercase px-4 py-2.5 rounded-[14px] shadow-md shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2"
              >
                {workerRunning ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                    Running Worker...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    Run Automation Worker
                  </>
                )}
              </button>

              {/* 1-Click Demo Seed */}
              <button
                onClick={handleSeedDemo}
                disabled={seedLoading}
                className="bg-success text-white text-xs font-bold uppercase px-4 py-2.5 rounded-[14px] shadow-md shadow-success/20 hover:brightness-110 transition-all flex items-center gap-2"
              >
                {seedLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                    Seeding 100 Records...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">database</span>
                    1-Click Seed 100 Scenarios
                  </>
                )}
              </button>

              {/* Reset Data */}
              <button
                onClick={handleResetData}
                className="border border-border text-text-secondary hover:text-error hover:border-error text-xs font-bold uppercase px-3.5 py-2.5 rounded-[14px] transition-all"
              >
                Reset Database
              </button>
            </div>
          </div>

          {/* Operational Status Monitors Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Worker Monitor */}
            <div className="glass-panel p-5 rounded-[18px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold mb-1">Automation Worker Monitor</div>
              <div className="text-lg font-bold text-success flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-success rounded-full animate-pulse"></span>
                ACTIVE (IDLE)
              </div>
              <div className="text-[10px] text-text-secondary mt-2">Queue Poll Delay: 60s | Max Batch: 50</div>
            </div>

            {/* Webhook Monitor */}
            <div className="glass-panel p-5 rounded-[18px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold mb-1">Razorpay Webhook Monitor</div>
              <div className="text-lg font-bold text-primary">ONLINE</div>
              <div className="text-[10px] text-text-secondary mt-2">Endpoint: /api/webhooks/razorpay | 100% Delivery</div>
            </div>

            {/* AI Monitor */}
            <div className="glass-panel p-5 rounded-[18px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold mb-1">Gemini 2.5 Flash Engine</div>
              <div className="text-lg font-bold text-text-primary">HEALTHY</div>
              <div className="text-[10px] text-text-secondary mt-2">Avg Latency: 420ms | Local Fallback: Ready</div>
            </div>

            {/* Exceptions Counter */}
            <div className="glass-panel p-5 rounded-[18px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold mb-1">Active Exceptions</div>
              <div className="text-lg font-bold text-error">{exceptions.filter((e) => !e.resolved).length} Halted</div>
              <div className="text-[10px] text-text-secondary mt-2">Policy Interrupt Guardrail Active</div>
            </div>
          </div>

          {/* Export Center */}
          <div className="glass-panel p-6 rounded-[18px] space-y-4">
            <div className="text-xs font-bold text-text-secondary uppercase border-b border-border pb-3 flex justify-between items-center">
              <span>Export Center // Data Compliance Reports</span>
              <span className="material-symbols-outlined text-primary text-[18px]">download</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <button
                onClick={() => exportCSV("recovra_audit_trail.csv", audits)}
                className="p-3 border border-border bg-surface-secondary/40 hover:border-primary text-text-primary rounded-[12px] text-left flex items-center justify-between transition-all"
              >
                <span>Audit Trail (CSV)</span>
                <span className="material-symbols-outlined text-[16px] text-primary">description</span>
              </button>
              <button
                onClick={() => exportJSON("recovra_audit_trail.json", audits)}
                className="p-3 border border-border bg-surface-secondary/40 hover:border-primary text-text-primary rounded-[12px] text-left flex items-center justify-between transition-all"
              >
                <span>Audit Trail (JSON)</span>
                <span className="material-symbols-outlined text-[16px] text-primary">code</span>
              </button>
              <button
                onClick={() => exportCSV("recovra_recovery_cases.csv", cases)}
                className="p-3 border border-border bg-surface-secondary/40 hover:border-primary text-text-primary rounded-[12px] text-left flex items-center justify-between transition-all"
              >
                <span>Recovery Cases (CSV)</span>
                <span className="material-symbols-outlined text-[16px] text-primary">table_chart</span>
              </button>
              <button
                onClick={() => exportJSON("recovra_cases.json", cases)}
                className="p-3 border border-border bg-surface-secondary/40 hover:border-primary text-text-primary rounded-[12px] text-left flex items-center justify-between transition-all"
              >
                <span>Recovery Cases (JSON)</span>
                <span className="material-symbols-outlined text-[16px] text-primary">data_object</span>
              </button>
            </div>
          </div>

          {/* Pending Retry Queue Monitor & Realtime Activity Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Retry Queue Monitor */}
            <div className="lg:col-span-7 glass-panel p-6 rounded-[18px] space-y-4">
              <div className="text-xs font-bold text-text-secondary uppercase border-b border-border pb-3 flex justify-between items-center">
                <span>Pending Retry Queue Monitor</span>
                <span className="text-primary font-bold">{pendingRetries.length} Pending Cases</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="text-text-secondary border-b border-border">
                      <th className="pb-2 uppercase">Case ID</th>
                      <th className="pb-2 uppercase">Status</th>
                      <th className="pb-2 uppercase text-center">Retries</th>
                      <th className="pb-2 uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {pendingRetries.slice(0, 6).map((item) => (
                      <tr key={item.id} className="hover:bg-surface-secondary/40">
                        <td className="py-2.5 text-text-primary font-bold">{item.id?.substring(0, 8)}</td>
                        <td className="py-2.5 text-warning font-bold uppercase text-[10px]">{item.recovery_status}</td>
                        <td className="py-2.5 text-center text-text-secondary">{item.retry_count || 0} / 4</td>
                        <td className="py-2.5 text-right">
                          <Link href={`/recovery/${item.id}`} className="text-primary hover:text-text-primary font-bold text-[10px] uppercase">
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {pendingRetries.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-text-secondary">
                          No pending retries in queue.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notification Center & System Activity Feed */}
            <div className="lg:col-span-5 glass-panel p-6 rounded-[18px] space-y-4">
              <div className="text-xs font-bold text-text-secondary uppercase border-b border-border pb-3 flex justify-between items-center">
                <span>Notification & System Feed</span>
                <span className="material-symbols-outlined text-primary text-[18px]">notifications</span>
              </div>

              <div className="space-y-3 text-[11px] max-h-[320px] overflow-y-auto pr-1">
                {audits.slice(0, 8).map((evt) => (
                  <div key={evt.id} className="border-b border-border/50 pb-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-primary uppercase">{evt.event_type}</span>
                      <span className="text-text-secondary">{new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-text-secondary mt-0.5 leading-relaxed">{evt.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
