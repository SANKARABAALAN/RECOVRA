"use client";

import React from "react";

interface EmptyStateProps {
  icon?: string;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon = "inbox",
  title = "No Records Found",
  description = "No matching items were found in the database. Try adjusting your search filters or generate demo data.",
  actionText,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`glass-panel p-8 md:p-12 text-center rounded-[22px] border border-border flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}>
      <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 border border-primary/20 shadow-md">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <h3 className="font-headline font-bold text-lg text-text-primary mb-2">{title}</h3>
      <p className="font-mono text-xs text-text-secondary max-w-md leading-relaxed mb-6">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="bg-primary text-white font-mono text-xs font-bold uppercase px-5 py-2.5 rounded-[14px] shadow-md shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
}
