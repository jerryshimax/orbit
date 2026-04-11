import useSWR from "swr";
import type { CalendarEvent } from "@/db/queries/calendar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCalendarEvents(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("start", startDate);
  if (endDate) params.set("end", endDate);

  const { data, error, isLoading, mutate } = useSWR<{
    events: CalendarEvent[];
    hasGoogleConnected: boolean;
  }>(`/api/calendar?${params}`, fetcher, {
    refreshInterval: 30_000, // 30s auto-refresh
  });

  return {
    events: data?.events ?? [],
    hasGoogleConnected: data?.hasGoogleConnected ?? false,
    isLoading,
    error,
    mutate,
  };
}
