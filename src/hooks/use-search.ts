import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SearchResults = {
  organizations: { id: string; name: string; stage: string; lpType: string | null }[];
  contacts: { id: string; name: string; title: string | null; orgId: string | null }[];
};

export function useSearch(query: string) {
  const key = query.length >= 2 ? `/api/search?q=${encodeURIComponent(query)}` : null;

  return useSWR<SearchResults>(key, fetcher, {
    dedupingInterval: 300,
  });
}
