import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";
import PWARegister from "@/components/PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expense Tracker | Own Your Money",
  description: "Track your daily spending, monitor category budgets, and build your savings with a sleek dark-themed expense tracker.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Expense Tracker | Own Your Money",
    description: "Track your daily spending, monitor category budgets, and build your savings with a sleek dark-themed expense tracker.",
    type: "website",
    siteName: "Expense Tracker",
  },
  twitter: {
    card: "summary_large_image",
    title: "Expense Tracker | Own Your Money",
    description: "Track your daily spending, monitor category budgets, and build your savings effortlessly.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased dark`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@400,1,0,24&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-[#0D0D0D] text-[#e2e2e2]">
        <AuthProvider>
          <PWARegister />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
