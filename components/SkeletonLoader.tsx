"use client";

import React from "react";

interface SkeletonLoaderProps {
  type?: "card" | "table" | "hero" | "chart" | "list";
  count?: number;
  className?: string;
}

export default function SkeletonLoader({ type = "card", count = 1, className = "" }: SkeletonLoaderProps) {
  const items = Array.from({ length: count });

  if (type === "hero") {
    return (
      <div className={`glass-panel p-8 rounded-[28px] animate-pulse space-y-4 ${className}`}>
        <div className="h-4 bg-surface-secondary/70 rounded-full w-1/4"></div>
        <div className="h-10 bg-surface-secondary/70 rounded-xl w-1/2"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="h-16 bg-surface-secondary/60 rounded-[16px]"></div>
          <div className="h-16 bg-surface-secondary/60 rounded-[16px]"></div>
          <div className="h-16 bg-surface-secondary/60 rounded-[16px]"></div>
          <div className="h-16 bg-surface-secondary/60 rounded-[16px]"></div>
        </div>
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className={`glass-panel p-6 rounded-[22px] animate-pulse space-y-3 ${className}`}>
        <div className="h-5 bg-surface-secondary/70 rounded-full w-1/3 mb-4"></div>
        {items.map((_, i) => (
          <div key={i} className="h-12 bg-surface-secondary/50 rounded-[14px] w-full"></div>
        ))}
      </div>
    );
  }

  if (type === "chart") {
    return (
      <div className={`glass-panel p-6 rounded-[22px] animate-pulse flex flex-col justify-between h-[300px] ${className}`}>
        <div className="h-5 bg-surface-secondary/70 rounded-full w-1/4"></div>
        <div className="flex items-end gap-3 h-[200px] pt-4">
          <div className="h-[40%] bg-surface-secondary/60 rounded-t-lg flex-1"></div>
          <div className="h-[75%] bg-surface-secondary/60 rounded-t-lg flex-1"></div>
          <div className="h-[55%] bg-surface-secondary/60 rounded-t-lg flex-1"></div>
          <div className="h-[90%] bg-surface-secondary/60 rounded-t-lg flex-1"></div>
          <div className="h-[65%] bg-surface-secondary/60 rounded-t-lg flex-1"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {items.map((_, i) => (
        <div key={i} className="glass-panel p-6 rounded-[22px] animate-pulse space-y-3">
          <div className="h-4 bg-surface-secondary/70 rounded-full w-1/2"></div>
          <div className="h-8 bg-surface-secondary/70 rounded-xl w-3/4"></div>
          <div className="h-3 bg-surface-secondary/50 rounded-full w-1/3"></div>
        </div>
      ))}
    </div>
  );
}
