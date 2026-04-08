import useSWR from "swr";
import type { OrgWithMeta } from "@/db/queries/organizations";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useOrganizations(filters?: {
  stage?: string;
  orgType?: string;
  lpType?: string;
  owner?: string;
  q?: string;
  entity?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.stage) params.set("stage", filters.stage);
  if (filters?.orgType) params.set("orgType", filters.orgType);
  if (filters?.lpType) params.set("lpType", filters.lpType);
  if (filters?.owner) params.set("owner", filters.owner);
  if (filters?.q) params.set("q", filters.q);
  if (filters?.entity) params.set("entity", filters.entity);

  const qs = params.toString();
  const key = `/api/organizations${qs ? `?${qs}` : ""}`;

  return useSWR<OrgWithMeta[]>(key, fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });
}

export function useOrganizationDetail(id: string | null) {
  return useSWR(
    id ? `/api/organizations/${id}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );
}
