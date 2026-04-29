import { ClerkProvider } from '@clerk/nextjs';
import { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Jarvis AI | Neural Voice Assistant by Keyur",
  description: "A high-performance, voice-reactive AI assistant with long-term memory and local system control.",
  keywords: ["Jarvis AI", "Voice Assistant", "AI Memory", "Next.js AI", "Keyur Jarvis"],
  authors: [{ name: "Keyur" }],
  metadataBase: new URL('https://jarvis-ai-web-two.vercel.app'),
  verification: {
    google: "Gr3vdruMiT3JD3tOHAHQv6ZZU1zLMm3rElfjIeUKSZY", 
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "Jarvis AI - Personalized Neural Assistant",
    description: "Experience a true voice-controlled AI with persistent memory and hardware integration.",
    url: "https://jarvis-ai-web-two.vercel.app", 
    siteName: "Jarvis AI",
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jarvis AI",
    description: "The closest thing to a real-life Jarvis assistant.",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
