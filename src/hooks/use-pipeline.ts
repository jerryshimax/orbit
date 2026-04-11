import useSWR from "swr";
import type { PipelineSummary } from "@/db/queries/pipeline";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type PipelineData = PipelineSummary & {
  sparklines: Record<string, number[]>;
};

export function usePipelineSummary(filters?: { entity?: string }) {
  const params = new URLSearchParams();
  if (filters?.entity) params.set("entity", filters.entity);
  const qs = params.toString();
  return useSWR<PipelineData>(`/api/pipeline/summary${qs ? `?${qs}` : ""}`, fetcher, {
    revalidateOnFocus: true,
  });
}
