"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function UserAccountMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {/* Account Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full border border-border bg-surface-secondary/70 hover:border-primary/50 transition-all shadow-sm group focus:outline-none"
        title="Account Profile & Settings"
      >
        {/* Avatar Circle with initials / picture indicator */}
        <div className="w-7 h-7 rounded-full bg-primary text-white font-bold font-mono text-xs flex items-center justify-center shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
          AM
        </div>
        <div className="hidden sm:flex flex-col text-left font-mono">
          <span className="text-[11px] font-bold text-text-primary leading-none group-hover:text-primary transition-colors">
            Acme Merchant
          </span>
          <span className="text-[9px] text-text-secondary leading-tight">Operator</span>
        </div>
        <span className="material-symbols-outlined text-[16px] text-text-secondary group-hover:text-text-primary transition-colors">
          expand_more
        </span>
      </button>

      {/* Pop-Up Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 glass-panel bg-surface border border-border rounded-[18px] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 font-mono text-xs">
          {/* User Header Info */}
          <div className="p-3 border-b border-border/70 bg-surface-secondary/50 rounded-[14px] mb-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center shadow-md shadow-primary/30">
                AM
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-text-primary text-xs truncate">Acme Merchant Inc.</p>
                <p className="text-[10px] text-text-secondary truncate">operator@acme.sys</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[8px] font-bold uppercase bg-success/20 text-success border border-success/30 rounded-full">
                  Verified Operator
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Criteria Navigation Options */}
          <div className="py-1 space-y-0.5">
            <Link
              href="/settings?tab=profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-text-primary hover:bg-primary/10 hover:text-primary rounded-[10px] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
              <span>Account & Profile Settings</span>
            </Link>

            <Link
              href="/settings?tab=gateway"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-text-secondary hover:bg-surface-secondary hover:text-text-primary rounded-[10px] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">vpn_key</span>
              <span>Gateway Integrations</span>
            </Link>

            <Link
              href="/settings?tab=safety"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-text-secondary hover:bg-surface-secondary hover:text-text-primary rounded-[10px] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">gavel</span>
              <span>AI Safety Guardrails</span>
            </Link>

            <Link
              href="/settings?tab=billing"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-text-secondary hover:bg-surface-secondary hover:text-text-primary rounded-[10px] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">credit_card</span>
              <span>Billing & Plan</span>
            </Link>
          </div>

          {/* Sign Out Action */}
          <div className="pt-1 mt-1 border-t border-border/70">
            <Link
              href="/sign-in"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-error hover:bg-error/10 rounded-[10px] transition-colors font-bold"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out Session</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
