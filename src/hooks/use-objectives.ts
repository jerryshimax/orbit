import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useObjectives(status?: string, entity?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (entity) params.set("entity", entity);
  return useSWR(`/api/objectives?${params}`, fetcher, { refreshInterval: 30_000 });
}
