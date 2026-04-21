import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/', // Don't let them crawl your internal API routes
    },
    sitemap: 'https://your-project-name.vercel.app/sitemap.xml',
  };
}
