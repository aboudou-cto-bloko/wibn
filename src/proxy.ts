import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { checkLicense } from "@/lib/license";

// Routes accessibles sans licence active sur cette instance.
const LICENSE_EXEMPT_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/activate",
  "/api/auth",
  "/api/license",
];

function isLicenseExempt(pathname: string) {
  return LICENSE_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verrou de licence sur toute l'instance (comme PROSPECTO_LICENSE) — sauté
  // en dev local pour ne pas bloquer le dev loop.
  if (
    process.env.NODE_ENV === "production" &&
    !isLicenseExempt(pathname)
  ) {
    const license = await checkLicense();
    if (!license.valid) {
      const url = new URL("/activate", request.url);
      url.searchParams.set("reason", license.reason);
      return NextResponse.redirect(url);
    }
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Protège /admin/*
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
