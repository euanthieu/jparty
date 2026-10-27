import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Poppins,
  Oswald,
  JetBrains_Mono,
  Inter,
  Lora,
} from "next/font/google";
import "./globals.css";
import QueryProvider from "@/shared/lib/providers/query-provider";
import { Toaster } from "sonner";
import { AuthListener } from "@/features/auth/components/AuthListener";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | JParty",
    default: "JParty | RSVP",
  },
  description:
    "Friday night at Karma. Bring up to 3 friends and save your spot.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://next-template.dev",
  ),
  openGraph: {
    title: "JParty | RSVP",
    description:
      "Friday night at Karma. Bring up to 3 friends and save your spot.",
    url: "https://next-template.dev",
    siteName: "JParty",
    images: [
      {
        url: "/party/dj-booth.webp",
        width: 2000,
        height: 2000,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JParty | RSVP",
    description:
      "Friday night at Karma. Bring up to 3 friends and save your spot.",
    images: ["/party/dj-booth.webp"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
        className={`${poppins.variable} ${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${jetbrainsMono.variable} ${inter.variable} ${lora.variable} font-[family-name:var(--font-poppins)] antialiased bg-background-primary text-text-primary min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {/* Kept only the actual components, removed the phantom provider */}
            {children}

            <Toaster position="top-right" theme="system" richColors />
            <AuthListener />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
