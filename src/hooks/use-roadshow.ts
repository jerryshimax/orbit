import useSWR from "swr";
import type { TripWithLegsAndMeetings } from "@/db/queries/roadshow";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTrip(tripId: string | null) {
  return useSWR<TripWithLegsAndMeetings>(
    tripId ? `/api/roadshow/${tripId}` : null,
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: true }
  );
}

export function useMeeting(meetingId: string | null) {
  return useSWR(
    meetingId ? `/api/roadshow/meetings/${meetingId}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );
}

export function useDefaultTrip() {
  return useSWR<{ id: string; name: string } | null>(
    "/api/roadshow/default",
    fetcher,
    { revalidateOnFocus: true }
  );
}
