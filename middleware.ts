import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Home page is public, everything else requires login
  publicRoutes: ["/"],
  ignoredRoutes: ["/favicon.ico", "/icon.png", "/robots.txt"],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
