import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTeamPulse() {
  return useSWR("/api/focus/team", fetcher, { refreshInterval: 60_000 });
}
