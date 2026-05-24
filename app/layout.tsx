import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Ostrich — Your knowledge, finally connected",
  description:
    "Ostrich is the AI workspace that understands where you are — not just what you wrote. Scoped retrieval. Zero hallucination noise.",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/logo.svg" }],
    apple: [{ url: "/logo.svg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <Navbar />
          {/* NOTE: The Navbar renders h-12 on dashboard, h-16 on landing. 
              Dashboard layout handles its own height calculation. 
              Landing pages use pt-16 via their own padding. */}
          <div className="flex-1 flex flex-col">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
