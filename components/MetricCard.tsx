"use client";

import React from "react";
import { useDesignSystem } from "@/src/context/DesignContext";

interface MetricCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: string;
  iconColorClass?: string;
  trend?: {
    value: string;
    isUp: boolean;
    isGood: boolean;
  };
  progressBarWidth?: string;
}

export default function MetricCard({
  title,
  value,
  subtext,
  icon,
  iconColorClass = "text-primary",
  trend,
  progressBarWidth,
}: MetricCardProps) {
  const { designMode } = useDesignSystem();
  const isPremium = designMode === "premium";

  return (
    <div
      className={`glass-panel p-5 relative overflow-hidden group transition-all flex flex-col justify-between ${
        isPremium
          ? "rounded-[16px] shadow-md hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 border-t-2 border-t-primary/60"
          : "header-bar rounded-none hover:border-primary"
      }`}
    >
      <div>
        <div className="text-text-secondary font-mono text-[11px] uppercase tracking-wider mb-2 flex items-center justify-between font-semibold">
          <span>{title}</span>
          <div
            className={`w-7 h-7 flex items-center justify-center ${
              isPremium ? "rounded-full bg-surface-secondary/80 border border-border/50" : ""
            }`}
          >
            <span className={`material-symbols-outlined text-[16px] ${iconColorClass}`}>
              {icon}
            </span>
          </div>
        </div>
        <div className="font-headline text-[30px] text-text-primary font-bold mt-1 tracking-tight slide-up-fade-in">
          {value}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs font-mono text-text-secondary">
        {progressBarWidth ? (
          <div className={`w-full bg-surface-secondary h-1.5 relative border border-border ${isPremium ? "rounded-full overflow-hidden" : ""}`}>
            <div
              className={`absolute left-0 top-0 h-full bg-success transition-all duration-500 ${isPremium ? "rounded-full" : ""}`}
              style={{ width: progressBarWidth }}
            />
          </div>
        ) : trend ? (
          <span className="flex items-center gap-1 font-mono">
            <span
              className={`flex items-center font-bold ${
                trend.isGood ? "text-success" : "text-error"
              }`}
            >
              <span className="material-symbols-outlined text-[12px]">
                {trend.isUp ? "trending_up" : "trending_down"}
              </span>
              {trend.value}
            </span>
            {subtext}
          </span>
        ) : (
          <span className="text-[11px] leading-tight">{subtext}</span>
        )}
      </div>
    </div>
  );
}
