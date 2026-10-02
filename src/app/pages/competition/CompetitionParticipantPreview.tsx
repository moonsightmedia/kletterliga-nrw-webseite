import { useMemo, useRef, useState } from "react";
import CompetitionDay from "@/app/pages/participant/CompetitionDay";
import type { CompetitionDay as DayData } from "@/services/competitionDay";

type Scenario = "expected" | "arrived" | "partial" | "complete" | "closed" | "error";

function sample(scenario: Scenario): DayData {
  const routes = ["Sonnenkante", "Blaue Stunde", "Überhang", "Balance", "Gipfelweg"].map((name, index) => ({
    id: `preview-route-${index}`, number: index + 1, name, grade: "6+", color: ["gelb", "blau", "rot", "grün", "orange"][index],
  }));
  const count = scenario === "complete" ? 5 : scenario === "partial" ? 2 : 0;
  return {
    event: { id: "participant-preview-only", season_year: "2026", phase: scenario === "closed" ? "closed" : "open", zone_points: Array.from({ length: 11 }, (_, i) => i * 10), flash_bonus: 0, opened_at: "2026-10-03T08:00:00+02:00", submission_deadline_at: "2026-10-03T16:00:00+02:00" },
    eligible: true, league: "lead", class_label: "U15-w",
    check_in: { required: true, status: scenario === "expected" ? "expected" : "arrived", checked_in_at: scenario === "expected" ? null : "2026-10-03T09:00:00+02:00" },
    routes, results: routes.slice(0, count).map((route, i) => ({ id: `preview-result-${i}`, route_id: route.id, profile_id: "preview-participant-hints", zone: i === 0 ? 0 : 8, points: i === 0 ? 0 : 80, flash: false, created_at: "2026-10-03T10:00:00+02:00" })),
    is_staff: false, is_admin: false,
  };
}

/** Development-only rendering of the actual participant page with synthetic data. */
export default function CompetitionParticipantPreview() {
  const [scenario, setScenario] = useState<Scenario>("arrived");
  const data = useRef(sample(scenario));
  const activeScenario = useRef(scenario);
  const preview = useMemo(() => ({
    profileId: "preview-participant-hints", season: "2026",
    load: async () => {
      if (activeScenario.current === "error") throw new Error("Verbindung unterbrochen. Bitte erneut versuchen.");
      return data.current;
    },
    submit: async () => { throw new Error("Diese Vorschau speichert keine Wettkampfergebnisse."); },
  }), []);

  return <div className="stitch-app stitch-participant min-h-screen bg-gradient-to-b from-[#003d55] to-[#002637] text-[#f2dcab]">
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
      <details className="mb-5 border-b border-[#f2dcab]/20 text-xs">
        <summary className="min-h-11 cursor-pointer py-3">Vorschau · erfundene Daten</summary>
        <label className="flex flex-wrap items-center gap-3 pb-4">Situation
          <select aria-label="Vorschau-Situation" className="rounded bg-[#003d55] p-3" value={scenario} onChange={(event) => {
            const value = event.target.value as Scenario;
            activeScenario.current = value;
            data.current = sample(value);
            setScenario(value);
          }}>
            <option value="expected">Vor dem Einlass</option><option value="arrived">Eingecheckt</option>
            <option value="partial">Zwei Ergebnisse, davon einmal 0</option><option value="complete">Alle Ergebnisse</option>
            <option value="closed">Eingabe geschlossen</option><option value="error">Verbindungsfehler</option>
          </select>
        </label>
      </details>
      <CompetitionDay key={scenario} preview={preview} />
    </main>
  </div>;
}
