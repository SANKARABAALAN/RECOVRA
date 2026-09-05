"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import UserAccountMenu from "@/components/UserAccountMenu";
import Link from "next/link";
import { useDesignSystem } from "@/src/context/DesignContext";

export default function Negotiator() {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [caseContext, setCaseContext] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [stateMetrics, setStateMetrics] = useState<any>({
    intent: "UNKNOWN",
    sentiment: "Neutral",
    confidence: 100,
    recommended_action: "EVALUATING",
    status: "Detected",
    stage: "DETECTED",
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isSidebarCollapsed } = useDesignSystem();

  // 1. Load active recovery cases queue
  async function loadCases() {
    try {
      const res = await fetch("/api/recovery", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load recovery cases queue.");
      const data = await res.json();
      setCases(data);

      if (data && data.length > 0) {
        setSelectedCaseId(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, []);

  // 2. Load selected case state parameters
  async function loadCaseData() {
    if (!selectedCaseId) return;
    setLoading(true);
    try {
      const [detailsRes, historyRes, stateRes, timelineRes] = await Promise.all([
        fetch(`/api/recovery/${selectedCaseId}`, { cache: "no-store" }),
        fetch(`/api/negotiator/${selectedCaseId}/history`, { cache: "no-store" }),
        fetch(`/api/negotiator/${selectedCaseId}/state`, { cache: "no-store" }),
        fetch(`/api/recovery/${selectedCaseId}/timeline`, { cache: "no-store" }),
      ]);

      if (!detailsRes.ok || !historyRes.ok || !stateRes.ok || !timelineRes.ok) {
        throw new Error("Failed to load active negotiator session parameters.");
      }

      const detailsData = await detailsRes.json();
      const historyData = await historyRes.json();
      const stateData = await stateRes.json();
      const timelineData = await timelineRes.json();

      setCaseContext(detailsData);
      setMessages(
        historyData.map((h: any) => ({
          sender: h.role === "customer" ? "customer" : "ai",
          text: h.message,
          time: new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }))
      );
      setStateMetrics(stateData);
      setTimeline(timelineData);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load case data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCaseData();
  }, [selectedCaseId]);

  // 3. Handle sending new dialogue response
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedCaseId || typing) return;

    const userText = inputText;
    setInputText("");

    const userMsg = {
      sender: "customer",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    try {
      const res = await fetch("/api/negotiator/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selectedCaseId, customerMessage: userText }),
      });

      if (!res.ok) {
        throw new Error("Negotiator failed to generate dialogue response.");
      }

      const result = await res.json();

      const aiMsg = {
        sender: "ai",
        text: result.reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Reload state parameters and timeline dynamically
      const [stateRes, timelineRes] = await Promise.all([
        fetch(`/api/negotiator/${selectedCaseId}/state`, { cache: "no-store" }),
        fetch(`/api/recovery/${selectedCaseId}/timeline`, { cache: "no-store" }),
      ]);

      if (stateRes.ok && timelineRes.ok) {
        const stateData = await stateRes.json();
        const timelineData = await timelineRes.json();
        setStateMetrics(stateData);
        setTimeline(timelineData);
      }
    } catch (err: any) {
      alert("Negotiation Error: " + err.message);
    } finally {
      setTyping(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Classify intent badge colors
  const getIntentColor = (intent: string) => {
    if (intent === "WILL_PAY_NOW" || intent === "PROMISE_TO_PAY" || intent === "WANTS_NEW_PAYMENT_LINK")
      return "bg-success/15 text-success border-success/30";
    if (intent === "NEEDS_MORE_TIME") return "bg-primary/15 text-primary border-primary/30";
    if (intent === "CUSTOMER_CANCELLED" || intent === "DISPUTES_PAYMENT")
      return "bg-error/15 text-error border-error/30";
    return "bg-warning/15 text-warning border-warning/30";
  };

  const mainMarginClass = isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]";

  return (
    <div className="flex bg-bg min-h-screen text-text-primary">
      <Sidebar />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
        {/* Top App Bar */}
        <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-headline text-xl font-bold tracking-tight text-text-primary">AI Negotiator</h1>
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
          {/* Case Selector Dropdown */}
          <div className="border border-border bg-surface-secondary/40 p-4 font-mono text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-[16px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-primary animate-pulse rounded-full"></span>
              <span>SELECT ACTIVE RECOVERY CONVERSATION SESSION:</span>
            </div>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="bg-surface border border-border text-text-primary px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-primary max-w-md w-full sm:w-auto rounded-[12px]"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.payments?.order_id || "Order Payment"} // {c.id?.substring(0, 8)} (INR {c.payments?.amount})
                </option>
              ))}
              {cases.length === 0 && <option value="">No open cases in recovery queue</option>}
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-text-secondary animate-pulse font-mono text-xs border border-dashed border-border">
              LOADING RECOVERY CONTEXT AND DIALOGUE MEMORY...
            </div>
          ) : error || !caseContext ? (
            <div className="p-8 text-center text-error font-mono text-xs border border-dashed border-error/30 space-y-4 max-w-md mx-auto rounded-[18px]">
              <p className="font-bold">ERROR: {error || "No active case selected."}</p>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                This session may have been deleted during the database re-seed. Please refresh the browser window to load the latest active cases list.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-error text-white font-mono text-xs uppercase px-4 py-2 hover:brightness-110 transition-all border-none rounded-[12px]"
              >
                Refresh Browser
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Context Card */}
              <div className="lg:col-span-3 space-y-4">
                <div className="glass-panel p-6 space-y-5 h-full rounded-[18px]">
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3">
                    Customer Context
                  </div>
                  <div className="space-y-4 font-mono text-xs text-text-secondary">
                    <div>
                      <span className="text-[10px] uppercase text-text-secondary block mb-1">Customer reference</span>
                      <span className="text-text-primary font-bold">{caseContext.payments?.order_id || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-text-secondary block mb-1">Payment gateway ID</span>
                      <span className="text-text-primary">{caseContext.payments?.payment_id || "N/A (Unsettled)"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-text-secondary block mb-1">Outstanding Balance</span>
                      <span className="text-text-primary font-bold">
                        {formatCurrency(Number(caseContext.payments?.amount || 0))}
                      </span>
                    </div>
                    <div className="border-t border-border pt-4">
                      <span className="text-[10px] uppercase text-text-secondary block mb-1">Detected Issue</span>
                      <span className="text-error font-bold block break-all">{caseContext.failure_reason || "Declined"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-text-secondary block mb-1">AI Action Plan</span>
                      <span className="text-text-primary block mt-1 font-bold">{stateMetrics.recommended_action}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column: Chat Log Console */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="glass-panel flex-1 flex flex-col min-h-[450px] rounded-[18px] overflow-hidden">
                  <div className="bg-surface-secondary/60 px-4 py-3 border-b border-border font-mono text-[10px] font-bold text-text-secondary flex justify-between items-center">
                    <span>DIALOGUE STREAM #{selectedCaseId.substring(0, 8)}</span>
                    <span
                      className={`font-bold flex items-center gap-1 uppercase ${
                        stateMetrics.status === "Recovered"
                          ? "text-success"
                          : stateMetrics.status === "Failed"
                          ? "text-error"
                          : "text-warning animate-pulse"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 ${
                          stateMetrics.status === "Recovered"
                            ? "bg-success"
                            : stateMetrics.status === "Failed"
                            ? "bg-error"
                            : "bg-warning animate-pulse"
                        } rounded-full`}
                      ></span>
                      {stateMetrics.status}
                    </span>
                  </div>

                  {/* Messages stream */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs max-h-[350px]">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === "ai" ? "self-end items-end" : "self-start items-start"
                        }`}
                      >
                        <div
                          className={`p-3.5 border transition-all ${
                            msg.sender === "ai"
                              ? "bg-primary/15 border-primary/40 text-text-primary rounded-[16px] rounded-br-sm shadow-sm"
                              : "bg-surface-secondary border-border text-text-primary rounded-[16px] rounded-bl-sm shadow-sm"
                          }`}
                        >
                          <p className="leading-relaxed">
                            &gt; {msg.sender === "ai" ? "RECOVRA" : "Customer"}: {msg.text}
                          </p>
                        </div>
                        <span className="text-[9px] text-text-secondary mt-1 px-1">{msg.time}</span>
                      </div>
                    ))}
                    {typing && (
                      <div className="flex flex-col max-w-[85%] self-end items-end">
                        <div className="p-3 border bg-primary/10 border-primary/30 text-text-primary animate-pulse rounded-[16px]">
                          <p className="leading-relaxed">&gt; RECOVRA: typing response...</p>
                        </div>
                      </div>
                    )}
                    {messages.length === 0 && !typing && (
                      <p className="text-center text-text-secondary py-12">
                        Send a message to initiate automated negotiation.
                      </p>
                    )}
                  </div>

                  {/* Chat input box */}
                  <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2 bg-surface-secondary/40">
                    <input
                      type="text"
                      placeholder="Type simulated customer response..."
                      value={inputText}
                      disabled={typing || stateMetrics.status === "Recovered"}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-1 bg-surface border border-border text-text-primary font-mono text-xs px-3.5 py-2.5 focus:outline-none focus:border-primary placeholder:text-text-secondary/70 disabled:opacity-50 transition-all rounded-[14px] shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={typing || stateMetrics.status === "Recovered"}
                      className="bg-primary text-white font-mono text-xs uppercase px-4 hover:brightness-110 transition-all font-bold disabled:opacity-50 border-none shadow-md shadow-primary/20 rounded-[14px]"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Operational State Panel & Timeline */}
              <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
                {/* State Panel */}
                <div className="glass-panel p-6 space-y-5 rounded-[18px]">
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3">
                    AI Operational State
                  </div>

                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-text-secondary uppercase block mb-1">INTENT</span>
                        <span
                          className={`border px-3 py-1 font-bold text-[10px] uppercase tracking-wide inline-block ${getIntentColor(
                            stateMetrics.intent
                          )} rounded-full`}
                        >
                          {stateMetrics.intent}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-text-secondary uppercase block mb-1">SENTIMENT</span>
                        <span className="font-bold block text-text-primary uppercase">{stateMetrics.sentiment}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-text-secondary uppercase block mb-1">RECOVERY PLAN</span>
                      <span className="text-text-primary font-bold block bg-surface-secondary border border-border p-3 mt-1 rounded-[12px]">
                        {stateMetrics.recommended_action}
                      </span>
                    </div>

                    <div className="border-t border-border pt-4">
                      <span className="text-[10px] text-text-secondary block mb-2 uppercase">Safety Metrics</span>
                      <div className="space-y-1.5 text-[11px] text-text-secondary">
                        <div className="flex justify-between items-center">
                          <span>AI Engine Used</span>
                          <span className="text-success font-bold uppercase">{stateMetrics.ai_engine || "LOCAL_FALLBACK"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>AI Decision Confidence</span>
                          <span className="text-primary font-bold">{stateMetrics.confidence}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Limit Cooldown Guard</span>
                          <span className="text-success font-bold">ACTIVE</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Escalation Trigger Flag</span>
                          <span
                            className={
                              stateMetrics.recommended_action === "HANDOFF_TO_MERCHANT"
                                ? "text-error font-bold"
                                : "text-success font-bold"
                            }
                          >
                            {stateMetrics.recommended_action === "HANDOFF_TO_MERCHANT" ? "TRIGGERED" : "OFF"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Policy Status Section */}
                    <div className="border-t border-border pt-4">
                      <span className="text-[10px] text-text-secondary block mb-2 uppercase">Policy Engine Status</span>
                      <div className="bg-surface-secondary border border-border p-3 space-y-2 rounded-[12px]">
                        <div className="flex justify-between items-center text-[11px]">
                          <span>Verification State</span>
                          <span className={`font-bold ${
                            stateMetrics.policy_status === "POLICY_APPROVED"
                              ? "text-success"
                              : stateMetrics.policy_status === "POLICY_BLOCKED"
                              ? "text-error"
                              : "text-warning animate-pulse"
                          }`}>
                            {stateMetrics.policy_status === "POLICY_APPROVED"
                              ? "APPROVED"
                              : stateMetrics.policy_status === "POLICY_BLOCKED"
                              ? "BLOCKED"
                              : stateMetrics.policy_status === "POLICY_ESCALATED"
                              ? "ESCALATED"
                              : "PENDING"}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary leading-relaxed border-t border-border/40 pt-1 break-all">
                          {stateMetrics.policy_reason || "Waiting for policy check evaluation..."}
                        </p>
                      </div>
                    </div>

                    {/* Promise to Pay Section */}
                    <div className="border-t border-border pt-4">
                      <span className="text-[10px] text-text-secondary block mb-2 uppercase">Promise-To-Pay Tracker</span>
                      {stateMetrics.promise_active ? (
                        <div className="bg-primary/5 border border-primary/20 p-3 space-y-1.5 text-[11px] rounded-[12px]">
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Commit Status</span>
                            <span className="text-success font-bold uppercase">ACTIVE</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Promised Amount</span>
                            <span className="text-text-primary font-bold">INR {stateMetrics.promise_details?.promised_amount || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Expected Pay Date</span>
                            <span className="text-text-primary">
                              {stateMetrics.promise_details?.promised_time
                                ? new Date(stateMetrics.promise_details.promised_time).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-surface-secondary/40 border border-border/60 p-3 text-[10px] text-text-secondary italic text-center rounded-[12px]">
                          No active promise tracker registered.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline Sidebar */}
                <div className="glass-panel p-6 space-y-3 flex-1 overflow-y-auto max-h-[220px] rounded-[18px]">
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-2 mb-2">
                    Timeline History
                  </div>
                  <div className="space-y-3 font-mono text-[10px] text-text-secondary">
                    {timeline.map((event) => (
                      <div key={event.id} className="border-b border-border/40 pb-1.5 last:border-b-0">
                        <div className="flex justify-between font-bold text-text-primary">
                          <span>{event.name}</span>
                          <span className="text-text-secondary">{event.time}</span>
                        </div>
                        <p className="mt-0.5 text-[9px] leading-relaxed text-text-secondary">{event.desc}</p>
                      </div>
                    ))}
                    {timeline.length === 0 && <p className="text-center py-4">No events registered.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
