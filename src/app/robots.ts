import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/', 
    },
    sitemap: 'https://jarvis-ai-web-two.vercel.app/sitemap.xml',
  };
}
