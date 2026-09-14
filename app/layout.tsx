import type { Metadata, Viewport } from "next"; import "./globals.css"; import "./responsive.css";
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
export const metadata:Metadata={title:"Slabberjaws — Graded Card Collection",description:"Keep professionally graded cards organized in one searchable collection."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
