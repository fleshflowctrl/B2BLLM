import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { createClient } from "@/utils/supabase/middleware";

const { auth } = NextAuth(authConfig);

function isAuthDisabled() {
  const value = process.env.AUTH_DISABLED ?? "true";
  return value !== "false" && value !== "0";
}

export default auth(async (req) => {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const { supabase, supabaseResponse } = createClient(req);
    await supabase.auth.getUser();

    if (isAuthDisabled()) {
      if (req.nextUrl.pathname.startsWith("/login")) {
        const redirect = NextResponse.redirect(new URL("/", req.nextUrl));
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirect.cookies.set(cookie.name, cookie.value);
        });
        return redirect;
      }
      return supabaseResponse;
    }
  }

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
