import { useEffect, useState } from "react";
import { Users, Building2, BarChart3, Flag, TicketPercent } from "lucide-react";
import { listAdminSettings, listProfiles, listGyms, listResults, listRoutes, listPartnerVoucherRedemptions } from "@/services/appApi";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";
import { AdminStatCard } from "@/app/pages/admin/_components/AdminStatCard";

const PARTNER_VOUCHER_SLUG = "kletterladen_nrw";

const LeagueDashboard = () => {
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalGyms: 0,
    totalResults: 0,
    totalRoutes: 0,
    totalPartnerVoucherRedemptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listProfiles(), listGyms(), listResults(), listRoutes(), listAdminSettings()])
      .then(async ([profilesResult, gymsResult, resultsResult, routesResult, adminSettingsResult]) => {
        const participants = (profilesResult.data ?? []).filter((p) => p.role === "participant").length;
        const gyms = (gymsResult.data ?? []).length;
        const results = (resultsResult.data ?? []).length;
        const activeRoutes = (routesResult.data ?? []).filter((r) => r.active === true).length;
        const seasonYear = adminSettingsResult.data?.[0]?.season_year?.trim() || String(new Date().getFullYear());
        const redemptionsResult = await listPartnerVoucherRedemptions({
          partnerSlug: PARTNER_VOUCHER_SLUG,
          seasonYear,
        });
        const totalPartnerVoucherRedemptions = (redemptionsResult.data ?? []).length;

        setStats({
          totalParticipants: participants,
          totalGyms: gyms,
          totalResults: results,
          totalRoutes: activeRoutes,
          totalPartnerVoucherRedemptions,
        });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Liga"
          title="Liga-Übersicht"
          description="Globale Kennzahlen der Saison."
        />
        <p className="text-sm text-[rgba(27,28,26,0.64)]">Lade Statistiken…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Liga"
        title="Liga-Verwaltung"
        description="Detaillierte Übersicht und Verwaltung der Liga."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <AdminStatCard
          icon={Users}
          label="Teilnehmer"
          value={stats.totalParticipants}
          hint="Gesamt registriert"
        />
        <AdminStatCard
          icon={Building2}
          label="Hallen"
          value={stats.totalGyms}
          hint="Aktive Partnerhallen"
          iconWrapClassName="bg-[#003d55]/10 group-hover:bg-[#003d55]/16"
          iconClassName="text-[#003d55]"
          valueClassName="stitch-metric text-3xl text-[#003d55]"
        />
        <AdminStatCard
          icon={BarChart3}
          label="Ergebnisse"
          value={stats.totalResults}
          hint="Einträge gesamt"
          iconWrapClassName="bg-emerald-600/12 group-hover:bg-emerald-600/18"
          iconClassName="text-emerald-700"
          valueClassName="stitch-metric text-3xl text-emerald-700"
        />
        <AdminStatCard
          icon={Flag}
          label="Routen"
          value={stats.totalRoutes}
          hint="Aktive Routen"
          iconWrapClassName="bg-[#a15523]/12 group-hover:bg-[#a15523]/18"
          iconClassName="text-[#a15523]"
          valueClassName="stitch-metric text-3xl text-[#a15523]"
        />
        <AdminStatCard
          icon={TicketPercent}
          label="Partnergutscheine"
          value={stats.totalPartnerVoucherRedemptions}
          hint="Kletterladen NRW (Saison)"
          iconWrapClassName="bg-amber-500/12 group-hover:bg-amber-500/18"
          iconClassName="text-amber-700"
          valueClassName="stitch-metric text-3xl text-amber-700"
        />
      </div>
    </div>
  );
};

export default LeagueDashboard;
