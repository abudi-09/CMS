import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyComplaintsApi } from "@/lib/api";
import {
  mapBackendComplaint,
  UIComplaint,
  BackendComplaintDTO,
} from "@/lib/complaintMapper";

export const COMPLAINTS_QUERY_KEY = ["complaints", "my"] as const;

export function useMyComplaints() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: COMPLAINTS_QUERY_KEY,
    queryFn: async (): Promise<UIComplaint[]> => {
      const raw = await getMyComplaintsApi();
      return Array.isArray(raw)
        ? (raw as BackendComplaintDTO[]).map((r) => mapBackendComplaint(r))
        : [];
    },
    staleTime: 60_000,
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: COMPLAINTS_QUERY_KEY });
  }

  return { ...query, invalidate };
}
