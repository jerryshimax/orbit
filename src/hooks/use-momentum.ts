import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useMomentum() {
  return useSWR("/api/focus/momentum", fetcher, { refreshInterval: 60_000 });
}
