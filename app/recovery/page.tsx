"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import UserAccountMenu from "@/components/UserAccountMenu";
import SkeletonLoader from "@/components/SkeletonLoader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDesignSystem } from "@/src/context/DesignContext";

export default function RecoveryCases() {
  const router = useRouter();
  const { isSidebarCollapsed } = useDesignSystem();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("LAST_30D");
  const [sortFilter, setSortFilter] = useState("CONFIDENCE");

  const [allCases, setAllCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCases() {
      try {
        const res = await fetch("/api/recovery");
        if (!res.ok) throw new Error("Failed to load recovery cases");
        const data = await res.json();

        const mapped = data.map((c: any) => {
          const amtVal = c.payments ? Number(c.payments.amount) : 0;
          const initialsVal = c.payments?.payment_method ? c.payments.payment_method.substring(0, 2).toUpperCase() : "PM";

          return {
            id: c.id,
            customer: c.payments?.order_id || "Order Payment",
            initials: initialsVal,
            rawAmount: amtVal,
            amount: new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(amtVal),
            method: c.payments?.payment_method || "UPI",
            failure: c.failure_reason || c.payments?.failure_reason || "Declined",
            rawConfidence: c.confidence_score ? Number(c.confidence_score) : 0,
            confidence: c.confidence_score ? `${Math.round(c.confidence_score)}%` : "Pending",
            status: c.recovery_status || "Detected",
            createdAt: new Date(c.created_at || Date.now()).getTime(),
            updated: new Date(c.updated_at || c.created_at || Date.now()).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        });

        setAllCases(mapped);
      } catch (err: any) {
        setError(err.message || "An error occurred fetching cases");
      } finally {
        setLoading(false);
      }
    }

    fetchCases();
  }, []);

  // Filter and Sort Logic
  const filteredCases = allCases
    .filter((item) => {
      const matchesSearch =
        item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.failure.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (statusFilter !== "ALL") {
        matchesStatus = item.status.toUpperCase() === statusFilter.toUpperCase();
      }

      let matchesDate = true;
      const now = Date.now();
      if (dateFilter === "LAST_7D") {
        matchesDate = now - item.createdAt <= 7 * 24 * 60 * 60 * 1000;
      } else if (dateFilter === "LAST_30D") {
        matchesDate = now - item.createdAt <= 30 * 24 * 60 * 60 * 1000;
      }

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      if (sortFilter === "CONFIDENCE") {
        return b.rawConfidence - a.rawConfidence;
      }
      if (sortFilter === "AMOUNT") {
        return b.rawAmount - a.rawAmount;
      }
      if (sortFilter === "DATE") {
        return b.createdAt - a.createdAt;
      }
      return 0;
    });

  const mainMarginClass = isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]";

  const cycleStatusFilter = () => {
    const statuses = ["ALL", "DETECTED", "NEGOTIATING", "ACTION SELECTED", "RECOVERED", "FAILED"];
    const currIndex = statuses.indexOf(statusFilter);
    const nextIndex = (currIndex + 1) % statuses.length;
    setStatusFilter(statuses[nextIndex]);
  };

  const cycleDateFilter = () => {
    const dates = ["LAST_30D", "LAST_7D", "ALL_TIME"];
    const currIndex = dates.indexOf(dateFilter);
    const nextIndex = (currIndex + 1) % dates.length;
    setDateFilter(dates[nextIndex]);
  };

  const cycleSortFilter = () => {
    const sorts = ["CONFIDENCE", "AMOUNT", "DATE"];
    const currIndex = sorts.indexOf(sortFilter);
    const nextIndex = (currIndex + 1) % sorts.length;
    setSortFilter(sorts[nextIndex]);
  };

  return (
    <div className="flex bg-bg min-h-screen text-text-primary">
      <Sidebar />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
        {/* Top App Bar */}
        <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-headline text-xl font-bold tracking-tight text-text-primary">Recovery Cases</h1>
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
        <main className="flex-1 p-6 md:p-margin-page max-w-container-max mx-auto w-full space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Search */}
            <div className="flex-1 w-full max-w-md relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-[18px]">
                search
              </span>
              <input
                className="w-full bg-surface border border-border text-text-primary font-mono text-xs py-2.5 pl-10 pr-3 focus:outline-none focus:border-primary placeholder:text-text-secondary/70 transition-all rounded-[14px] shadow-sm focus:ring-2 focus:ring-primary/20"
                placeholder="Search case ID, customer or failure reason..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Interactive Filter buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <button
                onClick={cycleStatusFilter}
                className="whitespace-nowrap flex items-center gap-2 px-3.5 py-2 bg-surface border border-border font-mono text-[10px] uppercase text-text-secondary hover:border-primary hover:text-text-primary transition-all rounded-[14px] shadow-sm"
                title="Click to cycle status filter"
              >
                <span className="material-symbols-outlined text-[14px]">filter_list</span>
                Status: <span className="text-primary font-bold">{statusFilter}</span>
              </button>
              <button
                onClick={cycleDateFilter}
                className="whitespace-nowrap flex items-center gap-2 px-3.5 py-2 bg-surface border border-border font-mono text-[10px] uppercase text-text-secondary hover:border-primary hover:text-text-primary transition-all rounded-[14px] shadow-sm"
                title="Click to cycle date filter"
              >
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                Date: <span className="text-primary font-bold">{dateFilter.replace("_", " ")}</span>
              </button>
              <button
                onClick={cycleSortFilter}
                className="whitespace-nowrap flex items-center gap-2 px-3.5 py-2 bg-surface border border-border font-mono text-[10px] uppercase text-text-secondary hover:border-primary hover:text-text-primary transition-all rounded-[14px] shadow-sm"
                title="Click to cycle sort field"
              >
                <span className="material-symbols-outlined text-[14px]">sort</span>
                Sort: <span className="text-primary font-bold">{sortFilter}</span>
              </button>
            </div>
          </div>

          {/* Cases Data Table Container */}
          {loading ? (
            <SkeletonLoader type="table" count={6} />
          ) : error ? (
            <div className="p-8 text-center text-error border border-error/30 bg-error/10 rounded-[18px] font-mono text-xs">
              ERROR RETRIEVING RECOVRA QUEUE: {error}
            </div>
          ) : filteredCases.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No Matching Recovery Cases"
              description="No recovery cases match your search query or filter selection. Try clearing filters or search terms."
              actionText="Reset Filters"
              onAction={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setDateFilter("LAST_30D");
              }}
            />
          ) : (
            <div className="glass-panel overflow-x-auto w-full rounded-[18px] border border-border shadow-lg overflow-hidden">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-surface-secondary/60 font-mono text-[11px] uppercase tracking-wider text-text-secondary border-b border-border">
                  <tr>
                    <th className="p-4 font-bold">Customer</th>
                    <th className="p-4 font-bold">Case ID</th>
                    <th className="p-4 font-bold text-right">Amount</th>
                    <th className="p-4 font-bold">Payment Method</th>
                    <th className="p-4 font-bold">Failure Cause</th>
                    <th className="p-4 font-bold text-center">AI Confidence</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Last Action</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs divide-y divide-border/50">
                  {filteredCases.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/recovery/${row.id}`)}
                      className="hover:bg-surface-secondary/50 transition-colors group cursor-pointer"
                    >
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-surface-secondary border border-border flex items-center justify-center text-[10px] text-text-primary font-bold rounded-full shadow-inner">
                            {row.initials}
                          </div>
                          <span className="text-text-primary group-hover:text-primary transition-colors font-bold underline decoration-primary/40 underline-offset-4">
                            {row.customer}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap text-text-secondary font-bold hover:text-primary transition-colors">
                        {row.id?.substring(0, 8)}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap text-text-primary font-bold">{row.amount}</td>
                      <td className="p-4 whitespace-nowrap text-text-secondary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">
                          {row.method.toLowerCase().includes("card")
                            ? "credit_card"
                            : row.method.toLowerCase().includes("bank")
                            ? "account_balance"
                            : "account_balance_wallet"}
                        </span>
                        {row.method}
                      </td>
                      <td className="p-4 whitespace-nowrap text-error font-sans text-xs">{row.failure}</td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/30 font-bold text-[10px] rounded-full">
                          {row.confidence}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="p-4 text-right whitespace-nowrap text-text-secondary">
                        <div className="flex items-center justify-end gap-3">
                          <span>{row.updated}</span>
                          <span className="text-primary hover:text-text-primary transition-colors">
                            <span className="material-symbols-outlined block text-[16px]">open_in_new</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="border-t border-border p-4 flex justify-between items-center bg-surface-secondary/30 font-mono">
                <span className="text-[10px] text-text-secondary uppercase">
                  Showing {filteredCases.length} of {allCases.length} cases
                </span>
                <div className="flex gap-1.5">
                  <button className="w-8 h-8 flex items-center justify-center border border-border text-text-secondary hover:border-primary hover:text-primary transition-colors rounded-[8px]">
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center border border-primary bg-primary text-white font-bold rounded-[8px] shadow-sm">
                    1
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center border border-border text-text-secondary hover:border-primary hover:text-primary transition-colors rounded-[8px]">
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

