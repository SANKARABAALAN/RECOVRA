"use client";

import React from "react";
import CountUpNumber from "./CountUpNumber";

interface HeroRevenueBannerProps {
  revenueAtRisk: number;
  revenueRecovered: number;
  activeCasesCount: number;
  totalCasesCount: number;
  successRate: number;
  aiConfidence: number;
  onSeedDemo?: () => void;
  onStartLiveDemo?: () => void;
}

export default function HeroRevenueBanner({
  revenueAtRisk,
  revenueRecovered,
  activeCasesCount,
  totalCasesCount,
  successRate,
  aiConfidence = 94,
  onSeedDemo,
  onStartLiveDemo,
}: HeroRevenueBannerProps) {
  return (
    <div className="glass-panel p-6 md:p-8 rounded-[28px] relative overflow-hidden border border-border shadow-2xl bg-gradient-to-r from-surface via-surface-secondary/40 to-surface">
      {/* Glow background accent */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-success/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Title & Status Badges */}
        <div className="space-y-3 max-w-xl">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/40 font-mono text-[10px] font-bold uppercase rounded-full tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Razorpay AI Recovery Engine // Active
            </span>
            <span className="px-2.5 py-1 bg-success/20 text-success border border-success/30 font-mono text-[10px] font-bold uppercase rounded-full">
              AI Confidence {aiConfidence}%
            </span>
          </div>

          <h2 className="font-headline text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            Autonomous Payment Revenue Optimization
          </h2>

          <p className="font-mono text-xs text-text-secondary leading-relaxed">
            Real-time gateway failure detection, safety policy validation, and AI conversational negotiation routing failed transactions back to settlement.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {onStartLiveDemo && (
              <button
                onClick={onStartLiveDemo}
                className="bg-primary text-white font-mono text-xs font-bold uppercase px-5 py-3 rounded-[16px] shadow-lg shadow-primary/30 hover:brightness-110 transition-all flex items-center gap-2 border-none hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
                <span>Start RECOVRA Live Demo</span>
              </button>
            )}

            {onSeedDemo && (
              <button
                onClick={onSeedDemo}
                className="bg-surface-secondary border border-border text-text-primary hover:border-primary font-mono text-xs uppercase px-4 py-3 rounded-[16px] transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">database</span>
                <span>Seed 100 Demo Records</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Executive Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 w-full lg:w-auto font-mono">
          <div className="p-4 bg-surface-secondary/70 border border-border/80 rounded-[20px] backdrop-blur-md">
            <div className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Revenue Recovered</div>
            <div className="font-headline text-xl md:text-2xl font-bold mt-1 text-success flex items-center">
              ₹<CountUpNumber end={revenueRecovered} />
            </div>
            <div className="text-[9px] text-text-secondary mt-0.5">Verified settlements</div>
          </div>

          <div className="p-4 bg-surface-secondary/70 border border-border/80 rounded-[20px] backdrop-blur-md">
            <div className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Revenue at Risk</div>
            <div className="font-headline text-xl md:text-2xl font-bold mt-1 text-text-primary flex items-center">
              ₹<CountUpNumber end={revenueAtRisk} />
            </div>
            <div className="text-[9px] text-text-secondary mt-0.5">Failed transactions</div>
          </div>

          <div className="p-4 bg-surface-secondary/70 border border-border/80 rounded-[20px] backdrop-blur-md">
            <div className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Recovery Success</div>
            <div className="font-headline text-xl md:text-2xl font-bold mt-1 text-primary flex items-center">
              <CountUpNumber end={successRate} decimals={1} suffix="%" />
            </div>
            <div className="text-[9px] text-text-secondary mt-0.5">Resolution efficiency</div>
          </div>

          <div className="p-4 bg-surface-secondary/70 border border-border/80 rounded-[20px] backdrop-blur-md">
            <div className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Active Queue</div>
            <div className="font-headline text-xl md:text-2xl font-bold mt-1 text-warning flex items-center">
              <CountUpNumber end={activeCasesCount} />
              <span className="text-xs text-text-secondary ml-1 font-normal">/ {totalCasesCount}</span>
            </div>
            <div className="text-[9px] text-text-secondary mt-0.5">In recovery pipeline</div>
          </div>
        </div>
      </div>
    </div>
  );
}
