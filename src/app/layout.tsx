import { ClerkProvider } from '@clerk/nextjs';
import { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

// 1. Correct Next.js Metadata configuration (No HTML allowed in here!)
export const metadata: Metadata = {
  title: "JarvisOS | Official Site | Lead Architect Keyur",
  description: "A high-performance, voice-reactive AI assistant engineered by Keyur.",
  keywords: ["JarvisOS", "Jarvis AI", "Keyur", "Keyur Architect", "Voice Assistant", "AI Memory"],
  authors: [{ name: "Keyur" }],
  metadataBase: new URL('https://jarvis-ai-web-two.vercel.app'),
  verification: {
    google: "Gr3vdruMiT3JD3tOHAHQv6ZZU1zLMm3rElfjIeUKSZY", 
  },
  openGraph: {
    title: "JarvisOS - Personalized Neural Assistant",
    description: "Experience a true voice-controlled AI with persistent memory, architected by Keyur.",
    url: "https://jarvis-ai-web-two.vercel.app", 
    siteName: "JarvisOS",
    images: [{ url: '/icon.png', width: 512, height: 512 }],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  
  // 2. The WebSite Schema (This claims the "JarvisOS" name over the .org site)
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "JarvisOS",
    "alternateName": ["Jarvis AI", "Jarvis OS Official"],
    "url": "https://jarvis-ai-web-two.vercel.app/"
  };

  // 3. The Person Schema (This splits your identity from that random LinkedIn guy)
  const personSchema = {
    "@context": "https://schema.org/",
    "@type": "Person",
    "name": "Keyur",
    "alternateName": "Keyur Architect",
    "jobTitle": "Lead Architect & Founder",
    "description": "Lead Architect and Founder of the JarvisOS neural ecosystem, specializing in voice-reactive AI systems and persistent memory architecture.",
    "url": "https://jarvis-ai-web-two.vercel.app",
    "image": "https://jarvis-ai-web-two.vercel.app/icon.png", 
    "knowsAbout": ["Artificial Intelligence", "Neural Networks", "Systems Architecture"],
    "brand": {
      "@type": "Brand",
      "name": "JarvisOS",
      "logo": "https://jarvis-ai-web-two.vercel.app/icon.png"
    },
    "sameAs": [
      "https://github.com/keyurbele",
      "https://linkedin.com/in/keyur-bele",
      "https://www.wikidata.org/wiki/Q139800407"
    ]
  };

  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* Injecting both schemas safely into the head using Next.js rules */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
          />
        </head>
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
