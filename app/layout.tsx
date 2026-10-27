import type { Metadata } from "next";
import { Ubuntu, Ubuntu_Mono } from "next/font/google";
import Script from "next/script";
import { appearanceScript } from "./_components/Appearance";
import { ToastProvider } from "./_components/Toast";
import "./globals.css";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-ubuntu",
});

const ubuntuMono = Ubuntu_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-ubuntu-mono",
});

export const metadata: Metadata = {
  title: "Bondeth Studio",
  description:
    "Turn an idea into a content plan and finished explainer videos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The appearance script sets data-theme before React loads, so the server's HTML differs.
    <html
      lang="en"
      className={`${ubuntu.variable} ${ubuntuMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets light or dark before the page paints, so it never flashes the wrong colors. */}
        <Script id="appearance" strategy="beforeInteractive">
          {appearanceScript}
        </Script>
      </head>
      <body className="min-h-screen font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
