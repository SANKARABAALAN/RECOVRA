import type { Metadata } from "next";
import { Sora, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import { DesignProvider } from "@/src/context/DesignContext";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "RECOVRA - Intelligent Payment Revenue Recovery",
  description: "AI-Powered Revenue Recovery Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark design-premium">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storedTheme = localStorage.getItem('theme');
                  if (storedTheme === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  }
                  document.documentElement.classList.add('design-premium');
                  document.documentElement.classList.remove('design-classic');
                  localStorage.setItem('recovra_design_mode', 'premium');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${sora.variable} ${jetbrainsMono.variable} ${inter.variable} font-sans antialiased min-h-screen relative selection:bg-primary/20 selection:text-text-primary`}>
        <DesignProvider>{children}</DesignProvider>
      </body>
    </html>
  );
}
