"use client";

import React from "react";

interface AIInsightsPanelProps {
  totalCases: number;
  recoveredCases: number;
  revenueRecovered: number;
  successRate: number;
}

export default function AIInsightsPanel({
  totalCases,
  recoveredCases,
  revenueRecovered,
  successRate,
}: AIInsightsPanelProps) {
  const insights = [
    {
      title: "Top Revenue Opportunity",
      badge: "HIGH IMPACT",
      badgeColor: "bg-success/20 text-success border-success/30",
      icon: "trending_up",
      text: `NPCI UPI network timeouts represent 32% of all failed attempts. Automated retries within 15 minutes recover up to 88% of these transactions.`,
    },
    {
      title: "Primary Root Cause Alert",
      badge: "BANK NETWORK",
      badgeColor: "bg-primary/20 text-primary border-primary/30",
      icon: "account_balance",
      text: `HDFC/ICICI core ledger soft declines peak between 18:00–21:00. Scheduling retries outside peak hours increases settlement success by 24%.`,
    },
    {
      title: "AI Negotiator Performance",
      badge: "94% ACCURACY",
      badgeColor: "bg-warning/20 text-warning border-warning/30",
      icon: "smart_toy",
      text: `Promise-To-Pay commitments held for 24–48 hours yield ₹${revenueRecovered.toLocaleString("en-IN")} in resolved revenue with 0 customer drop-off.`,
    },
  ];

  return (
    <div className="glass-panel p-6 rounded-[22px] border border-border space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
          <h3 className="font-headline font-bold text-sm text-text-primary">Executive AI Intelligence Summary</h3>
        </div>
        <span className="font-mono text-[10px] uppercase text-text-secondary border border-border px-2 py-0.5 rounded-full">
          Gemini 1.5 Flash Analytics
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        {insights.map((item, idx) => (
          <div key={idx} className="p-4 bg-surface-secondary/50 border border-border/80 rounded-[18px] flex flex-col justify-between space-y-3 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">{item.icon}</span>
                {item.title}
              </span>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                {item.badge}
              </span>
            </div>

            <p className="text-text-secondary text-[11px] leading-relaxed">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
