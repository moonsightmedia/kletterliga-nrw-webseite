import { useEffect, useState } from "react";
import { Building2, Users, CheckCircle2, BarChart3, Ticket } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGymAdminsByProfile, listGymCodesByGym, listRoutesByGym, getGym, listProfiles, listResults } from "@/services/appApi";
import type { Gym } from "@/services/appTypes";
import { StitchBadge, StitchCard } from "@/app/components/StitchPrimitives";
import { AdminStatCard } from "@/app/pages/admin/_components/AdminStatCard";

const GymAdminDashboard = () => {
  const { profile } = useAuth();
  const [gymId, setGymId] = useState<string | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    redeemedCodes: 0,
    totalResults: 0,
    availableCodes: 0,
  });

  useEffect(() => {
    if (!profile?.id) return;
    listGymAdminsByProfile(profile.id).then(({ data }) => {
      const firstGym = data?.[0]?.gym_id ?? null;
      setGymId(firstGym);
      if (firstGym) {
        getGym(firstGym).then(({ data: gymData }) => {
          if (gymData) {
            setGym(gymData);
          }
        });
        listGymCodesByGym(firstGym).then(({ data: codesData }) => {
          const codes = codesData ?? [];
          const redeemed = codes.filter((c) => c.redeemed_by).length;
          setStats((prev) => ({
            ...prev,
            redeemedCodes: redeemed,
            availableCodes: codes.length - redeemed,
          }));
        });
        listProfiles().then(({ data: profilesData }) => {
          const totalParticipants = (profilesData ?? []).filter((p) => p.role === "participant").length;
          setStats((prev) => ({
            ...prev,
            totalParticipants,
          }));
        });
        Promise.all([listRoutesByGym(firstGym), listResults()]).then(([{ data: routesData }, { data: resultsData }]) => {
          const routes = routesData ?? [];
          const results = resultsData ?? [];
          const routeIds = routes.map((r) => r.id);
          const gymResults = results.filter((r) => routeIds.includes(r.route_id));
          setStats((prev) => ({
            ...prev,
            totalResults: gymResults.length,
          }));
        });
      }
    });
  }, [profile?.id]);

  if (!gymId) {
    return (
      <p className="text-sm text-[rgba(27,28,26,0.64)]">
        Keine Halle zugewiesen. Bitte kontaktiere einen Liga-Admin.
      </p>
    );
  }

  const participantPercentage =
    stats.totalParticipants > 0 ? Math.round((stats.redeemedCodes / stats.totalParticipants) * 100) : 0;

  return (
    <div className="space-y-6">
      <StitchCard tone="navy" className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
            <div className="flex items-center gap-3 md:gap-4">
              {gym?.logo_url ? (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-[rgba(242,220,171,0.25)] bg-white/10 md:h-16 md:w-16">
                  <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[rgba(242,220,171,0.25)] bg-white/10 md:h-16 md:w-16">
                  <Building2 className="h-6 w-6 text-[#f2dcab]/85 md:h-8 md:w-8" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="stitch-headline text-xl text-[#f2dcab] md:text-2xl lg:text-3xl">Übersicht</h1>
                  <StitchBadge tone="cream" className="shrink-0">
                    Halle
                  </StitchBadge>
                </div>
                <p className="text-sm text-[rgba(242,220,171,0.88)] md:text-base">
                  {gym?.name || "Meine Halle"}
                  {gym?.city && ` · ${gym.city}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </StitchCard>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <AdminStatCard
          icon={Users}
          label="Gesamtteilnehmer"
          value={stats.totalParticipants}
          hint="In der Liga registriert"
        />
        <AdminStatCard
          icon={CheckCircle2}
          label="Codes eingelöst"
          value={stats.redeemedCodes}
          hint={
            stats.totalParticipants > 0 ? `${participantPercentage}% der Teilnehmer` : "Noch keine Teilnehmer"
          }
          iconWrapClassName="bg-[#a15523]/15 group-hover:bg-[#a15523]/22"
          iconClassName="text-[#a15523]"
          valueClassName="stitch-metric text-3xl text-[#a15523]"
        />
        <AdminStatCard
          icon={BarChart3}
          label="Ergebnisse gesamt"
          value={stats.totalResults}
          hint="In dieser Halle"
          iconWrapClassName="bg-[#f2dcab]/25 group-hover:bg-[#f2dcab]/35"
          iconClassName="text-[#002637]"
          valueClassName="stitch-metric text-3xl text-[#002637]"
        />
        <AdminStatCard
          icon={Ticket}
          label="Codes verfügbar"
          value={stats.availableCodes}
          hint="Noch nicht eingelöst"
        />
      </div>
    </div>
  );
};

export default GymAdminDashboard;
