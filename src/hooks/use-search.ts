import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SearchResults = {
  organizations: { id: string; name: string; nameZh: string | null; orgType: string; headquarters: string | null }[];
  people: { id: string; name: string; nameZh: string | null; title: string | null }[];
};

export function useSearch(query: string) {
  const key = query.length >= 2 ? `/api/search?q=${encodeURIComponent(query)}` : null;

  return useSWR<SearchResults>(key, fetcher, {
    dedupingInterval: 300,
  });
}
