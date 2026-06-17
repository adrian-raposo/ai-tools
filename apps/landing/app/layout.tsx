import type { Metadata } from "next";
import Script from "next/script";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Adrian Raposo — Technical Documentation Leader",
  description:
    "Technical Documentation Leader with 12+ years in enterprise SaaS. Leading teams, building AI tools, and making documentation work.",
  openGraph: {
    title: "Adrian Raposo — Technical Documentation Leader",
    description:
      "12+ years building documentation practices in enterprise SaaS. Currently leading a team at Gainsight while building AI tools to automate documentation workflows.",
    url: "https://adrian-raposo.vercel.app",
    siteName: "Adrian Raposo",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${dmSerif.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: "window.scrollTo(0,0);" }} />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-2SDZRNFRJR" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2SDZRNFRJR');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
