import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./responsive.css";
import "./scanner.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata: Metadata = {
  title: "Slabberjaws — Graded Card Collection",
  description:
    "Keep professionally graded cards organized in one searchable collection.",
  manifest: "./manifest.webmanifest",
  icons: {
    icon: [
      { url: "./icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "./icons/icon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      {
        url: "./icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    title: "Slabberjaws",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
