import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkGymCodeRedeemed,
  fetchViewerMasterRedemptionForViewer,
  getGym,
  getParticipantCompetitionData,
  listGymCommunityStats,
  listGyms,
  listResults,
  listResultsForUser,
  listRoutes,
  listRoutesByGym,
} from "@/services/appApi";
import type {
  Gym,
  GymCommunityStats,
  Profile,
  Result,
  Route,
  ViewerMasterRedemption,
} from "@/services/appTypes";

export type ParticipantCompetitionData = {
  profiles: Profile[];
  results: Result[];
  routes: Route[];
  gyms: Gym[];
  gymStats: GymCommunityStats[];
  viewerMasterRedemption: ViewerMasterRedemption | null;
};

export type ParticipantGymDetailData = {
  gym: Gym | null;
  routes: Route[];
  results: Result[];
  allResults: Result[];
  codeRedeemed: boolean | null;
};

const PARTICIPANT_QUERY_STALE_TIME = 60_000;
const PARTICIPANT_QUERY_GC_TIME = 10 * 60_000;

const EMPTY_COMPETITION_DATA: ParticipantCompetitionData = {
  profiles: [],
  results: [],
  routes: [],
  gyms: [],
  gymStats: [],
  viewerMasterRedemption: null,
};

const EMPTY_GYM_DETAIL_DATA: ParticipantGymDetailData = {
  gym: null,
  routes: [],
  results: [],
  allResults: [],
  codeRedeemed: null,
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getResponseErrorMessage = (
  responses: Array<{ error?: { message?: string } | null }>,
  fallback: string,
) => responses.find((response) => response.error?.message)?.error?.message ?? fallback;

const buildQueryState = <T,>({
  data,
  isPending,
  isFetching,
  error,
  reload,
}: {
  data: T;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  reload: () => Promise<void>;
}) => {
  const isInitialLoading = isPending;

  return {
    data,
    loading: isInitialLoading,
    isInitialLoading,
    isRefreshing: isFetching && !isInitialLoading,
    error: error ? getErrorMessage(error, "Daten konnten nicht geladen werden.") : null,
    reload,
  };
};

const fetchParticipantCompetitionData = async (): Promise<ParticipantCompetitionData> => {
  const [compResp, gymStatsResp, viewerRedeemResp] = await Promise.all([
    getParticipantCompetitionData(),
    listGymCommunityStats(),
    fetchViewerMasterRedemptionForViewer(),
  ]);

  const responsesForMessage = [
    compResp,
    gymStatsResp,
    { error: viewerRedeemResp.error },
  ];

  const { data: competitionData } = compResp;
  const { data: gymStats } = gymStatsResp;

  if (!competitionData || !gymStats) {
    throw new Error(
      getResponseErrorMessage(
        responsesForMessage,
        "Die Teilnehmerdaten konnten nicht geladen werden.",
      ),
    );
  }

  const edgeViewer =
    competitionData.viewerMasterRedemption?.redeemed_at != null
      ? competitionData.viewerMasterRedemption
      : null;

  let dbViewer: ParticipantCompetitionData["viewerMasterRedemption"] | null = null;
  if (viewerRedeemResp.error) {
    console.warn(
      "[participantQueries] Fallback Mastercode nach Profil konnte nicht geladen werden:",
      (viewerRedeemResp.error as { message?: string }).message ?? viewerRedeemResp.error,
    );
  } else {
    dbViewer = viewerRedeemResp.data ?? null;
  }

  return {
    ...competitionData,
    viewerMasterRedemption: edgeViewer ?? dbViewer,
    gymStats,
  };
};

const fetchParticipantUserResults = async (profileId: string): Promise<Result[]> => {
  const response = await listResultsForUser(profileId);
  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.data ?? [];
};

const fetchParticipantGymDetailData = async (
  gymId: string,
  profileId: string,
): Promise<ParticipantGymDetailData> => {
  const responses = await Promise.all([
    getGym(gymId),
    listRoutesByGym(gymId),
    listResultsForUser(profileId),
    listResults(),
    checkGymCodeRedeemed(gymId, profileId),
  ]);

  const [{ data: gym }, { data: routes }, { data: results }, { data: allResults }, redeemedResult] = responses;
  const firstError = getResponseErrorMessage(responses, "");

  if (firstError) {
    throw new Error(firstError);
  }

  return {
    gym: gym ?? null,
    routes: routes ?? [],
    results: results ?? [],
    allResults: allResults ?? [],
    codeRedeemed: Boolean(redeemedResult.data),
  };
};

const fetchUnlockedGymIds = async (profileId: string, gymIds: string[]) => {
  const unlocked = new Set<string>();

  const responses = await Promise.all(
    gymIds.map(async (gymId) => {
      const response = await checkGymCodeRedeemed(gymId, profileId);
      if (response.data) {
        unlocked.add(gymId);
      }
      return response;
    }),
  );

  const firstError = getResponseErrorMessage(responses, "");
  if (firstError) {
    throw new Error(firstError);
  }

  return Array.from(unlocked);
};

export const participantQueryKeys = {
  competitionData: ["participant-competition-data"] as const,
  userResults: (profileId: string) => ["participant-user-results", profileId] as const,
  gymDetail: (gymId: string, profileId: string) =>
    ["participant-gym-detail", gymId, profileId] as const,
  unlockedGyms: (profileId: string, gymIdsKey: string) =>
    ["participant-unlocked-gyms", profileId, gymIdsKey] as const,
};

export const useParticipantCompetitionQuery = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: participantQueryKeys.competitionData,
    queryFn: fetchParticipantCompetitionData,
    staleTime: PARTICIPANT_QUERY_STALE_TIME,
    gcTime: PARTICIPANT_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
  });

  const state = buildQueryState({
    data: query.data ?? EMPTY_COMPETITION_DATA,
    isPending: query.isPending && !query.data,
    isFetching: query.isFetching,
    error: query.error,
    reload: () => queryClient.invalidateQueries({ queryKey: participantQueryKeys.competitionData }),
  });

  return {
    ...state,
    ...state.data,
  };
};

export const useParticipantUserResultsQuery = (profileId: string | null | undefined) => {
  const queryClient = useQueryClient();
  const normalizedProfileId = profileId ?? null;
  const query = useQuery({
    queryKey: participantQueryKeys.userResults(normalizedProfileId ?? "anonymous"),
    queryFn: () => fetchParticipantUserResults(normalizedProfileId as string),
    enabled: Boolean(normalizedProfileId),
    staleTime: PARTICIPANT_QUERY_STALE_TIME,
    gcTime: PARTICIPANT_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
  });

  const state = buildQueryState({
    data: query.data ?? [],
    isPending: Boolean(normalizedProfileId) && query.isPending && !query.data,
    isFetching: query.isFetching,
    error: query.error,
    reload: async () => {
      if (!normalizedProfileId) return;
      await queryClient.invalidateQueries({
        queryKey: participantQueryKeys.userResults(normalizedProfileId),
      });
    },
  });

  return {
    ...state,
    results: state.data,
  };
};

export const useParticipantGymDetailQuery = (
  gymId: string | null | undefined,
  profileId: string | null | undefined,
) => {
  const queryClient = useQueryClient();
  const normalizedGymId = gymId ?? null;
  const normalizedProfileId = profileId ?? null;
  const query = useQuery({
    queryKey: participantQueryKeys.gymDetail(
      normalizedGymId ?? "unknown-gym",
      normalizedProfileId ?? "unknown-profile",
    ),
    queryFn: () => fetchParticipantGymDetailData(normalizedGymId as string, normalizedProfileId as string),
    enabled: Boolean(normalizedGymId && normalizedProfileId),
    staleTime: PARTICIPANT_QUERY_STALE_TIME,
    gcTime: PARTICIPANT_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
  });

  const state = buildQueryState({
    data: query.data ?? EMPTY_GYM_DETAIL_DATA,
    isPending: Boolean(normalizedGymId && normalizedProfileId) && query.isPending && !query.data,
    isFetching: query.isFetching,
    error: query.error,
    reload: async () => {
      if (!normalizedGymId || !normalizedProfileId) return;
      await queryClient.invalidateQueries({
        queryKey: participantQueryKeys.gymDetail(normalizedGymId, normalizedProfileId),
      });
    },
  });

  return {
    ...state,
    ...state.data,
  };
};

export const useParticipantUnlockedGymsQuery = (
  profileId: string | null | undefined,
  gymIds: string[],
) => {
  const queryClient = useQueryClient();
  const normalizedProfileId = profileId ?? null;
  const gymIdsKey = useMemo(() => [...gymIds].sort().join("|"), [gymIds]);
  const query = useQuery({
    queryKey: participantQueryKeys.unlockedGyms(normalizedProfileId ?? "anonymous", gymIdsKey),
    queryFn: () => fetchUnlockedGymIds(normalizedProfileId as string, gymIds),
    enabled: Boolean(normalizedProfileId && gymIds.length > 0),
    staleTime: PARTICIPANT_QUERY_STALE_TIME,
    gcTime: PARTICIPANT_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
  });

  const state = buildQueryState({
    data: query.data ?? [],
    isPending: Boolean(normalizedProfileId && gymIds.length > 0) && query.isPending && !query.data,
    isFetching: query.isFetching,
    error: query.error,
    reload: async () => {
      if (!normalizedProfileId) return;
      await queryClient.invalidateQueries({
        queryKey: participantQueryKeys.unlockedGyms(normalizedProfileId, gymIdsKey),
      });
    },
  });

  return {
    ...state,
    unlockedGymIds: state.data,
  };
};
