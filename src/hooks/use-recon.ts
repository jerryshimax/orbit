import useSWR from "swr";
import type { ReconData } from "@/db/queries/recon";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRecon(projectId: string | null) {
  return useSWR<ReconData>(
    projectId ? `/api/recon/${projectId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );
}
