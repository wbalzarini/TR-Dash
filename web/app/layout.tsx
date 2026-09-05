import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
