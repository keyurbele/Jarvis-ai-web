// src/app/layout.tsx
import { Metadata } from 'next';
import './globals.css'; // Ensure your global styles are imported

export const metadata: Metadata = {
  title: "Jarvis AI | Next-Gen Voice Assistant",
  description: "A high-performance, voice-reactive AI assistant with long-term memory and local system control.",
  keywords: ["Jarvis AI", "Voice Assistant", "AI Memory", "Next.js AI", "Open Source Jarvis"],
  authors: [{ name: "Keyur" }],
  openGraph: {
    title: "Jarvis AI - Personalized Neural Assistant",
    description: "Experience a true voice-controlled AI with persistent memory and hardware integration.",
    // ⚠️ CHANGE THIS: Put your actual Vercel URL here
    url: "https://jarvis-ai-web-two.vercel.app", // Use your real domain here
    siteName: "Jarvis AI",
    images: [
      {
        url: "/og-image.png", // Ensure this file exists in your /public folder
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
