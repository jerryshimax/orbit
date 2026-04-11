import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useActions(opts?: { type?: string; status?: string; entity?: string }) {
  const params = new URLSearchParams();
  if (opts?.type) params.set("type", opts.type);
  params.set("status", opts?.status ?? "open");
  if (opts?.entity) params.set("entity", opts.entity);
  return useSWR(`/api/actions?${params}`, fetcher, { refreshInterval: 30_000 });
}
