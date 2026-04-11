import useSWR from "swr";
import type { ReconProjectListItem } from "@/db/queries/recon";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useReconProjects() {
  return useSWR<ReconProjectListItem[]>("/api/recon-projects", fetcher, {
    revalidateOnFocus: true,
  });
}
