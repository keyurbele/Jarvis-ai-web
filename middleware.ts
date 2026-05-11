import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Allows users to see the landing/orb before logging in
  publicRoutes: ["/"],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
