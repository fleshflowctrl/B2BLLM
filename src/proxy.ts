import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

function isAuthDisabled() {
  const value = process.env.AUTH_DISABLED ?? "true";
  return value !== "false" && value !== "0";
}

export default auth((req) => {
  if (isAuthDisabled()) {
    if (req.nextUrl.pathname.startsWith("/login")) {
      return Response.redirect(new URL("/", req.nextUrl));
    }
    return;
  }

  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAuthRoute = pathname.startsWith("/login");
  const isAuthApi = pathname.startsWith("/api/auth");

  if (isAuthApi) return;

  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/", req.nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
