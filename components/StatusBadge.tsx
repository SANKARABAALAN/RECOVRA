"use client";

import React from "react";
import { useDesignSystem } from "@/src/context/DesignContext";

type StatusType =
  | "Detected"
  | "Diagnosing"
  | "Decision"
  | "Recovery Pending"
  | "Negotiating"
  | "Recovered"
  | "Blocked"
  | "Exception"
  | "Awaiting Customer"
  | "Manual Review"
  | string;

interface StatusBadgeProps {
  status: StatusType;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { designMode } = useDesignSystem();

  const getColors = (stat: string) => {
    switch (stat) {
      case "Recovered":
      case "Verified":
      case "APPROVED":
        return {
          bg: "bg-success/15",
          text: "text-success",
          border: "border-success/30",
          pip: "bg-success",
        };
      case "Blocked":
      case "Exception":
      case "Failed":
      case "BLOCKED":
        return {
          bg: "bg-error/15",
          text: "text-error",
          border: "border-error/30",
          pip: "bg-error",
        };
      case "Diagnosing":
      case "Decision":
      case "Recovery Pending":
      case "Negotiating":
      case "Awaiting Customer":
      case "ESCALATED":
        return {
          bg: "bg-warning/15",
          text: "text-warning",
          border: "border-warning/30",
          pip: "bg-warning",
        };
      case "Detected":
      case "Manual Review":
      default:
        return {
          bg: "bg-primary/15",
          text: "text-primary",
          border: "border-primary/30",
          pip: "bg-primary",
        };
    }
  };

  const colors = getColors(status);
  const isPremium = designMode === "premium";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 border ${colors.bg} ${colors.text} ${colors.border} font-mono text-[10px] font-bold uppercase tracking-wider ${
        isPremium ? "rounded-full shadow-sm backdrop-blur-sm" : "rounded-none"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 ${colors.pip} animate-pulse ${isPremium ? "rounded-full" : "rounded-none"}`}
      ></span>
      {status}
    </span>
  );
}
