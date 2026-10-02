import { Building2, ClipboardList, Flag, LayoutDashboard, Settings, Trophy, Users, type LucideIcon } from "lucide-react";
type NavItem = { to: string; label: string };
type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] };
const league = "/app/admin/league", gym = "/app/admin/gym";
export const adminNavigationGroups: Record<string, NavGroup[]> = {
  league_admin: [
    { id: "home", label: "Übersicht", icon: LayoutDashboard, items: [{ to: league, label: "Übersicht" }] },
    { id: "competition", label: "Wettkampftag", icon: Flag, items: [{ to: `${league}/wettkampf`, label: "Halbfinale & Finale" }, { to: `${league}/finale`, label: "Einlass & Anmeldungen" }] },
    { id: "people", label: "Teilnehmer", icon: Users, items: [{ to: `${league}/participants`, label: "Teilnehmerübersicht" }, { to: `${league}/change-requests`, label: "Änderungsanfragen" }] },
    { id: "season", label: "Saison & Wertung", icon: Trophy, items: [{ to: `${league}/season`, label: "Saison" }, { to: `${league}/classes`, label: "Wertungsklassen" }, { to: `${league}/stage-winners`, label: "Etappensieger" }, { to: `${league}/routes`, label: "Qualifikationsrouten" }, { to: `${league}/results`, label: "Qualifikationsergebnisse" }, { to: `${league}/route-feedback`, label: "Routenfeedback" }] },
    { id: "gyms", label: "Hallen", icon: Building2, items: [{ to: `${league}/gyms`, label: "Hallen" }] },
    { id: "settings", label: "Verwaltung", icon: Settings, items: [{ to: `${league}/codes`, label: "Teilnahmecodes" }, { to: `${league}/mastercodes`, label: "Mastercodes" }, { to: `${league}/settings`, label: "Einstellungen" }] },
  ],
  gym_admin: [
    { id: "home", label: "Meine Halle", icon: LayoutDashboard, items: [{ to: gym, label: "Meine Halle" }] },
    { id: "routes", label: "Halle & Routen", icon: Building2, items: [{ to: `${gym}/profile`, label: "Hallenprofil" }, { to: `${gym}/routes`, label: "Routen" }] },
    { id: "results", label: "Ergebnisse & Wertung", icon: ClipboardList, items: [{ to: `${gym}/results`, label: "Ergebnisse" }, { to: `${gym}/rankings`, label: "Rangliste" }, { to: `${gym}/stats`, label: "Statistiken" }] },
    { id: "access", label: "Zugänge", icon: Settings, items: [{ to: `${gym}/codes`, label: "Teilnahmecodes" }, { to: `${gym}/mastercodes`, label: "Mastercodes" }] },
  ],
};
export const matchesAdminPath = (pathname: string, to: string) => pathname === to || (![league, gym].includes(to) && pathname.startsWith(`${to}/`));
export function adminNavigationLocation(role: string | null, pathname: string) {
  const groups = adminNavigationGroups[role ?? ""] ?? [];
  const group = groups.find((entry) => entry.items.some((item) => matchesAdminPath(pathname, item.to)));
  return { group, item: group?.items.find((item) => matchesAdminPath(pathname, item.to)) };
}
