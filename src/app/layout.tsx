import { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Jarvis AI | Next-Gen Voice Assistant",
  description: "A high-performance, voice-reactive AI assistant with long-term memory and local system control.",
  keywords: ["Jarvis AI", "Voice Assistant", "AI Memory", "Next.js AI", "Open Source Jarvis"],
  authors: [{ name: "Keyur" }],
  verification: {
    // I cleaned this up for you: Next.js only needs the code inside the quotes
    google: "Gr3vdruMiT3JD3tOHAHQv6ZZU1zLMm3rElfjIeUKSZY", 
  },
  openGraph: {
    title: "Jarvis AI - Personalized Neural Assistant",
    description: "Experience a true voice-controlled AI with persistent memory and hardware integration.",
    url: "https://jarvis-ai-web-two.vercel.app", 
    siteName: "Jarvis AI",
    images: [
      {
        url: "/og-image.png", 
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jarvis AI",
    description: "The closest thing to a real-life Jarvis assistant.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
