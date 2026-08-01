// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import { Analytics } from "@/components/analytics";   // New analytics component
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { Header } from "@/components/header";
import { PromoBar } from "@/components/promo-bar";
import { Toaster } from "@/components/ui/toaster";
import Footer from "@/components/footer";
import "./globals.css";
import { BRAND } from "@/lib/config";
import { GlobalLoader } from "@/components/ui/global-loader"
import { FetchInterceptorInit } from "@/components/ui/fetch-interceptor-init"
import NextTopLoader from "nextjs-toploader"

// Load Nezal fonts
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700"],
  style: ["italic", "normal"],
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Helper for base URL (already present in original)
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NODE_ENV === "production") return BRAND.domain;
  return `http://localhost:${process.env.PORT || 3004}`;
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: `${BRAND.name} | Natural Skincare`,
  description:
    "Discover premium, natural skincare solutions. 100% natural extracts, cruelty‑free, dermatologist tested.",
  keywords: "skincare, natural, beauty, nezal, herbal, face care, body care",
  authors: [
    { name: BRAND.name, url: BRAND.domain },
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BRAND.domain,
    siteName: BRAND.name,
    title: `${BRAND.name} - Nature's Care, Visible Everywhere.`,
    description:
      "Premium natural skincare crafted with Ayurvedic wisdom. 100% natural, cruelty‑free.",
    images: [
      {
        url: `${BRAND.domain}/nezallogo.jpg`,
        width: 1200,
        height: 630,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} - Natural Skincare`,
    description: "Nature's care, visible everywhere.",
    images: [`${BRAND.domain}/nezallogo.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BRAND.domain,
  },
  generator: "Varun Singh - github.com/VarunSingh19",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${poppins.variable}`}
      // The actual font-family is applied via the CSS variables we defined\
    >
      <head>
        {/* All analytics scripts are now inside <Analytics /> */}
        <Analytics />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={BRAND.domain} />
        <link rel="icon" href="/nezallogo.jpg" />
        <link rel="preload" as="image" href="/nezallogo.jpg" />

        {/* Structured data (already present) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: BRAND.name,
              url: BRAND.domain,
              logo: `${BRAND.domain}/nezallogo.jpg`,
              description:
                "Premium natural skincare products crafted with Ayurvedic wisdom.",
              sameAs: [
                BRAND.social.facebook,
                BRAND.social.instagram,
              ],
            }),
          }}
        />
      </head>
     <body className="font-sans antialiased min-h-screen flex flex-col">
       <NextTopLoader
    color="var(--color-brand-primary)"
    height={3}
    showSpinner={false}
    shadow="0 0 10px var(--color-brand-primary), 0 0 5px var(--color-brand-primary)"
    easing="ease"
    speed={200}
  />
  <AuthSessionProvider>
    <GlobalLoader />   {/* ← add this line */}
     <FetchInterceptorInit />  
    <PromoBar />
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
  </AuthSessionProvider>
  <Toaster />
</body>
    </html>
  );
}