"use client";

import React from "react";

interface FunnelVisualizerProps {
  detected: number;
  diagnosed: number;
  evaluated: number;
  negotiated: number;
  recovering: number;
  recovered: number;
}

export default function FunnelVisualizer({
  detected,
  diagnosed,
  evaluated,
  negotiated,
  recovering,
  recovered,
}: FunnelVisualizerProps) {
  const steps = [
    { key: "DETECTED", label: "1. Detect", count: detected, icon: "search", color: "border-primary text-primary bg-primary/10" },
    { key: "DIAGNOSING", label: "2. Diagnose", count: diagnosed, icon: "psychology", color: "border-primary text-primary bg-primary/10" },
    { key: "EVALUATING", label: "3. Evaluate", count: evaluated, icon: "balance", color: "border-warning text-warning bg-warning/10" },
    { key: "NEGOTIATING", label: "4. Negotiate", count: negotiated, icon: "handshake", color: "border-warning text-warning bg-warning/10" },
    { key: "RECOVERING", label: "5. Recover", count: recovering, icon: "bolt", color: "border-primary text-primary bg-primary/10" },
    { key: "RECOVERED", label: "6. Verified", count: recovered, icon: "check_circle", color: "border-success text-success bg-success/10" },
  ];

  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <div className="glass-panel p-6 rounded-[22px] border border-border space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">filter_alt</span>
          <h3 className="font-headline font-bold text-sm text-text-primary">Autonomous Recovery Funnel</h3>
        </div>
        <span className="font-mono text-[10px] uppercase text-text-secondary border border-border px-2 py-0.5 rounded-full">
          Live Stage Conversion
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        {steps.map((step, idx) => {
          const widthPct = Math.max(Math.round((step.count / maxCount) * 100), 12);
          return (
            <div key={step.key} className="p-3.5 bg-surface-secondary/50 border border-border/80 rounded-[18px] flex flex-col justify-between space-y-3 relative group hover:border-primary/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-text-secondary uppercase truncate">{step.label}</span>
                <span className={`material-symbols-outlined text-[18px] ${step.color.split(" ")[1]}`}>{step.icon}</span>
              </div>

              <div>
                <div className="font-headline text-lg font-bold text-text-primary">{step.count}</div>
                <div className="text-[9px] text-text-secondary mt-0.5">cases in stage</div>
              </div>

              {/* Glowing progress bar indicator */}
              <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    idx === steps.length - 1 ? "bg-success" : "bg-primary"
                  }`}
                  style={{ width: `${widthPct}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
