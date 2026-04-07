import useSWR from "swr";
import type { PipelineSummary } from "@/db/queries/pipeline";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type PipelineData = PipelineSummary & {
  sparklines: Record<string, number[]>;
};

export function usePipelineSummary() {
  return useSWR<PipelineData>("/api/pipeline/summary", fetcher, {
    refreshInterval: 5000,
  });
}
