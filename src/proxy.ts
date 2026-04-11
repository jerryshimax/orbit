import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Match all paths except static files, _next internals, and health check
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.png$|api/health).*)",
  ],
};
