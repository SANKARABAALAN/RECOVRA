"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { useDesignSystem } from "@/src/context/DesignContext";
import NewRecoveryModal from "./NewRecoveryModal";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isSidebarCollapsed, toggleSidebar } = useDesignSystem();

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: "dashboard" },
    { name: "Recovery Cases", href: "/recovery", icon: "payments" },
    { name: "Intelligence", href: "/analytics", icon: "psychology" },
    { name: "Negotiator", href: "/negotiator", icon: "handshake" },
    { name: "Audit Trail", href: "/audit", icon: "history_edu" },
    { name: "Exceptions", href: "/exceptions", icon: "report_problem" },
    { name: "Admin Console", href: "/admin", icon: "admin_panel_settings" },
    { name: "Settings", href: "/settings", icon: "settings" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Hamburger Toggle */}
      <div className="md:hidden fixed top-3 left-4 z-50">
        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="p-2 bg-surface border border-border text-text-primary rounded-[12px] shadow-md"
        >
          <span className="material-symbols-outlined block">{isOpenMobile ? "close" : "menu"}</span>
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 border-r border-border bg-surface flex flex-col transition-all duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? "translate-x-0 w-[240px]" : "-translate-x-full"
        } ${isSidebarCollapsed ? "md:w-[72px]" : "md:w-[240px]"}`}
      >
        {/* Brand Logo Header & Collapse Toggle */}
        <div className="h-16 px-4 border-b border-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group overflow-hidden">
            <div className="w-8 h-8 min-w-[32px] bg-primary flex items-center justify-center text-white font-bold rounded-[10px] shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
              <span className="material-symbols-outlined text-[18px]">all_inclusive</span>
            </div>
            {!isSidebarCollapsed && (
              <span className="font-headline text-lg font-bold text-text-primary tracking-tight whitespace-nowrap">
                RECOVRA
              </span>
            )}
          </Link>

          {/* Desktop Sidebar Collapse Button */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-secondary transition-colors"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isSidebarCollapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>

        {/* Merchant Info Card */}
        <div className="p-3 border-b border-border">
          <div
            className={`flex items-center gap-3 bg-surface-secondary/70 p-2.5 border border-border rounded-[14px] transition-all hover:border-primary/40 ${
              isSidebarCollapsed ? "justify-center" : ""
            }`}
            title="Acme Merchant // RAZORPAY TEST MODE"
          >
            <div className="w-8 h-8 min-w-[32px] bg-surface flex items-center justify-center border border-border rounded-[10px]">
              <span className="material-symbols-outlined text-text-primary text-[16px]">storefront</span>
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden">
                <div className="font-mono text-xs font-bold text-text-primary uppercase tracking-wide truncate">
                  Acme Merchant
                </div>
                <div className="text-[9px] font-mono text-text-secondary mt-0.5 truncate">RAZORPAY TEST MODE</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-2 space-y-1.5 font-mono text-xs font-bold tracking-wider uppercase overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 py-2.5 transition-all ${
                  isSidebarCollapsed ? "justify-center px-0 rounded-[12px]" : "px-3.5 rounded-[12px]"
                } ${
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : "text-text-secondary hover:bg-surface-secondary/80 hover:text-text-primary"
                }`}
                onClick={() => setIsOpenMobile(false)}
              >
                <span className="material-symbols-outlined text-[20px] min-w-[20px]">
                  {item.icon}
                </span>
                {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-border flex flex-col gap-2.5 bg-surface-secondary/50">
          <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between px-1"}`}>
            <ThemeToggle />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            title="New Recovery Case"
            className={`w-full bg-primary text-white py-2.5 font-mono text-xs font-bold tracking-wider uppercase hover:brightness-110 transition-all flex items-center justify-center gap-2 rounded-[14px] shadow-md shadow-primary/20 hover:-translate-y-0.5 border-none ${
              isSidebarCollapsed ? "px-0" : "px-3"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {!isSidebarCollapsed && <span>New Recovery</span>}
          </button>
        </div>
      </aside>

      {/* New Recovery Modal */}
      <NewRecoveryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
