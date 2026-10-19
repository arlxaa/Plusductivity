import type { Metadata } from "next";
import { Unbounded, Inter } from "next/font/google";
import "./globals.css";

// Display font for headings, body font for everything else.
// next/font downloads them at build time, no <link> needed.
const display = Unbounded({ subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "plusductivity",
  description: "Study more. Switch tabs less. Timer, tasks, files, links + music in one place.",
};

// Runs before first paint so the saved theme applies without a flash.
const themeInit = `(function(){try{if(localStorage.getItem('plusductivity-theme')==='light'){document.documentElement.classList.add('light')}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full app-glow antialiased">{children}</body>
    </html>
  );
}
