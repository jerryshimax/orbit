import useSWR from "swr";
import type { InteractionWithContext } from "@/db/queries/interactions";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useInteractions(filters?: {
  orgId?: string;
  type?: string;
  teamMember?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.orgId) params.set("orgId", filters.orgId);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.teamMember) params.set("teamMember", filters.teamMember);
  if (filters?.limit) params.set("limit", String(filters.limit));

  const qs = params.toString();
  const key = `/api/interactions${qs ? `?${qs}` : ""}`;

  return useSWR<InteractionWithContext[]>(key, fetcher, {
    refreshInterval: 5000,
  });
}
