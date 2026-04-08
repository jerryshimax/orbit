import useSWR from "swr";
import type { PersonWithMeta } from "@/db/queries/people";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePeople(filters?: {
  orgId?: string;
  q?: string;
  entity?: string;
  relationship?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.orgId) params.set("orgId", filters.orgId);
  if (filters?.q) params.set("q", filters.q);
  if (filters?.entity) params.set("entity", filters.entity);
  if (filters?.relationship) params.set("relationship", filters.relationship);

  const qs = params.toString();
  const key = `/api/people${qs ? `?${qs}` : ""}`;

  return useSWR<PersonWithMeta[]>(key, fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });
}

export function usePersonDetail(id: string | null) {
  return useSWR(
    id ? `/api/people/${id}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );
}
