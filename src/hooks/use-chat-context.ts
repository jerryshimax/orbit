"use client";

import { usePathname, useParams } from "next/navigation";
import { useMemo } from "react";
import type { PageContext } from "@/lib/chat/system-prompt";

/**
 * Reads the current route and extracts entity context for the chat API.
 */
export function useChatContext(): PageContext {
  const pathname = usePathname();
  const params = useParams();

  return useMemo(() => {
    const id = params?.id as string | undefined;

    if (pathname.match(/^\/organizations\/[^/]+$/) && id) {
      return { route: pathname, entityType: "org" as const, entityId: id };
    }
    if (pathname.match(/^\/contacts\/[^/]+$/) && id) {
      return { route: pathname, entityType: "person" as const, entityId: id };
    }
    if (pathname === "/pipeline") {
      return { route: pathname, entityType: "pipeline" as const };
    }
    if (pathname.match(/^\/roadshow\/meetings\/[^/]+$/)) {
      const meetingId = params?.id as string;
      return {
        route: pathname,
        entityType: "meeting" as const,
        entityId: meetingId,
      };
    }

    return { route: pathname };
  }, [pathname, params]);
}
