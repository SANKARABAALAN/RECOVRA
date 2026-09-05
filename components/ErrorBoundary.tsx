"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("RECOVRA UI Error Boundary Caught Exception:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-8 m-6 border border-error/40 bg-error/10 text-error rounded-[20px] text-center font-mono space-y-4 max-w-xl mx-auto shadow-lg">
          <div className="w-12 h-12 bg-error/20 border border-error/40 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl text-error">warning</span>
          </div>
          <div>
            <h2 className="font-headline text-lg font-bold text-text-primary">System Interface Error</h2>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              An unexpected component error occurred while rendering the UI canvas.
            </p>
          </div>
          <div className="p-3 bg-bg/70 border border-border text-[10px] text-error font-mono text-left rounded-[12px] overflow-x-auto">
            {this.state.error?.message || "Unknown rendering exception"}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-error text-white font-mono text-xs uppercase font-bold px-5 py-2.5 rounded-[12px] hover:brightness-110 transition-all border-none"
          >
            Reload Interface
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
