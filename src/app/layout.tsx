import { ClerkProvider } from '@clerk/nextjs';
import { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Jarvis AI | Neural Voice Assistant by Keyur",
  description: "A high-performance, voice-reactive AI assistant engineered by Keyur.",
  keywords: ["Jarvis AI", "Keyur", "Keyur Architect", "Voice Assistant", "AI Memory"],
  authors: [{ name: "Keyur" }],
  metadataBase: new URL('https://jarvis-ai-web-two.vercel.app'),
  verification: {
    google: "Gr3vdruMiT3JD3tOHAHQv6ZZU1zLMm3rElfjIeUKSZY", 
  },
  openGraph: {
    title: "Jarvis AI - Personalized Neural Assistant",
    description: "Experience a true voice-controlled AI with persistent memory, architected by Keyur.",
    url: "https://jarvis-ai-web-two.vercel.app", 
    siteName: "Jarvis AI",
    images: [{ url: '/icon.png', width: 512, height: 512 }],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // HIDDEN SCHEMA: This is what triggers the "Cristiano Ronaldo" style card on Google
 const personSchema = {
    "@context": "https://schema.org/",
    "@type": "Person",
    "name": "Keyur",
    "alternateName": "Keyur Architect",
    "jobTitle": "Lead Architect & Engineer",
    "description": "Lead Architect and Founder of the JarvisOS neural ecosystem.",
    "url": "https://jarvis-ai-web-two.vercel.app",
    "image": "https://jarvis-ai-web-two.vercel.app/keyur-headshot.png", // Link to a real photo
    "knowsAbout": ["Artificial Intelligence", "Neural Networks", "Software Engineering"],
    "brand": {
      "@type": "Brand",
      "name": "JarvisOS"
    },
    "sameAs": [
      "https://github.com/keyurbele",
      "https://twitter.com/your-handle",
      "https://linkedin.com/in/your-profile"
      "https://www.wikidata.org/wiki/Q139800407"
    ]
  };

  return (
    <ClerkProvider>
      <html lang="en">
        <head>
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
