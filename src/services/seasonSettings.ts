import { useEffect, useState, useMemo } from "react";
import { listAdminSettings } from "./appApi";
import type { AdminSettings, Stage } from "./appTypes";

let settingsCache: AdminSettings | null = null;
let settingsPromise: Promise<AdminSettings | null> | null = null;

const loadSettings = async (): Promise<AdminSettings | null> => {
  if (settingsCache) return settingsCache;
  if (settingsPromise) return settingsPromise;
  
  settingsPromise = listAdminSettings().then(({ data }) => {
    const current = data?.[0] ?? null;
    settingsCache = current;
    return current;
  });
  
  return settingsPromise;
};

export const useSeasonSettings = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(settingsCache);
  const [loading, setLoading] = useState(!settingsCache);

  useEffect(() => {
    if (settingsCache) {
      setSettings(settingsCache);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadSettings().then((loaded) => {
      setSettings(loaded);
      setLoading(false);
    });
  }, []);

  const getAgeAt = (birthDate: string | null | undefined, cutoffDate?: string | null): number | null => {
    if (!birthDate) return null;
    const birth = new Date(`${birthDate}T00:00:00Z`);
    if (Number.isNaN(birth.getTime())) return null;

    const cutoff = cutoffDate 
      ? new Date(`${cutoffDate}T00:00:00Z`)
      : settings?.age_cutoff_date
        ? new Date(`${settings.age_cutoff_date}T00:00:00Z`)
        : settings?.qualification_start
          ? new Date(`${settings.qualification_start}T00:00:00Z`)
          : new Date(Date.UTC(2026, 4, 1)); // Fallback

    let age = cutoff.getUTCFullYear() - birth.getUTCFullYear();
    const monthDiff = cutoff.getUTCMonth() - birth.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && cutoff.getUTCDate() < birth.getUTCDate())) {
      age -= 1;
    }
    return age;
  };

  const getClassName = (
    birthDate: string | null | undefined,
    gender: "m" | "w" | null | undefined,
    cutoffDate?: string | null
  ): string | null => {
    const age = getAgeAt(birthDate, cutoffDate);
    if (age === null || !gender) return null;

    const u15Max = settings?.age_u16_max ?? 14; // U15 max Alter (unter 15 = bis 14)
    const u40Min = settings?.age_u40_min ?? 40;

    if (age <= u15Max) return `U15-${gender}`;
    if (age < u40Min) return `Ü15-${gender}`;
    return `Ü40-${gender}`;
  };

  const getAgeGroupRankingClass = (
    birthDate: string | null | undefined,
    gender: "m" | "w" | null | undefined,
    cutoffDate?: string | null
  ): string | null => {
    const age = getAgeAt(birthDate, cutoffDate);
    if (age === null || !gender) return null;

    if (age <= 9) return `U9-${gender}`;
    if (age <= 11) return `U11-${gender}`;
    if (age <= 13) return `U13-${gender}`;
    if (age <= 15) return `U15-${gender}`;
    if (age < 40) return `Ü15-${gender}`;
    if (age < 50) return `Ü40-${gender}`;
    return `Ü50-${gender}`;
  };

  const getStages = (): Stage[] => {
    if (settings?.stages && settings.stages.length > 0) {
      return settings.stages;
    }
    
    // Fallback: Generiere aus stage_months oder Qualifikationszeitraum
    if (!settings?.qualification_start || !settings?.qualification_end) {
      return [];
    }

    const start = new Date(settings.qualification_start);
    const end = new Date(settings.qualification_end);
    const stages: Stage[] = [];
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    let index = 1;
    while (current <= end) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      // Verwende Qualifikationsende wenn Monatsende später ist
      const stageEnd = monthEnd > end ? end : monthEnd;
      
      stages.push({
        key: `${year}-${String(month + 1).padStart(2, "0")}`,
        label: `Etappe ${index} (${monthNames[month]})`,
        start: monthStart.toISOString().split("T")[0],
        end: stageEnd.toISOString().split("T")[0],
      });
      
      current = new Date(year, month + 1, 1);
      index++;
    }

    return stages;
  };

  const isQualificationActive = (): boolean => {
    if (!settings?.qualification_start || !settings?.qualification_end) return false;
    const now = new Date();
    const start = new Date(settings.qualification_start);
    const end = new Date(settings.qualification_end);
    return now >= start && now <= end;
  };

  const getSeasonYear = (): string => {
    return settings?.season_year ?? "2026";
  };

  const getFinaleDate = (): string | null => {
    return settings?.finale_date ?? null;
  };

  const getQualificationStart = (): string | null => {
    return settings?.qualification_start ?? null;
  };

  const getQualificationEnd = (): string | null => {
    return settings?.qualification_end ?? null;
  };

  const getFinaleRegistrationDeadline = (): string | null => {
    return settings?.finale_registration_deadline ?? null;
  };

  const getPreparationStart = (): string | null => {
    return settings?.preparation_start ?? null;
  };

  const getPreparationEnd = (): string | null => {
    return settings?.preparation_end ?? null;
  };

  const getTop30PerClass = (): number => {
    return settings?.top_30_per_class ?? 30;
  };

  const getWildcardsPerClass = (): number => {
    return settings?.wildcards_per_class ?? 10;
  };

  const getAgeU15Max = (): number => {
    return settings?.age_u16_max ?? 14; // U15 max Alter (unter 15 = bis 14)
  };

  const getAgeU40Min = (): number => {
    return settings?.age_u40_min ?? 40;
  };

  const getFinaleEnabled = (): boolean => {
    return settings?.finale_enabled ?? false;
  };

  const refreshSettings = async () => {
    settingsCache = null;
    settingsPromise = null;
    const loaded = await loadSettings();
    setSettings(loaded);
    return loaded;
  };

  return {
    settings,
    loading,
    getAgeAt,
    getClassName,
    getAgeGroupRankingClass,
    getStages,
    isQualificationActive,
    getSeasonYear,
    getFinaleDate,
    getQualificationStart,
    getQualificationEnd,
    getFinaleRegistrationDeadline,
    getPreparationStart,
    getPreparationEnd,
    getTop30PerClass,
    getWildcardsPerClass,
    getAgeU15Max,
    getAgeU40Min,
    getFinaleEnabled,
    refreshSettings,
  };
};
