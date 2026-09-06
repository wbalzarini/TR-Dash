import type { Metadata, Viewport } from "next";
import { Cinzel } from "next/font/google";
import "./globals.css";

/**
 * The wordmark face. Cinzel is drawn from Roman inscriptional capitals — the
 * same tradition as the carved sign on the island — which is why it sits right
 * next to the trident where a UI sans did not.
 *
 * next/font downloads this at build time and self-hosts it, so there is no
 * request to Google at runtime and no layout shift from a late webfont.
 * It is scoped to the wordmark; every number on the dashboard stays in the
 * system sans, which is the face that actually has to be read at a glance.
 */
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-cinzel",
});

export const metadata: Metadata = {
  title: "Trident Island · The Island Command Center",
  description:
    "Weather, wind, barometric pressure, St. Lawrence River level and Thousand Islands Bridge border waits for Trident Island.",
  applicationName: "Trident Island",
  appleWebApp: {
    capable: true,
    title: "Trident Island",
    statusBarStyle: "black-translucent",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  // The header sits under the notch on an iPhone; let it.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cinzel.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
