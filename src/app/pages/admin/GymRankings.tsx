import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, ListOrdered, Medal, RefreshCw, ShieldCheck, Trophy } from "lucide-react";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";
import {
  StitchBadge,
  StitchButton,
  StitchCard,
  StitchSelectField,
} from "@/app/components/StitchPrimitives";
import { formatRankingPointsDisplay as formatPoints } from "@/app/pages/participant/RankingRowCard";
import { getGymAdminRankings } from "@/services/appApi";

type RankingLeague = "toprope" | "lead";
type RankingGender = "m" | "w";
type RankingAge = "U15" | "UE15" | "UE40";

const leagueLabels: Record<RankingLeague, string> = {
  toprope: "Toprope",
  lead: "Vorstieg",
};

const genderLabels: Record<RankingGender, string> = {
  m: "männlich",
  w: "weiblich",
};

const ageLabels: Record<RankingAge, string> = {
  U15: "U15",
  UE15: "Ü15",
  UE40: "Ü40",
};

const GymRankings = () => {
  const [league, setLeague] = useState<RankingLeague>("toprope");
  const [gender, setGender] = useState<RankingGender>("m");
  const [age, setAge] = useState<RankingAge>("UE15");
  const rankingQuery = useQuery({
    queryKey: ["gym-admin-rankings", league, age, gender],
    queryFn: async () => {
      const response = await getGymAdminRankings(league, age, gender);
      if (response.error || !response.data) {
        throw new Error(response.error?.message ?? "Rangliste konnte nicht geladen werden.");
      }
      return response.data;
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const rows = rankingQuery.data ?? [];
  const selectionLabel = `${leagueLabels[league]} · ${ageLabels[age]} ${genderLabels[gender]}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Ligaweite Gesamtwertung"
        title="Rangliste"
        description="Die vollständige ligaweite Rangliste – mit denselben Wertungsregeln wie im Teilnehmerbereich."
      />

      <StitchCard tone="surface" className="space-y-4 p-4 md:p-5">
        <div className="flex items-start gap-3 rounded-xl border border-[rgba(0,61,85,0.12)] bg-[rgba(0,61,85,0.04)] p-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#003d55]" aria-hidden />
          <p className="text-sm leading-6 text-[rgba(27,28,26,0.72)]">
            Die Platzierungen werden mit denselben Saison- und Wertungsregeln wie im Teilnehmerbereich berechnet.
            An deinen Browser werden ausschließlich Name, Platz und Punkte übertragen.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StitchSelectField
            label="Liga"
            value={league}
            onChange={(event) => setLeague(event.target.value as RankingLeague)}
          >
            <option value="toprope">Toprope</option>
            <option value="lead">Vorstieg</option>
          </StitchSelectField>
          <StitchSelectField
            label="Wertungsklasse"
            value={age}
            onChange={(event) => setAge(event.target.value as RankingAge)}
          >
            <option value="U15">U15</option>
            <option value="UE15">Ü15</option>
            <option value="UE40">Ü40</option>
          </StitchSelectField>
          <StitchSelectField
            label="Geschlecht"
            value={gender}
            onChange={(event) => setGender(event.target.value as RankingGender)}
          >
            <option value="m">Männlich</option>
            <option value="w">Weiblich</option>
          </StitchSelectField>
        </div>
      </StitchCard>

      <div className="flex flex-wrap items-center justify-between gap-3" aria-live="polite">
        <div>
          <div className="stitch-kicker text-[#a15523]">Gesamtwertung</div>
          <h2 className="mt-1 text-lg font-semibold text-[#002637]">{selectionLabel}</h2>
          {!rankingQuery.isPending && !rankingQuery.error ? (
            <p className="mt-1 text-sm text-[rgba(27,28,26,0.68)]">
              {rows.length} {rows.length === 1 ? "Platzierung" : "Platzierungen"}
            </p>
          ) : null}
        </div>
        <StitchBadge tone="ghost" className="normal-case tracking-normal">
          Vollständige Rangliste
        </StitchBadge>
      </div>

      {rankingQuery.isPending ? (
        <StitchCard tone="surface" className="p-8 text-center" role="status" aria-live="polite">
          <ListOrdered className="mx-auto h-8 w-8 text-[rgba(0,61,85,0.46)]" aria-hidden />
          <p className="mt-3 text-sm text-[rgba(27,28,26,0.68)]">Rangliste wird geladen…</p>
        </StitchCard>
      ) : rankingQuery.error ? (
        <StitchCard tone="surface" className="space-y-4 p-5 md:p-6" role="alert">
          <p className="text-sm font-semibold text-[#b42318]">
            {rankingQuery.error instanceof Error
              ? rankingQuery.error.message
              : "Rangliste konnte nicht geladen werden."}
          </p>
          <StitchButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void rankingQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Erneut versuchen
          </StitchButton>
        </StitchCard>
      ) : rows.length === 0 ? (
        <StitchCard tone="surface" className="p-8 text-center">
          <ListOrdered className="mx-auto h-8 w-8 text-[rgba(0,61,85,0.46)]" aria-hidden />
          <p className="mt-3 text-sm text-[rgba(27,28,26,0.68)]">
            Für diese Filterkombination gibt es aktuell noch keine Ranglisteneinträge.
          </p>
        </StitchCard>
      ) : (
        <ol className="space-y-3">
          {rows.map((row, index) => {
            const RankIcon =
              row.rank === 1 ? Trophy : row.rank === 2 ? Medal : row.rank === 3 ? Award : null;

            return (
              <li key={`${row.rank}-${row.display_name}-${index}`}>
                <StitchCard tone="surface" className="p-4 md:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#003d55] text-[#f2dcab]">
                      {RankIcon ? (
                        <RankIcon className="h-5 w-5" aria-hidden />
                      ) : (
                        <span className="stitch-metric">{row.rank}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgba(27,28,26,0.68)]">
                        Platz {row.rank}
                      </div>
                      <div className="break-words text-base font-semibold text-[#002637] md:text-lg">
                        {row.display_name}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="stitch-metric text-2xl text-[#a15523]">
                        {formatPoints(row.points)}
                      </div>
                      <div className="text-xs text-[rgba(27,28,26,0.68)]">Punkte</div>
                    </div>
                  </div>
                </StitchCard>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default GymRankings;
