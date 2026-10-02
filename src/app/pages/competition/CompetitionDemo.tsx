import { useEffect, useState } from "react";
import { AdminShell } from "@/app/layouts/AdminLayout";
import LeagueCompetition from "@/app/pages/admin/LeagueCompetition";
import { AttendanceDesk } from "@/app/components/AttendanceDesk";
import CompetitionParticipantPreview from "@/app/pages/competition/CompetitionParticipantPreview";
import { demoAttendanceSource, resetAttendanceDemo } from "@/lib/attendanceDemoSource";
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
import { competitionTvDemo } from "@/lib/competitionTvDemo";
import { StitchButton } from "@/app/components/StitchPrimitives";
import {
  demoFinalClasses,
  demoLiveData,
  demoSemifinalRows,
  demoSource,
  demoConfigurationSource,
  prepareCompetitionDemo,
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
  if (view === "teilnehmer") return <CompetitionParticipantPreview />;
  if (view === "tv")
    return (
      <CompetitionLiveView
        data={params.get("belastung") === "1" ? competitionTvDemo(params.get("phase") === "final", params.get("hinweis") === "vollbild", params.get("lang") === "1") : demoLiveData(value)}
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
  const content = (
    <div className="stitch-app min-h-screen bg-[#f4f3ee] text-[#003d55]">
      <div
        className={`mx-auto space-y-5 ${view === "station" ? "max-w-md" : "max-w-7xl"}`}
      >
        <details className="border-b border-[#003d55]/15 pb-2">
          <summary className="cursor-pointer py-2 text-xs text-[#003d55]/70">
            Demo · erfundene Teilnehmer{" "}
            <span className="ml-2 underline underline-offset-4">
              Demo-Optionen
            </span>
          </summary>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 pt-2">
            <p className="text-xs leading-5">
              <strong className="text-[#a15523]">Testbetrieb</strong> ·
              Erfundene Teilnehmer · dieselben Ansichten wie in der App ·
              Speicherung nur in diesem Browser
            </p>
            <button
              className="flex min-h-10 items-center gap-2 text-xs font-bold underline underline-offset-4"
              onClick={() => {
                resetCompetitionDemo();
                resetAttendanceDemo();
                setResetVersion((version) => version + 1);
                navigate(root);
              }}
            >
              <RotateCcw size={14} />
              Testdaten zurücksetzen
            </button>
            <StitchButton size="sm" variant="outline" onClick={() => { prepareCompetitionDemo(); setResetVersion(version => version + 1); navigate(`${root}?bereich=setup`); }}>Vorbereitung ausprobieren</StitchButton>
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
            {view !== "einlass" && <StitchButton asChild variant="outline" size="sm"><Link to={`${root}/einlass`}>Einlass ausprobieren</Link></StitchButton>}
            {view && (
              <StitchButton asChild variant="outline" size="sm">
                <Link to={root}>
                  <ArrowLeft size={14} />
                  Renés Zentrale
                </Link>
              </StitchButton>
            )}
            {view !== "station" && view !== "halbfinale" && (
              <StitchButton asChild variant="outline" size="sm">
                <Link to={`${root}/station`}>
                  <ClipboardList size={14} />
                  Finaleingabe öffnen
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
          {view === "station" && (
            <p className="mt-3 break-words text-sm leading-6">
              Demo-Finalpasswort:{" "}
              <span className="break-all font-mono">{demoStationCode}</span>.
              Beide Handys verwenden denselben Zugang. Eine laufende Klasse ist
              direkt bedienbar; weitere Klassen startet René in der Zentrale.
            </p>
          )}
        </details>
        {view === "einlass" ? <><header><h1 className="text-2xl font-semibold">Einlass & Anmeldungen</h1></header><AttendanceDesk season="2026" source={demoAttendanceSource} /></> : view === "station" ? (
          <FinalStationContent
            season="2026"
            source={demoSource}
            storagePrefix="kletterliga:demo"
            backHref={root}
          />
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
            <header className="mb-5 border-b border-[#003d55]/15 pb-4 text-[#003d55]">
              <p className="text-xs text-[#003d55]/70">Teilnehmeransicht</p>
              <h1 className="[font-family:inherit] text-2xl font-bold tracking-normal">
                Ranglisten
              </h1>
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
            semifinalConfiguration={<LeagueCompetition seasonOverride="2026" source={demoConfigurationSource} section={params.get("einrichtung") === "access" ? "access" : "routes"} />}
            certificateConfiguration={<LeagueCompetition seasonOverride="2026" source={demoConfigurationSource} section="certificates" />}
          />
        )}
      </div>
    </div>
  );
  return view === "station" || view === "rangliste" ? content : <AdminShell role="league_admin" previewPath="/app/admin/league/wettkampf">{content}</AdminShell>;
}
