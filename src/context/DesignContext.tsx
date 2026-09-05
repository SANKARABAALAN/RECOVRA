"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type DesignMode = "premium";

interface DesignContextType {
  designMode: DesignMode;
  setDesignMode: (mode: DesignMode) => void;
  toggleDesignMode: () => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const DesignContext = createContext<DesignContextType>({
  designMode: "premium",
  setDesignMode: () => {},
  toggleDesignMode: () => {},
  isSidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  toggleSidebar: () => {},
});

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [designMode] = useState<DesignMode>("premium");
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedSidebar = localStorage.getItem("recovra_sidebar_collapsed");
    if (savedSidebar === "true") {
      setIsSidebarCollapsedState(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("recovra_design_mode", "premium");
    localStorage.setItem("recovra_sidebar_collapsed", String(isSidebarCollapsed));

    const root = document.documentElement;
    root.classList.add("design-premium");
    root.classList.remove("design-classic");
  }, [isSidebarCollapsed, mounted]);

  const setDesignMode = () => {};

  const toggleDesignMode = () => {};

  const setSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsedState(collapsed);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsedState((prev) => !prev);
  };

  return (
    <DesignContext.Provider
      value={{
        designMode,
        setDesignMode,
        toggleDesignMode,
        isSidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
      }}
    >
      {children}
    </DesignContext.Provider>
  );
}

export function useDesignSystem() {
  return useContext(DesignContext);
}

