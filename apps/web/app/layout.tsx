import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SportsPicks Pro — Expert Sports Predictions",
    template: "%s | SportsPicks Pro",
  },
  description:
    "Data-driven sports picks and predictions powered by real-time odds analysis. Free and premium picks for NFL, NBA, MLB, NHL, and more.",
  keywords: ["sports picks", "sports predictions", "NFL picks", "NBA picks", "sports betting analysis"],
  openGraph: {
    type: "website",
    title: "SportsPicks Pro — Expert Sports Predictions",
    description: "Data-driven sports picks and predictions powered by real-time odds analysis.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
