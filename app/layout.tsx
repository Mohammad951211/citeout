import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CiteOut – Generate Accurate Citations in Seconds",
  description:
    "Generate accurate citations from DOIs, URLs, PDFs, and Word documents. Supports APA, MLA, Chicago, IEEE, Harvard, and Vancouver.",
  keywords: ["citation generator", "APA", "MLA", "Chicago", "IEEE", "Harvard", "Vancouver", "bibliography"],
  openGraph: {
    title: "CiteOut – Generate Accurate Citations in Seconds",
    description: "Generate accurate citations from DOIs, URLs, PDFs, and Word documents.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-bg text-text-primary antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "14px",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
