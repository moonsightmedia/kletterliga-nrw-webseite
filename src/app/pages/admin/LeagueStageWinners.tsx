import { useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  buildRankingRowsForScope,
  getStageRange,
  type RankingAgeScope,
  type RankingGenderScope,
} from "@/app/pages/participant/participantData";
import { formatRankingPointsDisplay as formatPoints } from "@/app/pages/participant/RankingRowCard";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { listGyms, listProfiles, listResults, listRoutes } from "@/services/appApi";
import type { Gym, Profile, Result, Route } from "@/services/appTypes";
import { useSeasonSettings } from "@/services/seasonSettings";

type LeagueValue = "toprope" | "lead";

const leagueOptions: Array<{ value: LeagueValue; label: string }> = [
  { value: "lead", label: "Vorstieg" },
  { value: "toprope", label: "Top-Rope" },
];

const ageScopes: RankingAgeScope[] = ["U15", "UE15", "UE40"];
const genders: RankingGenderScope[] = ["m", "w"];

const ageScopeLabels: Record<RankingAgeScope, string> = {
  all: "Alle",
  U15: "U15",
  UE15: "Ü15",
  UE40: "Ü40",
};

const genderLabels: Record<RankingGenderScope, string> = {
  m: "männlich",
  w: "weiblich",
};

type StageWinner = {
  league: LeagueValue;
  leagueLabel: string;
  ageScope: RankingAgeScope;
  gender: RankingGenderScope;
  name: string;
  points: number;
};

const LeagueStageWinners = () => {
  const { getClassName, getStages } = useSeasonSettings();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageKey, setStageKey] = useState("");

  const stages = useMemo(() => getStages(), [getStages]);

  useEffect(() => {
    if (!stageKey && stages[0]?.key) {
      setStageKey(stages[0].key);
    }
  }, [stages, stageKey]);

  useEffect(() => {
    setLoading(true);
    Promise.all([listProfiles(), listResults(), listRoutes(), listGyms()]).then(
      ([profilesResp, resultsResp, routesResp, gymsResp]) => {
        setProfiles((profilesResp.data ?? []).filter((profile) => profile.role === "participant"));
        setResults(resultsResp.data ?? []);
        setRoutes(routesResp.data ?? []);
        setGyms(gymsResp.data ?? []);
        setLoading(false);
      },
    );
  }, []);

  const stageRange = useMemo(() => {
    if (!stageKey) return null;
    return getStageRange(stageKey, stages);
  }, [stageKey, stages]);

  const selectedStage = useMemo(
    () => stages.find((stage) => stage.key === stageKey) ?? null,
    [stages, stageKey],
  );

  const winners = useMemo((): StageWinner[] => {
    if (!stageRange) return [];

    const items: StageWinner[] = [];

    for (const league of leagueOptions) {
      for (const ageScope of ageScopes) {
        for (const gender of genders) {
          const rows = buildRankingRowsForScope({
            profiles,
            results,
            routes,
            gyms,
            leagueScope: league.value,
            gender,
            ageScope,
            stageRange,
            getClassName,
          });

          const top = rows[0];
          if (!top || top.points <= 0) continue;

          items.push({
            league: league.value,
            leagueLabel: league.label,
            ageScope,
            gender,
            name: top.name,
            points: top.points,
          });
        }
      }
    }

    return items;
  }, [profiles, results, routes, gyms, stageRange, getClassName]);

  const instagramText = useMemo(() => {
    if (!selectedStage || winners.length === 0) return "";

    const toprope = winners.filter((item) => item.league === "toprope");
    const lead = winners.filter((item) => item.league === "lead");

    const formatSection = (title: string, section: StageWinner[]) => {
      if (section.length === 0) return "";
      const lines = section.map(
        (item) =>
          `- ${ageScopeLabels[item.ageScope]} ${genderLabels[item.gender]}: ${item.name} (${formatPoints(item.points)})`,
      );
      return `${title}\n${lines.join("\n")}`;
    };

    return [
      `Etappensieger ${selectedStage.label}`,
      "",
      formatSection("TOP-ROPE", toprope),
      formatSection("VORSTIEG", lead),
    ]
      .filter(Boolean)
      .join("\n");
  }, [selectedStage, winners]);

  const copyInstagramText = async () => {
    if (!instagramText) return;
    try {
      await navigator.clipboard.writeText(instagramText);
      toast({ title: "Kopiert", description: "Etappensieger-Text wurde in die Zwischenablage kopiert." });
    } catch {
      toast({
        title: "Kopieren fehlgeschlagen",
        description: "Bitte Text manuell markieren und kopieren.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Auswertung"
        title="Etappensieger"
        description="Offizielle Etappenwertung für Instagram und Kommunikation — Hauptwertungsklassen U15 / Ü15 / Ü40."
      />

      <StitchCard className="space-y-4 p-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#003D55]">Etappe</span>
          <select
            className="w-full rounded-md border border-[#003D55]/15 bg-white px-3 py-2 text-sm"
            value={stageKey}
            onChange={(event) => setStageKey(event.target.value)}
            disabled={stages.length === 0}
          >
            {stages.map((stage) => (
              <option key={stage.key} value={stage.key}>
                {stage.label} ({stage.start} – {stage.end})
              </option>
            ))}
          </select>
        </label>

        {loading ? (
          <p className="text-sm text-[rgba(27,28,26,0.64)]">Lade Daten …</p>
        ) : winners.length === 0 ? (
          <p className="text-sm text-[rgba(27,28,26,0.64)]">Für diese Etappe liegen noch keine gewerteten Ergebnisse vor.</p>
        ) : (
          <div className="space-y-6">
            {leagueOptions.map((league) => {
              const section = winners.filter((item) => item.league === league.value);
              if (section.length === 0) return null;

              return (
                <div key={league.value}>
                  <h3 className="mb-3 font-['Space_Grotesk'] text-sm font-bold uppercase tracking-[0.08em] text-[#003D55]">
                    {league.label}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#003D55]/10 text-[rgba(27,28,26,0.64)]">
                          <th className="px-2 py-2">Klasse</th>
                          <th className="px-2 py-2">Geschlecht</th>
                          <th className="px-2 py-2">Sieger:in</th>
                          <th className="px-2 py-2">Punkte</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.map((item) => (
                          <tr key={`${item.league}-${item.ageScope}-${item.gender}`} className="border-b border-[#003D55]/5">
                            <td className="px-2 py-2">{ageScopeLabels[item.ageScope]}</td>
                            <td className="px-2 py-2">{genderLabels[item.gender]}</td>
                            <td className="px-2 py-2 font-medium">{item.name}</td>
                            <td className="px-2 py-2">{formatPoints(item.points)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <StitchButton type="button" onClick={copyInstagramText} disabled={!instagramText}>
          <Copy className="mr-2 h-4 w-4" />
          Instagram-Text kopieren
        </StitchButton>
      </StitchCard>
    </div>
  );
};

export default LeagueStageWinners;
