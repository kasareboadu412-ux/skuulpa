import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Skuulr — School Management for Ghana",
  description: "The modern school management platform for private basic schools in Ghana. Fees, admissions, academics, bus, feeding — all in one place.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className={inter.className}>
        {children}
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: { fontFamily: "var(--font-inter, Inter, system-ui, sans-serif)" },
          }}
        />
      </body>
    </html>
  );
}
