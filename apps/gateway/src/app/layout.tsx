import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LayAI Platform Gateway",
  description: "Access portal for LayAI educational platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}