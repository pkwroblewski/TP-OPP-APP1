import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout";
import { SessionProvider } from "@/components/providers";

export const metadata: Metadata = {
  title: "TP Opportunity Finder",
  description: "Identify transfer pricing opportunities from Luxembourg company annual accounts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider>
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
