"use client";

import { usePathname, useParams } from "next/navigation";
import { useMemo } from "react";
import type { PageContext } from "@/lib/chat/system-prompt";
import { usePageBridge } from "@/lib/chat/page-bridge";

/**
 * Reads the current route and extracts entity + form context for the chat API.
 */
export function useChatContext(): PageContext {
  const pathname = usePathname();
  const params = useParams();
  const bridge = usePageBridge();

  return useMemo(() => {
    const id = params?.id as string | undefined;
    let base: PageContext;

    if (pathname.match(/^\/organizations\/[^/]+$/) && id) {
      base = { route: pathname, entityType: "org" as const, entityId: id };
    } else if (pathname.match(/^\/contacts\/[^/]+$/) && id) {
      base = { route: pathname, entityType: "person" as const, entityId: id };
    } else if (pathname === "/pipeline") {
      base = { route: pathname, entityType: "pipeline" as const };
    } else if (pathname.match(/^\/roadshow\/meetings\/[^/]+$/)) {
      const meetingId = params?.id as string;
      base = {
        route: pathname,
        entityType: "meeting" as const,
        entityId: meetingId,
      };
    } else {
      base = { route: pathname };
    }

    // Layer in PageBridge form fields if the current page registered any.
    if (bridge.route === pathname && bridge.fields.length > 0) {
      base = {
        ...base,
        formFields: bridge.fields.map((f) => ({
          name: f.name,
          label: f.label,
          type: f.type,
          value: f.value,
          options: f.options,
          placeholder: f.placeholder,
        })),
        formSummary: bridge.summary ?? undefined,
      };
    }

    return base;
  }, [pathname, params, bridge.route, bridge.fields, bridge.summary]);
}
