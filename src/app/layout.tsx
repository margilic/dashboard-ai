import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Margilic AI Trading Dashboard",
  description: "AI-analyzed trading performance dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}