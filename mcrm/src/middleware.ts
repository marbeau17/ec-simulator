import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Route patterns that do NOT require authentication.
 */
const PUBLIC_ROUTES = ["/login", "/", "/liff"];
const PUBLIC_PREFIXES = ["/liff/", "/api/webhook/line"];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isCronRoute(pathname: string): boolean {
  return pathname.startsWith("/api/cron/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Allow LINE webhook without any auth ---
  if (pathname.startsWith("/api/webhook/line")) {
    return NextResponse.next();
  }

  // --- Cron routes: validate CRON_SECRET bearer token ---
  if (isCronRoute(pathname)) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  // --- Public routes: no auth needed, but still refresh session ---
  // --- Protected routes: redirect to /login if no session ---

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh the session (important for keeping tokens valid)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes — let through regardless of auth state
  if (isPublicRoute(pathname)) {
    return response;
  }

  // Protected routes — require a valid session
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For /dashboard/* routes, verify the user exists in admin_users
  if (pathname.startsWith("/dashboard")) {
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (!adminUser) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("error", "not_authorized");
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
