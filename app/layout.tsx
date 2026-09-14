import type { Metadata } from "next"; import "./globals.css";
export const metadata:Metadata={title:"SlabVault — Graded Card Collection",description:"Keep professionally graded cards organized in one searchable vault."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
