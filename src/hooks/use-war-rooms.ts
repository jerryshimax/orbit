import useSWR from "swr";
import type { WarRoomListItem } from "@/db/queries/war-room";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useWarRooms() {
  return useSWR<WarRoomListItem[]>("/api/war-rooms", fetcher, {
    revalidateOnFocus: true,
  });
}
