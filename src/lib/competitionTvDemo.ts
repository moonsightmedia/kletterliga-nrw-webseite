import type { LiveData } from "@/services/competitionFinal";

// Imported only by the development demo; never served by the public endpoint.
export function competitionTvDemo(final = false, fullscreen = false, longNotice = false): LiveData {
  return {
    season: "2026", phase: final ? "final" : "semifinal", pinned_key: null,
    interval_seconds: 5, class_keys: [], semifinal_open: false,
    updated_at: new Date().toISOString(),
    notices: [{
      id: "tv-layout-demo", title: longNotice ? "Aktueller Hinweis zum geänderten Zeitplan für alle Teilnehmerinnen und Teilnehmer am Wettkampftag" : "Zeitplan geändert",
      body: longNotice ? "Die nächste Klasse startet zehn Minuten später. Bitte bleibt in der Nähe der Wettkampfrouten. Die aktuellen Startlisten hängen am Einlass aus. Bei Fragen hilft die Wettkampfleitung. ".repeat(3).slice(0, 500) : "Die nächste Klasse startet zehn Minuten später. Bitte bleibt in der Nähe der Wettkampfrouten. Die aktuellen Startlisten hängen am Einlass aus.",
      fullscreen, show_tv: true, show_app: false, expires_at: null,
    }],
    classes: Array.from({ length: 12 }, (_, classIndex) => ({
      key: `tv-demo-${classIndex}`, league: classIndex < 6 ? "lead" : "toprope",
      class_label: ["U18 weiblich", "Ü18 männlich", "Ü18 weiblich", "U18 männlich", "U18 offen", "Ü18 offen"][classIndex % 6],
      ...(final ? { phase: "running" as const } : {}),
      entries: Array.from({ length: classIndex === 0 ? 27 : 5 }, (_, index) => ({
        rank: index + 1,
        name: index % 4 === 3 ? `Alexandra-Maria Beispiel von Langnamenhausen ${index + 1}` : `Testperson ${classIndex + 1} · ${index + 1}`,
        ...(final ? { has_result: true, grip: 42 - index, is_top: index === 0, seconds: 105 + index, status: "ready" as const, semifinal_rank: index + 1, start_position: 27 - index } : { points: 500 - index, completed: 5 }),
      })),
    })),
  };
}
