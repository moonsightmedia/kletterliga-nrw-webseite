import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  RotateCcw,
  ArrowLeft,
  Monitor,
  ClipboardList,
  Medal,
} from "lucide-react";
import { CompetitionCenterContent } from "@/app/pages/admin/CompetitionCenter";
import { CompetitionPrintContent } from "@/app/pages/admin/CompetitionPrint";
import { FinalStationContent } from "@/app/pages/competition/FinalStation";
import CompetitionLiveView from "@/app/components/CompetitionLiveView";
import CompetitionRankingsView from "@/app/components/CompetitionRankingsView";
import { CompetitionNoticeList } from "@/app/components/CompetitionLiveBanner";
import { activeNotices } from "@/lib/competitionPresentation";
import { StitchButton } from "@/app/components/StitchPrimitives";
import {
  demoFinalClasses,
  demoLiveData,
  demoSemifinalRows,
  demoSource,
  demoStationCode,
  resetCompetitionDemo,
  startSemifinalDemo,
  closeSemifinalDemoDeadline,
  useCompetitionDemo,
} from "@/lib/competitionDemoSource";

const root = "/demo/finaltag";
export default function CompetitionDemo() {
  const location = useLocation();
  const navigate = useNavigate();
  const [resetVersion, setResetVersion] = useState(0);
  const [params] = useSearchParams();
  const value = useCompetitionDemo();
  const [lastRefresh, setLastRefresh] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setLastRefresh(new Date()), 5000);
    return () => window.clearInterval(timer);
  }, []);
  const view =
    params.get("ansicht") ?? location.pathname.slice(root.length + 1);
  if (view === "tv")
    return (
      <CompetitionLiveView
        data={demoLiveData(value)}
        season="2026"
        lastSuccess={lastRefresh}
        demo
      />
    );
  if (view === "druck")
    return (
      <CompetitionPrintContent
        season="2026"
        load={demoSource.getFinalAdmin}
        backHref={root}
        demo
      />
    );
  return (
    <div className="stitch-app min-h-screen bg-[#f5f1e7] p-4 text-[#003d55] sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#003d55]/15 pb-4">
          <p className="text-xs leading-5">
            <strong className="text-[#a15523]">Testbetrieb</strong> · Erfundene
            Teilnehmer · dieselben Ansichten wie in der App · Speicherung nur in
            diesem Browser
          </p>
          <button
            className="flex min-h-10 items-center gap-2 text-xs font-bold underline underline-offset-4"
            onClick={() => {
              resetCompetitionDemo();
              setResetVersion((version) => version + 1);
              navigate(root);
            }}
          >
            <RotateCcw size={14} />
            Testdaten zurücksetzen
          </button>
          <StitchButton
            size="sm"
            variant="outline"
            onClick={() => {
              startSemifinalDemo();
              setResetVersion((version) => version + 1);
              navigate(`${root}?ansicht=halbfinale`);
            }}
          >
            Halbfinale ausprobieren
          </StitchButton>
          {view === "halbfinale" && (
            <StitchButton
              size="sm"
              variant="outline"
              disabled={value.admin.phase !== "open"}
              onClick={() => {
                closeSemifinalDemoDeadline();
                setResetVersion((version) => version + 1);
              }}
            >
              16-Uhr-Sperre testen
            </StitchButton>
          )}
        </div>
        <nav aria-label="Testansichten" className="flex flex-wrap gap-2">
          {view && (
            <StitchButton asChild variant="outline" size="sm">
              <Link to={root}>
                <ArrowLeft size={14} />
                Renés Zentrale
              </Link>
            </StitchButton>
          )}
          {view !== "station" && (
            <StitchButton asChild variant="outline" size="sm">
              <Link to={`${root}/station`}>
                <ClipboardList size={14} />
                Zeitnahme testen
              </Link>
            </StitchButton>
          )}
          {view !== "rangliste" && (
            <StitchButton asChild variant="outline" size="sm">
              <Link to={`${root}/rangliste`}>
                <Medal size={14} />
                Teilnehmer-Rangliste
              </Link>
            </StitchButton>
          )}
          <StitchButton asChild variant="outline" size="sm">
            <Link target="_blank" to={`${root}/tv`}>
              <Monitor size={14} />
              TV in neuem Tab
            </Link>
          </StitchButton>
        </nav>
        {view === "station" ? (
          <>
            <div className="rounded-xl border border-[#003d55]/15 bg-white p-4 text-sm leading-6">
              <strong>Probedurchlauf:</strong> In Renés Zentrale zuerst die
              Vorstieg-Klasse U18 starten. Hier Station 1 und den Testcode{" "}
              <span className="break-all font-mono font-bold">
                {demoStationCode}
              </span>{" "}
              verwenden. Nach dem Ersetzen eines Stationscodes gilt der neu
              erzeugte Code aus der Zentrale.
            </div>
            <FinalStationContent
              season="2026"
              source={demoSource}
              storagePrefix="kletterliga:demo"
              backHref={root}
            />
          </>
        ) : view === "rangliste" ? (
          <div className="mx-auto max-w-4xl">
            <div className="mb-5">
              <CompetitionNoticeList
                notices={activeNotices(
                  value.admin.notices,
                  "app",
                  lastRefresh.getTime(),
                )}
              />
            </div>
            <header className="mb-5 rounded-xl bg-[#003d55] p-6 text-[#f2dcab]">
              <p className="stitch-kicker text-[#d58a4c]">Teilnehmeransicht</p>
              <h1 className="stitch-headline mt-2 text-3xl">Ranglisten</h1>
            </header>
            <CompetitionRankingsView
              semifinal={demoSemifinalRows(value.admin)}
              finals={demoFinalClasses(value.admin)}
              updated={new Date(value.changed)}
            />
          </div>
        ) : (
          <CompetitionCenterContent
            key={resetVersion}
            season="2026"
            source={demoSource}
            demo
            initialTab={
              view === "halbfinale"
                ? "semifinal"
                : (params.get("reiter") ?? "overview")
            }
            tvHref={`${root}/tv`}
            printHref={`${root}/druck`}
            stationHref={`${root}/station`}
            semifinalConfiguration={
              <p className="text-sm">
                Die Demo beginnt mit geschlossener Halbfinaleingabe. Die
                eigentliche Routen- und Halbfinalkonfiguration bleibt im
                produktiven Adminbereich.
              </p>
            }
          />
        )}
      </div>
    </div>
  );
}
