import { useQuery } from "@tanstack/react-query";
import {
  getGymAdminResults,
  getGymRouteHighlights,
  listGymAdminsByProfile,
  listRoutesByGym,
} from "@/services/appApi";
import type {
  GymAdminResultsPayload,
  GymRouteHighlights,
  Route,
} from "@/services/appTypes";

export type GymAdminOverviewData = {
  gymId: string | null;
  routes: Route[];
  results: GymAdminResultsPayload | null;
  highlights: GymRouteHighlights | null;
  highlightsError: string | null;
};

const EMPTY_GYM_ADMIN_OVERVIEW: GymAdminOverviewData = {
  gymId: null,
  routes: [],
  results: null,
  highlights: null,
  highlightsError: null,
};

const getResponseErrorMessage = (
  responses: Array<{ error?: { message?: string } | null }>,
  fallback: string,
) => responses.find((response) => response.error?.message)?.error?.message ?? fallback;

export const fetchGymAdminOverviewData = async (
  profileId: string,
): Promise<GymAdminOverviewData> => {
  const assignmentsResponse = await listGymAdminsByProfile(profileId);
  if (assignmentsResponse.error) {
    throw new Error(
      assignmentsResponse.error.message ?? "Die Hallenzuordnung konnte nicht geladen werden.",
    );
  }

  const gymId = assignmentsResponse.data?.[0]?.gym_id ?? null;
  if (!gymId) {
    return EMPTY_GYM_ADMIN_OVERVIEW;
  }

  const [routesResponse, resultsResponse, highlightsResponse] = await Promise.all([
    listRoutesByGym(gymId),
    getGymAdminResults(gymId),
    getGymRouteHighlights(gymId).catch(() => ({
      data: null,
      error: { message: "Routenbewertungen konnten nicht geladen werden." },
    })),
  ]);

  if (routesResponse.error || resultsResponse.error || !resultsResponse.data) {
    throw new Error(
      getResponseErrorMessage(
        [routesResponse, resultsResponse],
        "Die Hallenergebnisse konnten nicht geladen werden.",
      ),
    );
  }

  return {
    gymId,
    routes: routesResponse.data ?? [],
    results: resultsResponse.data,
    highlights: highlightsResponse.data ?? null,
    highlightsError: highlightsResponse.error?.message ?? null,
  };
};

export const gymAdminQueryKeys = {
  overview: (profileId: string) => ["gym-admin-overview", profileId] as const,
};

export const useGymAdminOverviewQuery = (profileId: string | null | undefined) => {
  const query = useQuery({
    queryKey: gymAdminQueryKeys.overview(profileId ?? "missing-profile"),
    queryFn: () => fetchGymAdminOverviewData(profileId as string),
    enabled: Boolean(profileId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data ?? EMPTY_GYM_ADMIN_OVERVIEW,
    loading: Boolean(profileId) && query.isPending,
    refreshing: query.isFetching && !query.isPending,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? "Die Hallenergebnisse konnten nicht geladen werden."
          : null,
    reload: async () => {
      const result = await query.refetch();
      return {
        data: result.data ?? null,
        error:
          result.error instanceof Error
            ? result.error.message
            : result.error
              ? "Die Hallenergebnisse konnten nicht geladen werden."
              : null,
      };
    },
  };
};
