import { useEffect, useState } from "react";
import { listGyms, listProfiles, listResults, listRoutes } from "@/services/appApi";
import type { Gym, Profile, Result, Route } from "@/services/appTypes";

type ParticipantCompetitionData = {
  profiles: Profile[];
  results: Result[];
  routes: Route[];
  gyms: Gym[];
};

const EMPTY_DATA: ParticipantCompetitionData = {
  profiles: [],
  results: [],
  routes: [],
  gyms: [],
};

export const useParticipantCompetitionData = () => {
  const [data, setData] = useState<ParticipantCompetitionData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          { data: profiles, error: profilesError },
          { data: results, error: resultsError },
          { data: routes, error: routesError },
          { data: gyms, error: gymsError },
        ] = await Promise.all([listProfiles(), listResults(), listRoutes(), listGyms()]);

        const firstError = profilesError || resultsError || routesError || gymsError;
        if (!active) return;

        if (firstError) {
          setError(firstError.message);
          setData(EMPTY_DATA);
          return;
        }

        setData({
          profiles: profiles ?? [],
          results: results ?? [],
          routes: routes ?? [],
          gyms: gyms ?? [],
        });
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Daten konnten nicht geladen werden.");
        setData(EMPTY_DATA);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  return {
    ...data,
    loading,
    error,
    reload: () => setReloadKey((current) => current + 1),
  };
};
