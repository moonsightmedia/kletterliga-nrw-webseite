import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Printer, RotateCcw, Tv2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  StitchBadge,
  StitchButton,
  StitchCard,
} from "@/app/components/StitchPrimitives";

type Phase = "preparation" | "published" | "running" | "review" | "final";
type Result = { grip: number; top: boolean; seconds: number; at: string };
type Entry = {
  id: string;
  name: string;
  halfRank: number;
  points: number;
  start: number;
  result?: Result;
  checked?: boolean;
};
type DemoClass = {
  id: string;
  name: string;
  league: string;
  phase: Phase;
  route: number;
  station: number;
  maxGrip: number;
  version: number;
  entries: Entry[];
};
type DemoState = {
  missingResolved: boolean;
  classes: DemoClass[];
  notice: string;
  displayPhase: "semifinal" | "final";
  changedAt: string;
  history: string[];
};

const key = "kletterliga:finaltag-demo:v1";
const now = () => new Date().toISOString();
const sample = (): DemoState => ({
  missingResolved: false,
  classes: [
    {
      id: "lead-u18",
      name: "U18 weiblich",
      league: "Vorstieg",
      phase: "running",
      route: 1,
      station: 1,
      maxGrip: 32,
      version: 5,
      entries: [
        { id: "l7", name: "Paula Muster", halfRank: 6, points: 290, start: 1 },
        { id: "l6", name: "Nora Beispiel", halfRank: 6, points: 290, start: 2 },
        { id: "l5", name: "Sina Probe", halfRank: 5, points: 320, start: 3 },
        { id: "l4", name: "Marie Test", halfRank: 4, points: 350, start: 4 },
        {
          id: "l3",
          name: "Lena Beispiel",
          halfRank: 3,
          points: 390,
          start: 5,
          result: { grip: 25, top: false, seconds: 215, at: now() },
        },
        {
          id: "l2",
          name: "Jana Muster",
          halfRank: 2,
          points: 420,
          start: 6,
          result: { grip: 27, top: false, seconds: 249, at: now() },
        },
        {
          id: "l1",
          name: "Mara Beispiel",
          halfRank: 1,
          points: 460,
          start: 7,
          result: { grip: 32, top: true, seconds: 271, at: now() },
        },
      ],
    },
    {
      id: "toprope-adult",
      name: "Ü18 offen",
      league: "Toprope",
      phase: "preparation",
      route: 2,
      station: 2,
      maxGrip: 28,
      version: 0,
      entries: [
        { id: "t6", name: "Robin Demo", halfRank: 6, points: 290, start: 1 },
        { id: "t5", name: "Max Beispiel", halfRank: 5, points: 315, start: 2 },
        { id: "t4", name: "Tim Muster", halfRank: 4, points: 340, start: 3 },
        { id: "t3", name: "Alex Probe", halfRank: 3, points: 380, start: 4 },
        { id: "t2", name: "Chris Test", halfRank: 2, points: 425, start: 5 },
        { id: "t1", name: "Kim Beispiel", halfRank: 1, points: 470, start: 6 },
      ],
    },
  ],
  notice: "",
  displayPhase: "final",
  changedAt: now(),
  history: [
    "Finalergebnis Mara Beispiel eingetragen",
    "Finalergebnis Jana Muster eingetragen",
    "Finalergebnis Lena Beispiel eingetragen",
    "Startliste U18 weiblich freigegeben",
  ],
});
const read = (): DemoState => {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) ?? "null",
    ) as DemoState | null;
    if (value?.classes?.length) return value;
  } catch {
    // A corrupt browser-only demo can always be reset.
  }
  return sample();
};
const phaseLabel: Record<Phase, string> = {
  preparation: "Vorbereitung",
  published: "Startliste freigegeben",
  running: "Finale läuft",
  review: "Papierprüfung",
  final: "Endgültig",
};
const resultLabel = (entry: Entry) =>
  entry.result
    ? `${entry.result.top ? "TOP" : `Griff ${entry.result.grip}`} · ${Math.floor(entry.result.seconds / 60)}:${String(entry.result.seconds % 60).padStart(2, "0")}`
    : "Offen";
const routePoints = (entry: Entry, routeIndex: number) => {
  if (entry.id === "t6" && routeIndex === 4) return null;
  const count = entry.id === "t6" ? 4 : 5;
  return (
    Math.floor(entry.points / count) + Number(routeIndex < entry.points % count)
  );
};
const order = (a: Entry, b: Entry) =>
  Number(!!b.result?.top) - Number(!!a.result?.top) ||
  (b.result?.grip ?? -1) - (a.result?.grip ?? -1) ||
  a.halfRank - b.halfRank ||
  (a.result?.seconds ?? 999) - (b.result?.seconds ?? 999);
const ranked = (entries: Entry[]) => {
  const sorted = entries.filter((entry) => entry.result).sort(order);
  return sorted.map((entry, index) => ({
    entry,
    rank:
      sorted.findIndex((other) => order(other, entry) === 0) + 1 || index + 1,
  }));
};

const inputClass =
  "min-h-11 rounded-xl border border-[#003d55]/25 bg-white px-3 text-[#003d55]";

export default function CompetitionDemo() {
  const [params, setParams] = useSearchParams();
  const view = params.get("ansicht") ?? "admin";
  const [state, setState] = useState<DemoState>(read);
  const [tab, setTab] = useState(params.get("reiter") ?? "overview");
  const [selectedClass, setSelectedClass] = useState("lead-u18");
  const [selectedEntry, setSelectedEntry] = useState("l4");
  const [grip, setGrip] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [top, setTop] = useState(false);
  const [message, setMessage] = useState("");
  const [noticeDraft, setNoticeDraft] = useState("");

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [state]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key) setState(read());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const update = (
    description: string,
    change: (current: DemoState) => DemoState,
  ) => {
    setState((current) => {
      const next = change(structuredClone(current));
      next.changedAt = now();
      next.history = [description, ...next.history].slice(0, 12);
      return next;
    });
    setMessage(description);
  };
  const activeClass =
    state.classes.find((item) => item.id === selectedClass) ?? state.classes[0];
  const availableEntry = activeClass.entries.find(
    (item) => item.id === selectedEntry,
  );
  const openCount = state.classes.reduce(
    (total, item) =>
      total +
      item.entries.filter((entry) => item.phase === "running" && !entry.result)
        .length,
    0,
  );
  const uncheckedCount = state.classes.reduce(
    (total, item) =>
      total +
      item.entries.filter((entry) => entry.result && !entry.checked).length,
    0,
  );
  const tvClass =
    state.classes.find((item) => item.phase !== "preparation") ??
    state.classes[0];
  const orderedTv = useMemo(() => ranked(tvClass.entries), [tvClass]);
  const semifinalTv = useMemo(
    () =>
      [...tvClass.entries].sort(
        (a, b) => a.halfRank - b.halfRank || a.name.localeCompare(b.name, "de"),
      ),
    [tvClass],
  );
  const setView = (next: string) =>
    setParams(next === "admin" ? {} : { ansicht: next });

  if (view === "druck") {
    const printClass =
      state.classes.find((item) => item.id === params.get("klasse")) ??
      state.classes[0];
    return (
      <div className="mx-auto max-w-[800px] bg-white p-8 text-[#003d55]">
        <div className="mb-5 flex justify-between print:hidden">
          <button className="underline" onClick={() => setView("admin")}>
            Zurück zur Demo
          </button>
          <button
            className="rounded-lg bg-[#003d55] px-5 py-2 font-bold text-white"
            onClick={() => window.print()}
          >
            Jetzt drucken / als PDF speichern
          </button>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest">
          Kletterliga NRW 2026 · Testdruck
        </p>
        <h1 className="mt-2 text-3xl font-black">
          Finalstartliste · {printClass.league} · {printClass.name}
        </h1>
        <p className="mt-2">
          Route {printClass.route} · Station {printClass.station} · Version{" "}
          {printClass.version} · Stand{" "}
          {new Date(state.changedAt).toLocaleString("de-DE")}
        </p>
        <p className="mb-5 mt-2 rounded bg-amber-100 p-2 font-bold print:hidden">
          Nur fiktive Demodaten. Keine offizielle Startliste.
        </p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f2dcab] text-left">
              <th className="border p-2">Start</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">HF</th>
              <th className="border p-2">Griff / TOP</th>
              <th className="border p-2">Dauer</th>
              <th className="border p-2">Bemerkungen</th>
            </tr>
          </thead>
          <tbody>
            {[...printClass.entries]
              .sort((a, b) => a.start - b.start)
              .map((entry) => (
                <tr key={entry.id} className="h-16">
                  <td className="border p-2 font-bold">{entry.start}</td>
                  <td className="border p-2">{entry.name}</td>
                  <td className="border p-2">{entry.halfRank}.</td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="mt-12 grid grid-cols-2 gap-10">
          <p className="border-t pt-2">Schiedsrichter/in</p>
          <p className="border-t pt-2">Zeitnahme</p>
        </div>
        <style>{`@page { size: A4 portrait; margin: 14mm; } @media print { body { background: white !important; } thead { display: table-header-group; } tr { break-inside: avoid; } }`}</style>
      </div>
    );
  }

  if (view === "tv") {
    return (
      <div className="min-h-screen bg-[#003d55] p-10 text-[#f2dcab]">
        <header className="flex items-start justify-between border-b border-[#f2dcab]/30 pb-5">
          <div>
            <p className="font-black tracking-[.25em]">
              KLETTERLIGA NRW · DEMO
            </p>
            <h1 className="mt-2 text-6xl font-black">
              {state.displayPhase === "final" ? "FINALE" : "HALBFINALE"} 2026
            </h1>
          </div>
          <div className="text-right">
            <p>
              Testdaten · Stand{" "}
              {new Date(state.changedAt).toLocaleTimeString("de-DE")}
            </p>
            <button className="mt-3 underline" onClick={() => setView("admin")}>
              Zurück zur Zentrale
            </button>
          </div>
        </header>
        {state.notice && (
          <div className="mt-7 rounded-2xl bg-[#a15523] p-7 text-3xl font-bold text-white">
            Hinweis: {state.notice}
          </div>
        )}
        <main className="mx-auto max-w-[1500px] pt-10">
          <h2 className="mb-5 text-4xl font-black">
            {tvClass.league} · {tvClass.name}
          </h2>
          <table className="w-full text-left text-3xl">
            <thead className="bg-[#f2dcab] text-[#003d55]">
              <tr>
                <th className="p-4">PLATZ</th>
                <th className="p-4">NAME</th>
                <th className="p-4">ERGEBNIS</th>
              </tr>
            </thead>
            <tbody>
              {(state.displayPhase === "final"
                ? orderedTv
                : semifinalTv.map((entry) => ({ entry, rank: entry.halfRank }))
              ).map(({ entry, rank }) => (
                <tr key={entry.id} className="border-b border-[#f2dcab]/20">
                  <td className="p-4 font-black">{rank}</td>
                  <td className="p-4">{entry.name}</td>
                  <td className="p-4">
                    {state.displayPhase === "final"
                      ? resultLabel(entry)
                      : `${entry.points} Punkte`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {state.displayPhase === "final" && (
            <p className="mt-8 text-xl font-bold">
              Vorläufiger Live-Stand. Die endgültige Wertung erfolgt nach
              Abschluss des Finales und Prüfung der Papierlisten.
            </p>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3e9] px-5 py-8 text-[#003d55]">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-xl bg-amber-100 p-4 text-sm font-bold text-amber-900">
          LOKALE DEMO · ausschließlich erfundene Testdaten · Änderungen bleiben
          nur in diesem Browser · keine Verbindung zu Supabase
        </div>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="stitch-kicker text-[#a15523]">Finaltag · 2026</p>
            <h1 className="stitch-headline text-3xl">
              {view === "station"
                ? "Digitale Ergebniseingabe"
                : "Wettkampfzentrale"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <StitchButton
              variant="outline"
              onClick={() => setView(view === "station" ? "admin" : "station")}
            >
              {view === "station" ? "Zu Renés Zentrale" : "Station testen"}
            </StitchButton>
            <StitchButton variant="outline" onClick={() => setView("tv")}>
              <Tv2 size={16} className="mr-2" />
              TV-Vorschau
            </StitchButton>
            <StitchButton
              variant="outline"
              onClick={() => {
                setState(sample());
                setMessage("Demo auf Ausgangsstand gesetzt.");
              }}
            >
              <RotateCcw size={16} className="mr-2" />
              Zurücksetzen
            </StitchButton>
          </div>
        </header>
        {message && (
          <p
            role="status"
            className="rounded-xl bg-emerald-100 p-3 font-bold text-emerald-900"
          >
            {message}
          </p>
        )}
        {view === "station" ? (
          <StitchCard className="space-y-5 p-6">
            <p>
              Station 1 und 2 sind hier bereits als Testzugang verbunden. Wähle
              eine laufende Klasse und übertrage einen Papierwert.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 font-bold">
                Klasse
                <select
                  className={inputClass}
                  value={selectedClass}
                  onChange={(event) => {
                    setSelectedClass(event.target.value);
                    setSelectedEntry("");
                  }}
                >
                  {state.classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.league} · {item.name} · {phaseLabel[item.phase]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 font-bold">
                Person
                <select
                  className={inputClass}
                  value={selectedEntry}
                  onChange={(event) => setSelectedEntry(event.target.value)}
                >
                  <option value="">Person wählen</option>
                  {activeClass.entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.start}. {entry.name} · {resultLabel(entry)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {availableEntry && (
              <p className="rounded-xl bg-[#f2dcab] p-3">
                {availableEntry.name} · Route {activeClass.route} · letzter
                Griff {activeClass.maxGrip} · bisher:{" "}
                <strong>{resultLabel(availableEntry)}</strong>
              </p>
            )}
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 font-bold">
                <input
                  type="checkbox"
                  checked={top}
                  onChange={(event) => setTop(event.target.checked)}
                />
                TOP
              </label>
              <label className="grid gap-2 font-bold">
                Griff
                <input
                  className={`${inputClass} w-28`}
                  type="number"
                  min="0"
                  max={activeClass.maxGrip}
                  disabled={top}
                  value={top ? activeClass.maxGrip : grip}
                  onChange={(event) => setGrip(event.target.value)}
                />
              </label>
              <label className="grid gap-2 font-bold">
                Minuten
                <input
                  className={`${inputClass} w-28`}
                  type="number"
                  min="0"
                  max="5"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                />
              </label>
              <label className="grid gap-2 font-bold">
                Sekunden
                <input
                  className={`${inputClass} w-28`}
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(event) => setSeconds(event.target.value)}
                />
              </label>
            </div>
            <StitchButton
              disabled={
                !availableEntry ||
                activeClass.phase !== "running" ||
                minutes === "" ||
                seconds === "" ||
                (!top && grip === "")
              }
              onClick={() => {
                const duration = Number(minutes) * 60 + Number(seconds);
                const hold = top ? activeClass.maxGrip : Number(grip);
                if (
                  !Number.isInteger(duration) ||
                  duration < 0 ||
                  duration > 300 ||
                  Number(seconds) > 59 ||
                  !Number.isInteger(hold) ||
                  hold < 0 ||
                  hold > activeClass.maxGrip
                ) {
                  setMessage("Griff und Zeit prüfen: maximal 5:00.");
                  return;
                }
                update(
                  `Vorläufiges Ergebnis für ${availableEntry!.name} gespeichert.`,
                  (current) => {
                    const target = current.classes.find(
                      (item) => item.id === activeClass.id,
                    )!;
                    const entry = target.entries.find(
                      (item) => item.id === availableEntry!.id,
                    )!;
                    entry.result = {
                      grip: hold,
                      top,
                      seconds: duration,
                      at: now(),
                    };
                    entry.checked = false;
                    target.version++;
                    return current;
                  },
                );
                setGrip("");
                setMinutes("");
                setSeconds("");
                setTop(false);
              }}
            >
              Ergebnis vorläufig speichern
            </StitchButton>
            <p className="text-sm">
              In der echten App sind Stationscode, Bestätigungsschritt,
              Versionsprüfung und Begründung bei Korrekturen verpflichtend.
              Diese lokale Demo sendet nichts an den Server.
            </p>
          </StitchCard>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0">
              {[
                ["overview", "Übersicht"],
                ["semifinal", "Halbfinale"],
                ["roster", "Finalstartlisten"],
                ["final", "Finale"],
                ["display", "Anzeige & Hinweise"],
              ].map(([id, label]) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="min-h-11 rounded-xl border border-[#003d55]/20 px-4 data-[state=active]:bg-[#003d55] data-[state=active]:text-[#f2dcab]"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="overview" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Halbfinale", "Geschlossen"],
                  ["Offene Halbfinalrouten", state.missingResolved ? "0" : "1"],
                  [
                    "Finalklassen freigegeben",
                    `${state.classes.filter((item) => item.phase !== "preparation").length}/2`,
                  ],
                  ["Papierabgleich offen", String(uncheckedCount)],
                ].map(([label, value]) => (
                  <StitchCard key={label} className="p-5">
                    <p>{label}</p>
                    <strong className="stitch-headline text-3xl">
                      {value}
                    </strong>
                  </StitchCard>
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <StitchCard className="p-5">
                  <h2 className="stitch-headline text-xl">Klassenstatus</h2>
                  {state.classes.map((item) => (
                    <p
                      key={item.id}
                      className="mt-3 flex justify-between rounded-lg bg-white p-3"
                    >
                      <span>
                        {item.league} · {item.name}
                      </span>
                      <strong>{phaseLabel[item.phase]}</strong>
                    </p>
                  ))}
                </StitchCard>
                <StitchCard className="p-5">
                  <h2 className="stitch-headline text-xl">Letzte Änderungen</h2>
                  {state.history.slice(0, 5).map((item, index) => (
                    <p
                      key={`${item}-${index}`}
                      className="border-b py-2 text-sm"
                    >
                      {item}
                    </p>
                  ))}
                </StitchCard>
              </div>
              <p className="text-sm">
                {openCount} Finalergebnisse fehlen derzeit. Die Tabellen und
                Aktionen darunter lassen sich mit den Testdaten ausprobieren.
              </p>
            </TabsContent>
            <TabsContent value="semifinal" className="space-y-4 pt-4">
              <StitchCard className="p-5">
                <h2 className="stitch-headline text-xl">
                  Halbfinale · Live-Ranking
                </h2>
                <p className="mb-4 text-sm">
                  Fünf Routenergebnisse je Person. Der eine fehlende Wert in
                  Toprope muss vor der Finalfreigabe ausdrücklich geklärt
                  werden.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2">HF-Platz</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Klasse</th>
                        <th className="p-2">R1</th>
                        <th className="p-2">R2</th>
                        <th className="p-2">R3</th>
                        <th className="p-2">R4</th>
                        <th className="p-2">R5</th>
                        <th className="p-2">Gesamt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.classes
                        .flatMap((item) => item.entries)
                        .sort((a, b) => a.halfRank - b.halfRank)
                        .map((entry) => (
                          <tr key={entry.id} className="border-b">
                            <td className="p-2">{entry.halfRank}.</td>
                            <td className="p-2 font-bold">{entry.name}</td>
                            <td className="p-2">
                              {entry.id.startsWith("l")
                                ? "Vorstieg U18"
                                : "Toprope Ü18"}
                            </td>
                            {[0, 1, 2, 3, 4].map((n) => (
                              <td key={n} className="p-2">
                                {entry.id === "t6" && n === 4
                                  ? state.missingResolved
                                    ? "0"
                                    : "offen"
                                  : routePoints(entry, n)}
                              </td>
                            ))}
                            <td className="p-2 font-bold">{entry.points}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {!state.missingResolved && (
                  <StitchButton
                    className="mt-4"
                    onClick={() =>
                      update(
                        "Toprope: fehlende Route als nicht geklettert mit 0 Punkten geklärt.",
                        (current) => ({ ...current, missingResolved: true }),
                      )
                    }
                  >
                    Fehlende Route begründet als 0 klären
                  </StitchButton>
                )}
              </StitchCard>
            </TabsContent>
            <TabsContent value="roster" className="space-y-4 pt-4">
              {state.classes.map((item) => (
                <StitchCard key={item.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="stitch-headline text-xl">
                        {item.league} · {item.name}
                      </h2>
                      <p>
                        Route {item.route} · Station {item.station} · letzter
                        Griff {item.maxGrip} · Liste v{item.version}
                      </p>
                    </div>
                    <StitchBadge tone="cream">
                      {phaseLabel[item.phase]}
                    </StitchBadge>
                  </div>
                  {item.phase === "preparation" && (
                    <p className="rounded-lg bg-amber-100 p-3 font-bold">
                      {state.missingResolved
                        ? "Finalfeld bereit zur Bestätigung."
                        : "Eine Halbfinalroute ist ungeklärt. Erst im Halbfinal-Reiter klären."}
                    </p>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2">Start</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">HF-Platz</th>
                          <th className="p-2">Punkte</th>
                          <th className="p-2">Reihenfolge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...item.entries]
                          .sort((a, b) => a.start - b.start)
                          .map((entry) => (
                            <tr key={entry.id} className="border-b">
                              <td className="p-2 font-bold">{entry.start}</td>
                              <td className="p-2">{entry.name}</td>
                              <td className="p-2">{entry.halfRank}.</td>
                              <td className="p-2">{entry.points}</td>
                              <td className="p-2">
                                <button
                                  className="rounded border px-3 py-1 disabled:opacity-40"
                                  disabled={
                                    item.phase !== "published" ||
                                    entry.start === 1
                                  }
                                  onClick={() =>
                                    update(
                                      `${entry.name} in Startreihenfolge verschoben. Neue Liste drucken.`,
                                      (current) => {
                                        const target = current.classes.find(
                                          (row) => row.id === item.id,
                                        )!;
                                        const moved = target.entries.find(
                                          (row) => row.id === entry.id,
                                        )!;
                                        const prior = target.entries.find(
                                          (row) =>
                                            row.start === moved.start - 1,
                                        )!;
                                        prior.start++;
                                        moved.start--;
                                        target.version++;
                                        return current;
                                      },
                                    )
                                  }
                                >
                                  ↑
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.phase === "preparation" && (
                      <StitchButton
                        disabled={!state.missingResolved}
                        onClick={() =>
                          update(
                            `${item.name}: Finalfeld einschließlich Punktgleicher bestätigt.`,
                            (current) => {
                              const target = current.classes.find(
                                (row) => row.id === item.id,
                              )!;
                              target.phase = "published";
                              target.version = 1;
                              return current;
                            },
                          )
                        }
                      >
                        Finalfeld bestätigen
                      </StitchButton>
                    )}
                    <StitchButton
                      variant="outline"
                      disabled={item.phase === "preparation"}
                      onClick={() =>
                        setParams({ ansicht: "druck", klasse: item.id })
                      }
                    >
                      <Printer size={16} className="mr-2" />
                      Startliste drucken
                    </StitchButton>
                  </div>
                </StitchCard>
              ))}
            </TabsContent>
            <TabsContent value="final" className="space-y-4 pt-4">
              {state.classes
                .filter((item) => item.phase !== "preparation")
                .map((item) => (
                  <StitchCard key={item.id} className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="stitch-headline text-xl">
                          {item.league} · {item.name}
                        </h2>
                        <p>
                          {phaseLabel[item.phase]} · Route {item.route} · Liste
                          v{item.version}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {item.phase === "published" && (
                          <StitchButton
                            onClick={() =>
                              update(
                                `${item.name}: Finale gestartet.`,
                                (current) => {
                                  current.classes.find(
                                    (row) => row.id === item.id,
                                  )!.phase = "running";
                                  return current;
                                },
                              )
                            }
                          >
                            Klasse starten
                          </StitchButton>
                        )}
                        {item.phase === "running" && (
                          <StitchButton
                            onClick={() =>
                              update(
                                `${item.name}: Eingabe geschlossen.`,
                                (current) => {
                                  current.classes.find(
                                    (row) => row.id === item.id,
                                  )!.phase = "review";
                                  return current;
                                },
                              )
                            }
                          >
                            Eingabe schließen
                          </StitchButton>
                        )}
                        {item.phase === "review" && (
                          <StitchButton
                            disabled={item.entries.some(
                              (entry) => !entry.result || !entry.checked,
                            )}
                            onClick={() =>
                              update(
                                `${item.name}: Wertung endgültig freigegeben.`,
                                (current) => {
                                  current.classes.find(
                                    (row) => row.id === item.id,
                                  )!.phase = "final";
                                  return current;
                                },
                              )
                            }
                          >
                            Endgültig freigeben
                          </StitchButton>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="p-2">Platz</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Ergebnis</th>
                            <th className="p-2">Halbfinale</th>
                            <th className="p-2">Papierliste</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ...ranked(item.entries).map(({ entry, rank }) => ({
                              entry,
                              rank,
                            })),
                            ...item.entries
                              .filter((entry) => !entry.result)
                              .map((entry) => ({ entry, rank: 0 })),
                          ].map(({ entry, rank }) => (
                            <tr key={entry.id} className="border-b">
                              <td className="p-2 font-bold">{rank || "–"}</td>
                              <td className="p-2">{entry.name}</td>
                              <td className="p-2">{resultLabel(entry)}</td>
                              <td className="p-2">{entry.halfRank}.</td>
                              <td className="p-2">
                                {entry.checked ? (
                                  "Abgeglichen"
                                ) : entry.result ? (
                                  <button
                                    className="underline"
                                    onClick={() =>
                                      update(
                                        `${entry.name}: Papierliste abgeglichen.`,
                                        (current) => {
                                          current.classes
                                            .find((row) => row.id === item.id)!
                                            .entries.find(
                                              (row) => row.id === entry.id,
                                            )!.checked = true;
                                          return current;
                                        },
                                      )
                                    }
                                  >
                                    Abgleichen
                                  </button>
                                ) : (
                                  "Offen"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm">
                      Fehlende Ergebnisse bleiben offen. Für die digitale
                      Eingabe oben „Station testen“ wählen.
                    </p>
                  </StitchCard>
                ))}
            </TabsContent>
            <TabsContent value="display" className="space-y-4 pt-4">
              <StitchCard className="space-y-4 p-5">
                <h2 className="stitch-headline text-xl">Anzeige & Hinweise</h2>
                <label className="grid gap-2 font-bold">
                  TV-Phase
                  <select
                    className={`${inputClass} max-w-xs`}
                    value={state.displayPhase}
                    onChange={(event) =>
                      update("TV-Phase geändert.", (current) => ({
                        ...current,
                        displayPhase: event.target.value as
                          "semifinal" | "final",
                      }))
                    }
                  >
                    <option value="semifinal">Halbfinale</option>
                    <option value="final">Finale</option>
                  </select>
                </label>
                <label className="grid gap-2 font-bold">
                  Hinweis für App und TV
                  <input
                    className={`${inputClass} max-w-2xl`}
                    value={noticeDraft}
                    onChange={(event) => setNoticeDraft(event.target.value)}
                    placeholder="Beispiel: Finale startet 15 Minuten später"
                  />
                </label>
                <div className="flex gap-2">
                  <StitchButton
                    disabled={!noticeDraft.trim()}
                    onClick={() => {
                      update(
                        "Hinweis auf App und TV veröffentlicht.",
                        (current) => ({
                          ...current,
                          notice: noticeDraft.trim(),
                        }),
                      );
                      setNoticeDraft("");
                    }}
                  >
                    Hinweis veröffentlichen
                  </StitchButton>
                  <StitchButton
                    variant="outline"
                    disabled={!state.notice}
                    onClick={() =>
                      update("Hinweis zurückgezogen.", (current) => ({
                        ...current,
                        notice: "",
                      }))
                    }
                  >
                    Zurückziehen
                  </StitchButton>
                </div>
                {state.notice && (
                  <p className="rounded-xl bg-[#a15523] p-4 font-bold text-white">
                    Aktueller Hinweis: {state.notice}
                  </p>
                )}
                <StitchButton variant="outline" onClick={() => setView("tv")}>
                  TV-Vorschau öffnen
                </StitchButton>
              </StitchCard>
            </TabsContent>
          </Tabs>
        )}
        <footer className="border-t border-[#003d55]/20 pt-4 text-sm">
          Nur lokale UX-Demo mit Testdaten.{" "}
          <Link className="underline" to="/">
            Zur normalen App
          </Link>
          . Die produktive Finalwertung wird erst nach Datenbankprobe und
          Freigabe aktiviert.
        </footer>
      </div>
      <style>{`@media print { button, footer, [role="tablist"], .rounded-xl.bg-amber-100 { display:none !important; } body { background:white !important; } }`}</style>
    </div>
  );
}
