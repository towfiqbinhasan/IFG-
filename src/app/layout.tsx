import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { brand } from "@/config/brand";
import { Providers } from "@/components/providers";
import { SplashScreen } from "@/components/brand/splash-screen";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Display face for the wordmark & headings - matches the logo's geometric caps.
const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${brand.appName} · ${brand.tagline}`, template: `%s · ${brand.appName}` },
  description: brand.description,
  applicationName: brand.appName,
  appleWebApp: { capable: true, title: brand.shortName, statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#050c1b" },
  ],
};

// Hides the splash before first paint if it was already shown this session.
const splashScript = `try{if(${brand.splash.oncePerSession}&&sessionStorage.getItem('rl-splash-shown')==='1')document.documentElement.classList.add('splash-seen')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${montserrat.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <Providers>
          <SplashScreen />
          {children}
        </Providers>
      </body>
    </html>
  );
}
