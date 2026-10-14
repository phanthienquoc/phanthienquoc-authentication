import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MrCute ID — Secure sign in",
  description: "One secure identity for the MrCute apps ecosystem.",
  applicationName: "MrCute ID",
};
export const viewport: Viewport = {
  themeColor: "#080b12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
