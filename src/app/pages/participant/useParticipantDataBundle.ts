import { useCallback, useEffect, useState } from "react";
import { listGyms, listProfiles, listResults, listRoutes } from "@/services/appApi";
import type { Gym, Profile, Result, Route } from "@/services/appTypes";

type ParticipantDataBundleState = {
  profiles: Profile[];
  results: Result[];
  routes: Route[];
  gyms: Gym[];
  loading: boolean;
  error: string | null;
};

const initialState: ParticipantDataBundleState = {
  profiles: [],
  results: [],
  routes: [],
  gyms: [],
  loading: true,
  error: null,
};

export const useParticipantDataBundle = () => {
  const [state, setState] = useState<ParticipantDataBundleState>(initialState);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const [{ data: profiles, error: profilesError }, { data: results, error: resultsError }, { data: routes, error: routesError }, { data: gyms, error: gymsError }] =
      await Promise.all([listProfiles(), listResults(), listRoutes(), listGyms()]);

    const firstError =
      profilesError?.message || resultsError?.message || routesError?.message || gymsError?.message || null;

    if (firstError || !profiles || !results || !routes || !gyms) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: firstError || "Die Teilnehmerdaten konnten nicht geladen werden.",
      }));
      return;
    }

    setState({
      profiles,
      results,
      routes,
      gyms,
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
};
