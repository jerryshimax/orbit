import useSWR from "swr";
import type { UnifiedMeeting, UnifiedMeetingFilter } from "@/db/queries/meetings-all";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAllMeetings(filters?: {
  source?: UnifiedMeetingFilter;
  entity?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.source) params.set("source", filters.source);
  if (filters?.entity) params.set("entity", filters.entity);
  const qs = params.toString();
  const key = `/api/meetings/all${qs ? `?${qs}` : ""}`;
  return useSWR<UnifiedMeeting[]>(key, fetcher, { revalidateOnFocus: true });
}
