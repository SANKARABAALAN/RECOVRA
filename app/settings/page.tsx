"use client";

import React, { useState, useEffect, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import UserAccountMenu from "@/components/UserAccountMenu";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDesignSystem } from "@/src/context/DesignContext";

function SettingsForm() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { isSidebarCollapsed } = useDesignSystem();

  // Profile Settings
  const [merchantName, setMerchantName] = useState("Acme Merchant Inc.");
  const [operatorName, setOperatorName] = useState("Acme Operator");
  const [operatorEmail, setOperatorEmail] = useState("operator@acme.sys");
  const [role, setRole] = useState("Master Recovery Administrator");

  // Gateway Settings
  const [apiKey, setApiKey] = useState("rzp_test_9zKdf91JkS2x1");
  const [webhookSecret, setWebhookSecret] = useState("whsec_recovra_live_9921a");
  const [environment, setEnvironment] = useState("sandbox");

  // Safety & AI Policy Settings
  const [maxRetries, setMaxRetries] = useState(4);
  const [amountThreshold, setAmountThreshold] = useState(500000);
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [cooldownMinutes, setCooldownMinutes] = useState(5);

  // Notification Settings
  const [alertsEmail, setAlertsEmail] = useState("alerts@acmeretail.com");
  const [slackWebhook, setSlackWebhook] = useState("https://hooks.slack.com/services/T00/B00/X00");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const tabs = [
    { id: "profile", label: "Account & Profile", icon: "manage_accounts" },
    { id: "gateway", label: "Gateway & API Keys", icon: "vpn_key" },
    { id: "safety", label: "AI Safety Guardrails", icon: "gavel" },
    { id: "notifications", label: "Alerts & Notifications", icon: "notifications" },
    { id: "billing", label: "Billing & Subscriptions", icon: "credit_card" },
  ];

  const mainMarginClass = isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`[RECOVRA System] Settings for category '${activeTab.toUpperCase()}' successfully updated!`);
  };

  return (
    <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
      {/* Top App Bar */}
      <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="font-headline text-xl font-bold tracking-tight text-text-primary">Settings</h1>
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
        {/* Sub-Criteria Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-3 font-mono text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] font-bold transition-all whitespace-nowrap border ${
                activeTab === tab.id
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                  : "bg-surface border-border text-text-secondary hover:border-primary/40 hover:text-text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
          {/* TAB 1: Profile & Account Settings */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <section className="glass-panel p-6 space-y-5 rounded-[18px]">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3">
                  Merchant & Account Profile Details
                </div>

                <div className="flex items-center gap-4 border-b border-border/50 pb-5">
                  <div className="w-16 h-16 rounded-full bg-primary text-white font-mono text-xl font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                    AM
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-lg text-text-primary">{merchantName}</h3>
                    <p className="font-mono text-xs text-text-secondary">{operatorEmail}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 text-[9px] font-bold uppercase bg-success/20 text-success border border-success/30 rounded-full">
                      {role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Merchant Organization Name</label>
                    <input
                      type="text"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Primary Operator Name</label>
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Operator Email Address</label>
                    <input
                      type="email"
                      value={operatorEmail}
                      onChange={(e) => setOperatorEmail(e.target.value)}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Access Role & Permissions</label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: Gateway & API Keys */}
          {activeTab === "gateway" && (
            <div className="space-y-6">
              <section className="glass-panel p-6 space-y-5 rounded-[18px]">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3">
                  Razorpay Gateway Credentials & Routing
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Razorpay Key ID</label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Razorpay Webhook Signature Secret</label>
                    <input
                      type="password"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Environment Routing</label>
                    <select
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value)}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    >
                      <option value="sandbox">Razorpay Sandbox Test Mode</option>
                      <option value="production">Razorpay Production Live Mode</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: AI Safety Guardrails */}
          {activeTab === "safety" && (
            <div className="space-y-6">
              <section className="glass-panel p-6 space-y-5 rounded-[18px]">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3">
                  Safety Policy Engine & AI Negotiator Limits
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Maximum Retry Count Limit</label>
                    <input
                      type="number"
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(Number(e.target.value))}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                    <span className="text-[9px] text-text-secondary mt-1 block">Max retries allowed before case halts</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Min Cooldown Delay (Minutes)</label>
                    <input
                      type="number"
                      value={cooldownMinutes}
                      onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                    <span className="text-[9px] text-text-secondary mt-1 block">Minimum time between automated retry attempts</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">AI Decision Confidence Threshold (%)</label>
                    <input
                      type="number"
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                    <span className="text-[9px] text-text-secondary mt-1 block">Require human review if AI confidence is below this level</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Auto Recovery Amount Limit (₹)</label>
                    <input
                      type="number"
                      value={amountThreshold}
                      onChange={(e) => setAmountThreshold(Number(e.target.value))}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                    <span className="text-[9px] text-text-secondary mt-1 block">Amounts above this limit trigger manual approval</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: Alerts & Notifications */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <section className="glass-panel p-6 space-y-5 rounded-[18px]">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3">
                  Alert Channels & Notification Webhooks
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Exception Alerts Email</label>
                    <input
                      type="email"
                      value={alertsEmail}
                      onChange={(e) => setAlertsEmail(e.target.value)}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-secondary uppercase block mb-1">Slack Incident Webhook URL</label>
                    <input
                      type="url"
                      value={slackWebhook}
                      onChange={(e) => setSlackWebhook(e.target.value)}
                      className="w-full bg-surface-secondary border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 5: Billing & Subscriptions */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <section className="glass-panel p-6 space-y-5 rounded-[18px]">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3">
                  Active Subscription Plan & Performance Fees
                </div>

                <div className="border border-primary/30 bg-primary/10 p-4 rounded-[14px] flex justify-between items-center font-mono">
                  <div>
                    <div className="text-xs font-bold text-primary uppercase">Current Active Plan</div>
                    <div className="text-lg font-bold text-text-primary mt-1">RECOVRA Enterprise Recovery Engine</div>
                    <p className="text-[10px] text-text-secondary mt-1">Includes AI Negotiator, Policy Gate & Razorpay Gateway Sync</p>
                  </div>
                  <span className="px-3 py-1 bg-success text-white font-bold text-[10px] uppercase rounded-full">
                    ACTIVE STATUS
                  </span>
                </div>
              </section>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end font-mono text-xs pt-4">
            <button
              type="submit"
              className="bg-primary text-white font-bold uppercase py-3 px-6 rounded-[14px] shadow-md shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save {activeTab.toUpperCase()} Configurations
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function Settings() {
  return (
    <div className="flex bg-bg min-h-screen text-text-primary">
      <Sidebar />
      <Suspense fallback={<div className="p-8 text-center font-mono text-xs text-text-secondary">LOADING SETTINGS...</div>}>
        <SettingsForm />
      </Suspense>
    </div>
  );
}
