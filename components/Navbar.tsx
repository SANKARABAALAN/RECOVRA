"use client";

import React from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full h-16 border-b border-border bg-bg/85 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-container-max mx-auto h-full px-6 md:px-margin-page flex justify-between items-center">
        {/* Logo and Brand Name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-primary flex items-center justify-center text-white font-bold rounded-[10px] shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
            <span className="material-symbols-outlined text-[18px]">all_inclusive</span>
          </div>
          <span className="font-headline text-xl font-bold text-text-primary tracking-tight">
            RECOVRA
          </span>
        </Link>

        {/* Links (Hidden on Mobile) */}
        <div className="hidden md:flex gap-8 font-mono text-xs tracking-wider uppercase text-text-secondary font-medium items-center">
          <Link href="/" className="flex items-center gap-1.5 hover:text-primary transition-colors duration-200 text-text-primary font-bold">
            <span className="material-symbols-outlined text-[16px]">home</span>
            Home
          </Link>
          <a href="#product" className="hover:text-primary transition-colors duration-200">
            Product
          </a>
          <a href="#workflow" className="hover:text-primary transition-colors duration-200">
            Workflow
          </a>
          <a href="#negotiator-preview" className="hover:text-primary transition-colors duration-200">
            Intelligence
          </a>
          <a href="#safety" className="hover:text-primary transition-colors duration-200">
            Safety
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="hidden sm:inline-block border border-border text-text-primary hover:border-primary hover:text-primary transition-all font-mono text-xs uppercase px-4 py-2 rounded-[14px]"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="bg-primary text-white hover:brightness-110 transition-all font-mono text-xs font-bold uppercase px-4 py-2 shadow-md shadow-primary/20 rounded-[14px]"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}
