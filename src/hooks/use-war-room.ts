import useSWR from "swr";
import type { WarRoomData } from "@/db/queries/war-room";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useWarRoom(meetingId: string | null) {
  return useSWR<WarRoomData>(
    meetingId ? `/api/war-room/${meetingId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );
}
