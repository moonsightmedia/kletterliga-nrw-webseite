import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { toast } from "@/components/ui/use-toast";
import {
  archiveProfile,
  getParticipantActivityStats,
  listGymAdmins,
  listGyms,
  listProfiles,
  restoreProfile,
  updateProfile,
} from "@/services/appApi";
import type { Gym, ParticipantActivityStats, Profile } from "@/services/appTypes";
import { Archive, Building2, Edit2, FilterX, MapPin, RotateCcw, Search, Shield, User, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

type ParticipantTab = "all" | "participants" | "gym_admins" | "league_admins";
type ActivityFilter = "all" | "with_results" | "without_results";
type SortMode = "name" | "activity" | "recent";
type AgeBucket = "u15" | "ue15" | "ue40" | "unknown";

type ParticipantListItem = {
  profile: Profile;
  tabGroup: Exclude<ParticipantTab, "all">;
  homeGym: Gym | null;
  homeGymName: string;
  homeCity: string;
  resultsCount: number;
  flashCount: number;
  flashRate: number;
  lastResultAt: string | null;
};

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("de-DE") : "—";

const getFullName = (profile: Profile) =>
  `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Unbekannt";

const getAgeAtToday = (birthDate: string | null | undefined) => {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

const getAgeBucket = (birthDate: string | null | undefined): AgeBucket => {
  const age = getAgeAtToday(birthDate);
  if (age === null) return "unknown";
  if (age <= 14) return "u15";
  if (age < 40) return "ue15";
  return "ue40";
};

const getTopEntries = (input: Map<string, number>, limit = 4) =>
  Array.from(input.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

const COLORS = {
  women: "hsl(var(--kl-secondary))",
  men: "hsl(var(--kl-primary))",
  unknown: "hsl(var(--muted-foreground))",
  toprope: "hsl(var(--kl-accent))",
  lead: "hsl(var(--kl-secondary))",
  hall: "hsl(var(--kl-primary))",
} as const;

const LeagueParticipants = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymAdminProfileIds, setGymAdminProfileIds] = useState<Set<string>>(new Set());
  const [activityByProfileId, setActivityByProfileId] = useState<Map<string, ParticipantActivityStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ParticipantTab>("all");
  const [selectedGymFilter, setSelectedGymFilter] = useState<string>("all");
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>("all");
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<ActivityFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Profile | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "participant" as Profile["role"],
    home_gym_id: "",
    birth_date: "",
    gender: "",
    league: "",
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [profilesResult, gymsResult, gymAdminsResult, statsResult] = await Promise.all([
        listProfiles({ includeArchived: true }),
        listGyms({ includeArchived: true }),
        listGymAdmins(),
        getParticipantActivityStats({ includeArchived: true }),
      ]);

      if (profilesResult.error || gymsResult.error || gymAdminsResult.error || statsResult.error) {
        toast({
          title: "Fehler beim Laden",
          description: "Teilnehmerdaten konnten nicht vollständig geladen werden.",
          variant: "destructive",
        });
      }

      setProfiles(profilesResult.data ?? []);
      setGyms(gymsResult.data ?? []);
      setGymAdminProfileIds(new Set((gymAdminsResult.data ?? []).map((entry) => entry.profile_id)));
      setActivityByProfileId(new Map((statsResult.data ?? []).map((row) => [row.profile_id, row])));
      setIsLoading(false);
    };

    void loadData();
  }, []);

  const activeGyms = useMemo(() => gyms.filter((gym) => !gym.archived_at), [gyms]);
  const gymById = useMemo(() => new Map(gyms.map((gym) => [gym.id, gym])), [gyms]);

  const participantRows = useMemo<ParticipantListItem[]>(() => {
    return profiles.map((profile) => {
      const isGymAdmin = profile.role === "gym_admin" || gymAdminProfileIds.has(profile.id);
      const tabGroup: Exclude<ParticipantTab, "all"> =
        profile.role === "league_admin" ? "league_admins" : isGymAdmin ? "gym_admins" : "participants";
      const homeGym = profile.home_gym_id ? gymById.get(profile.home_gym_id) ?? null : null;
      const activity = activityByProfileId.get(profile.id);
      const resultsCount = activity?.results_count ?? 0;
      const flashCount = activity?.flash_count ?? 0;

      return {
        profile,
        tabGroup,
        homeGym,
        homeGymName: homeGym?.name ?? "Keine Halle",
        homeCity: homeGym?.city?.trim() || "Unbekannt",
        resultsCount,
        flashCount,
        flashRate: resultsCount > 0 ? Math.round((flashCount / resultsCount) * 100) : 0,
        lastResultAt: activity?.last_result_at ?? null,
      };
    });
  }, [profiles, gymAdminProfileIds, gymById, activityByProfileId]);

  const cityOptions = useMemo(() => {
    const values = new Set(
      participantRows
        .map((entry) => entry.homeCity)
        .filter((city) => city !== "Unbekannt"),
    );
    return Array.from(values).sort((a, b) => a.localeCompare(b, "de-DE"));
  }, [participantRows]);

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (search.trim()) chips.push(`Suche: ${search.trim()}`);
    if (selectedGymFilter !== "all") {
      const gym = gyms.find((entry) => entry.id === selectedGymFilter);
      chips.push(`Halle: ${gym?.name ?? "Unbekannt"}`);
    }
    if (selectedCityFilter !== "all") chips.push(`Stadt: ${selectedCityFilter}`);
    if (selectedActivityFilter === "with_results") chips.push("Aktivität: Mit Ergebnissen");
    if (selectedActivityFilter === "without_results") chips.push("Aktivität: Ohne Ergebnisse");
    if (sortMode === "activity") chips.push("Sortierung: Aktivität");
    if (sortMode === "recent") chips.push("Sortierung: Letzte Aktivität");
    return chips;
  }, [gyms, search, selectedGymFilter, selectedCityFilter, selectedActivityFilter, sortMode]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = participantRows.filter((entry) => {
      if (activeTab !== "all" && entry.tabGroup !== activeTab) return false;
      if (selectedGymFilter !== "all" && entry.profile.home_gym_id !== selectedGymFilter) return false;
      if (selectedCityFilter !== "all" && entry.homeCity !== selectedCityFilter) return false;
      if (selectedActivityFilter === "with_results" && entry.resultsCount === 0) return false;
      if (selectedActivityFilter === "without_results" && entry.resultsCount > 0) return false;

      if (!query) return true;
      const name = getFullName(entry.profile).toLowerCase();
      const email = (entry.profile.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query) || entry.homeGymName.toLowerCase().includes(query);
    });

    return filtered.sort((left, right) => {
      if (sortMode === "activity") {
        if (right.resultsCount !== left.resultsCount) return right.resultsCount - left.resultsCount;
      }
      if (sortMode === "recent") {
        const leftDate = left.lastResultAt ? new Date(left.lastResultAt).getTime() : 0;
        const rightDate = right.lastResultAt ? new Date(right.lastResultAt).getTime() : 0;
        if (rightDate !== leftDate) return rightDate - leftDate;
      }
      return getFullName(left.profile).localeCompare(getFullName(right.profile), "de-DE");
    });
  }, [participantRows, search, activeTab, selectedGymFilter, selectedCityFilter, selectedActivityFilter, sortMode]);

  const activeRows = useMemo(() => filteredRows.filter((entry) => !entry.profile.archived_at), [filteredRows]);
  const archivedRows = useMemo(() => filteredRows.filter((entry) => Boolean(entry.profile.archived_at)), [filteredRows]);

  const dashboardRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return participantRows.filter((entry) => {
      if (entry.profile.archived_at) return false;
      if (entry.tabGroup !== "participants") return false;
      if (selectedGymFilter !== "all" && entry.profile.home_gym_id !== selectedGymFilter) return false;
      if (selectedCityFilter !== "all" && entry.homeCity !== selectedCityFilter) return false;
      if (selectedActivityFilter === "with_results" && entry.resultsCount === 0) return false;
      if (selectedActivityFilter === "without_results" && entry.resultsCount > 0) return false;
      if (!query) return true;
      const name = getFullName(entry.profile).toLowerCase();
      const email = (entry.profile.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query) || entry.homeGymName.toLowerCase().includes(query);
    });
  }, [participantRows, search, selectedGymFilter, selectedCityFilter, selectedActivityFilter]);

  const dashboard = useMemo(() => {
    const byCity = new Map<string, number>();
    const byGym = new Map<string, number>();
    const gender = { female: 0, male: 0 };
    const league = { toprope: 0, lead: 0, unknown: 0 };
    const ageBuckets = { u15: 0, ue15: 0, ue40: 0, unknown: 0 };
    const ageByGender = {
      u15: { female: 0, male: 0 },
      ue15: { female: 0, male: 0 },
      ue40: { female: 0, male: 0 },
      unknown: { female: 0, male: 0 },
    };

    dashboardRows.forEach((entry) => {
      const cityKey = !entry.profile.home_gym_id
        ? "Keine Halle"
        : !entry.homeGym
          ? "Halle unbekannt"
          : entry.homeGym.city?.trim()
            ? entry.homeGym.city.trim()
            : "Stadt unbekannt";
      byCity.set(cityKey, (byCity.get(cityKey) ?? 0) + 1);

      const gymKey = !entry.profile.home_gym_id
        ? "Keine Halle"
        : entry.homeGym?.name ?? "Halle unbekannt";
      byGym.set(gymKey, (byGym.get(gymKey) ?? 0) + 1);

      if (entry.profile.gender === "w") gender.female += 1;
      else if (entry.profile.gender === "m") gender.male += 1;

      if (entry.profile.league === "toprope") league.toprope += 1;
      else if (entry.profile.league === "lead") league.lead += 1;
      else league.unknown += 1;

      const bucket = getAgeBucket(entry.profile.birth_date);
      ageBuckets[bucket] += 1;
      if (entry.profile.gender === "w") ageByGender[bucket].female += 1;
      else if (entry.profile.gender === "m") ageByGender[bucket].male += 1;
    });

    return {
      total: dashboardRows.length,
      byCity: getTopEntries(byCity),
      byGym: getTopEntries(byGym),
      gender,
      league,
      ageBuckets,
      genderData: [
        { name: "Frauen", value: gender.female, fill: COLORS.women },
        { name: "Männer", value: gender.male, fill: COLORS.men },
      ],
      ageData: [
        {
          name: "U15",
          female: ageByGender.u15.female,
          male: ageByGender.u15.male,
          total: ageBuckets.u15,
        },
        {
          name: "Ü15",
          female: ageByGender.ue15.female,
          male: ageByGender.ue15.male,
          total: ageBuckets.ue15,
        },
        {
          name: "Ü40",
          female: ageByGender.ue40.female,
          male: ageByGender.ue40.male,
          total: ageBuckets.ue40,
        },
        {
          name: "Unbekannt",
          female: ageByGender.unknown.female,
          male: ageByGender.unknown.male,
          total: ageBuckets.unknown,
        },
      ],
      leagueData: [
        { name: "Toprope", value: league.toprope, fill: COLORS.toprope },
        { name: "Vorstieg", value: league.lead, fill: COLORS.lead },
        { name: "Unbekannt", value: league.unknown, fill: COLORS.unknown },
      ],
      gymData: getTopEntries(byGym, 6).map(([name, count]) => ({ name, count })),
    };
  }, [dashboardRows]);

  const handleUpdate = async (profileId: string, patch: Partial<Profile>) => {
    const { data, error } = await updateProfile(profileId, patch);
    if (error) {
      toast({
        title: "Fehler",
        description: error.message || "Profil konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
      return false;
    }
    if (data) {
      setProfiles((prev) => prev.map((profile) => (profile.id === data.id ? data : profile)));
      toast({ title: "Gespeichert", description: "Profil wurde aktualisiert." });
      return true;
    }
    return false;
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setEditForm({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      email: profile.email ?? "",
      role: profile.role ?? "participant",
      home_gym_id: profile.home_gym_id ?? "",
      birth_date: profile.birth_date ?? "",
      gender: profile.gender ?? "",
      league: profile.league ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProfile) return;
    const didSave = await handleUpdate(editingProfile.id, {
      first_name: editForm.first_name || null,
      last_name: editForm.last_name || null,
      email: editForm.email || null,
      role: editForm.role,
      home_gym_id: editForm.home_gym_id || null,
      birth_date: editForm.birth_date || null,
      gender: editForm.gender ? (editForm.gender as "m" | "w") : null,
      league: editForm.league ? (editForm.league as "toprope" | "lead") : null,
    });
    if (didSave) {
      setEditingProfile(null);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    const { data, error } = await archiveProfile(archiveTarget.id);
    if (error) {
      toast({
        title: "Fehler",
        description: error.message || "Profil konnte nicht archiviert werden.",
        variant: "destructive",
      });
      return;
    }
    if (data) {
      setProfiles((prev) => prev.map((profile) => (profile.id === data.id ? data : profile)));
      toast({ title: "Archiviert", description: "Das Profil wurde sicher archiviert." });
    }
    setArchiveTarget(null);
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    const { data, error } = await restoreProfile(restoreTarget.id);
    if (error) {
      toast({
        title: "Fehler",
        description: error.message || "Profil konnte nicht wiederhergestellt werden.",
        variant: "destructive",
      });
      return;
    }
    if (data) {
      setProfiles((prev) => prev.map((profile) => (profile.id === data.id ? data : profile)));
      toast({ title: "Wiederhergestellt", description: "Das Profil ist wieder aktiv." });
    }
    setRestoreTarget(null);
  };

  const getRoleBadge = (item: ParticipantListItem) => {
    if (item.tabGroup === "league_admins") {
      return (
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 border-purple-500/20">
          Liga-Admin
        </Badge>
      );
    }
    if (item.tabGroup === "gym_admins") {
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
          Hallen-Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
        Teilnehmer
      </Badge>
    );
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedGymFilter("all");
    setSelectedCityFilter("all");
    setSelectedActivityFilter("all");
    setSortMode("name");
  };

  const renderProfileCard = (item: ParticipantListItem, archived: boolean) => {
    const { profile } = item;
    return (
      <Card
        key={profile.id}
        className="p-4 md:p-5 border-2 border-border/60 hover:border-primary/50 transition-all hover:shadow-lg space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <div className="font-semibold text-primary text-base md:text-lg break-words">{getFullName(profile)}</div>
              {getRoleBadge(item)}
              {archived ? <Badge variant="outline">Archiviert</Badge> : null}
            </div>
            <div className="text-sm text-muted-foreground break-words">{profile.email ?? "-"}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {item.homeGymName} · {item.homeCity}
                {item.homeGym?.archived_at ? " (Halle archiviert)" : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!archived ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(profile)}
                  className="h-9 w-9 p-0 touch-manipulation"
                  aria-label={`Profil von ${profile.email ?? profile.id} bearbeiten`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setArchiveTarget(profile)}
                  className="h-9 w-9 p-0 text-amber-700 hover:text-amber-700 hover:bg-amber-500/10 touch-manipulation"
                  aria-label={`Profil von ${profile.email ?? profile.id} archivieren`}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRestoreTarget(profile)}
                className="h-9 gap-2 px-3 touch-manipulation"
                aria-label={`Profil von ${profile.email ?? profile.id} wiederherstellen`}
              >
                <RotateCcw className="h-4 w-4" />
                Restore
              </Button>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Ergebnisse:</span>{" "}
            <span className="font-medium">{item.resultsCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Flash-Quote:</span>{" "}
            <span className="font-medium">{item.resultsCount > 0 ? `${item.flashRate}%` : "—"}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Letzte Aktivität:</span>{" "}
            <span className="font-medium">{formatDate(item.lastResultAt)}</span>
          </div>
          {profile.birth_date ? (
            <div>
              <span className="text-muted-foreground">Geburtsdatum:</span>{" "}
              <span className="font-medium">{formatDate(profile.birth_date)}</span>
            </div>
          ) : null}
          {profile.gender ? (
            <div>
              <span className="text-muted-foreground">Geschlecht:</span>{" "}
              <span className="font-medium">{profile.gender === "m" ? "Männlich" : "Weiblich"}</span>
            </div>
          ) : null}
          {profile.league ? (
            <div className="col-span-2">
              <span className="text-muted-foreground">Liga:</span>{" "}
              <span className="font-medium">{profile.league === "toprope" ? "Toprope" : "Vorstieg"}</span>
            </div>
          ) : null}
          {archived ? (
            <>
              <div className="col-span-2">
                <span className="text-muted-foreground">Archiviert am:</span>{" "}
                <span className="font-medium">{formatDate(profile.archived_at)}</span>
              </div>
              {profile.archive_reason ? (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Grund:</span>{" "}
                  <span className="font-medium">{profile.archive_reason}</span>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/90 shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              backgroundRepeat: "repeat",
            }}
          />
        </div>
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center flex-shrink-0">
              <Users className="h-6 w-6 md:h-8 md:w-8 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-white break-words">Teilnehmerverwaltung</h1>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs flex-shrink-0">
                  Liga
                </Badge>
              </div>
              <p className="text-white/90 text-xs md:text-sm lg:text-base break-words">
                {profiles.filter((profile) => !profile.archived_at).length} aktive Personen ·{" "}
                {profiles.filter((profile) => profile.archived_at).length} archiviert
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 md:p-6 border-2 border-[#f2dcab]/60 bg-gradient-to-br from-[#fffdf9] via-[#fff8ec] to-[#f9f3e8]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-primary">Teilnehmer-Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Verteilungen basierend auf der aktuell gefilterten aktiven Ansicht.
            </p>
          </div>
          <Badge variant="outline" className="text-sm border-[#003d55]/20 text-[#003d55]">
            {dashboard.total} aktive Personen
          </Badge>
        </div>

        <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4 mb-4">
          <Card className="p-3 border border-[#f2dcab]/70 bg-white/95">
            <div className="text-xs text-[rgba(0,38,55,0.56)] uppercase tracking-wide">
              <span className="inline-flex h-4 w-4 items-center justify-center text-sm leading-none" style={{ color: COLORS.women }} aria-label="Weiblich">♀</span>
            </div>
            <div className="text-2xl font-headline mt-1" style={{ color: COLORS.women }}>{dashboard.gender.female}</div>
          </Card>
          <Card className="p-3 border border-[#f2dcab]/70 bg-white/95">
            <div className="text-xs text-[rgba(0,38,55,0.56)] uppercase tracking-wide">
              <span className="inline-flex h-4 w-4 items-center justify-center text-sm leading-none" style={{ color: COLORS.men }} aria-label="Männlich">♂</span>
            </div>
            <div className="text-2xl font-headline mt-1" style={{ color: COLORS.men }}>{dashboard.gender.male}</div>
          </Card>
          <Card className="p-3 border border-[#f2dcab]/70 bg-white/95">
            <div className="text-xs text-[rgba(0,38,55,0.56)] uppercase tracking-wide">Toprope</div>
            <div className="text-2xl font-headline mt-1" style={{ color: COLORS.toprope }}>{dashboard.league.toprope}</div>
          </Card>
          <Card className="p-3 border border-[#f2dcab]/70 bg-white/95">
            <div className="text-xs text-[rgba(0,38,55,0.56)] uppercase tracking-wide">Vorstieg</div>
            <div className="text-2xl font-headline mt-1" style={{ color: COLORS.lead }}>{dashboard.league.lead}</div>
          </Card>
        </div>

        <div className="grid gap-3 md:gap-4 grid-cols-1 xl:grid-cols-2">
          <Card className="p-4 border border-[#f2dcab]/70 bg-white/95">
            <div className="text-sm font-semibold mb-3">Geschlechterverteilung</div>
            <ChartContainer
              config={{
                value: { label: "Teilnehmer", color: COLORS.women },
              }}
              className="h-[240px] w-full aspect-auto"
            >
              <PieChart>
                <Pie data={dashboard.genderData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                  {dashboard.genderData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </Card>

          <Card className="p-4 border border-[#f2dcab]/70 bg-white/95">
            <div className="text-sm font-semibold mb-3">Altersklassenverteilung nach Geschlecht</div>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className="text-xs border-[rgba(161,85,35,0.35)] bg-[rgba(161,85,35,0.08)]">
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-xs leading-none" style={{ color: COLORS.women }} aria-label="Weiblich">♀</span>
              </Badge>
              <Badge variant="outline" className="text-xs border-[rgba(0,61,85,0.35)] bg-[rgba(0,61,85,0.08)]">
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-xs leading-none" style={{ color: COLORS.men }} aria-label="Männlich">♂</span>
              </Badge>
            </div>
            <ChartContainer
              config={{
                female: { label: "Frauen", color: COLORS.women },
                male: { label: "Männer", color: COLORS.men },
              }}
              className="h-[240px] w-full aspect-auto"
            >
              <BarChart data={dashboard.ageData} margin={{ left: 4, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="female" stackId="gender" fill="var(--color-female)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="male" stackId="gender" fill="var(--color-male)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </Card>

          <Card className="p-4 border border-[#f2dcab]/70 bg-white/95">
            <div className="text-sm font-semibold mb-3">Ligaverteilung</div>
            <ChartContainer
              config={{
                value: { label: "Teilnehmer", color: COLORS.toprope },
              }}
              className="h-[240px] w-full aspect-auto"
            >
              <BarChart data={dashboard.leagueData} margin={{ left: 4, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {dashboard.leagueData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </Card>

          <Card className="p-4 border border-[#f2dcab]/70 bg-white/95">
            <div className="text-sm font-semibold mb-3">Heimathallen</div>
            <ChartContainer
              config={{
                count: { label: "Teilnehmer", color: COLORS.hall },
              }}
              className="h-[240px] w-full aspect-auto"
            >
              <BarChart data={dashboard.gymData} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground mt-2">
              "Keine Halle" bedeutet: Profil ohne Heimathalle. "Halle unbekannt" bedeutet: Heimathallen-Zuordnung zeigt auf keinen Hallendatensatz.
            </p>
          </Card>
        </div>
      </Card>

      <Card className="p-4 md:p-6 border-2 border-border/60 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary flex-shrink-0" />
          <Label htmlFor="search" className="text-sm md:text-base font-semibold">
            Suche & Filter
          </Label>
        </div>

        <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <Input
            id="search"
            placeholder="Name, E-Mail oder Halle"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="touch-manipulation"
          />

          <Select value={selectedGymFilter} onValueChange={setSelectedGymFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Halle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Hallen</SelectItem>
              {activeGyms.map((gym) => (
                <SelectItem key={gym.id} value={gym.id}>
                  {gym.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCityFilter} onValueChange={setSelectedCityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Stadt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Städte</SelectItem>
              {cityOptions.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Select value={selectedActivityFilter} onValueChange={(value) => setSelectedActivityFilter(value as ActivityFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Aktivität" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Aktivitätslevel</SelectItem>
                <SelectItem value="with_results">Mit Ergebnissen</SelectItem>
                <SelectItem value="without_results">Ohne Ergebnisse</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={resetFilters} className="px-3" aria-label="Filter zurücksetzen">
              <FilterX className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Sortierung:</span>
          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="activity">Aktivität (meiste Ergebnisse)</SelectItem>
              <SelectItem value="recent">Letzte Aktivität</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {activeFilterChips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeFilterChips.map((chip) => (
              <Badge key={chip} variant="outline">
                {chip}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Keine aktiven Zusatzfilter.</p>
        )}
      </Card>

      <Card className="p-4 md:p-6 border-2 border-border/60">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ParticipantTab)}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 md:gap-0 h-auto p-1.5 md:p-1">
            <TabsTrigger value="all" className="flex items-center justify-center gap-2 text-xs md:text-sm px-3 py-3 md:py-1.5 min-h-[48px] md:min-h-0">
              <Users className="h-4 w-4" />
              <span>Alle</span>
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center justify-center gap-2 text-xs md:text-sm px-3 py-3 md:py-1.5 min-h-[48px] md:min-h-0">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Teilnehmer</span>
              <span className="sm:hidden">TN</span>
            </TabsTrigger>
            <TabsTrigger value="gym_admins" className="flex items-center justify-center gap-2 text-xs md:text-sm px-3 py-3 md:py-1.5 min-h-[48px] md:min-h-0">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Hallen-Admins</span>
              <span className="sm:hidden">Hallen</span>
            </TabsTrigger>
            <TabsTrigger value="league_admins" className="flex items-center justify-center gap-2 text-xs md:text-sm px-3 py-3 md:py-1.5 min-h-[48px] md:min-h-0">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Liga-Admins</span>
              <span className="sm:hidden">Liga</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Aktive Personen ({activeRows.length})</h2>
        </div>
        {isLoading ? (
          <Card className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">Teilnehmerdaten werden geladen ...</p>
          </Card>
        ) : activeRows.length > 0 ? (
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
            {activeRows.map((item) => renderProfileCard(item, false))}
          </div>
        ) : (
          <Card className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">
              {search || activeFilterChips.length > 0
                ? "Keine aktiven Personen mit den aktuellen Filtern gefunden."
                : "Keine aktiven Personen in dieser Kategorie."}
            </p>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Archiv ({archivedRows.length})</h2>
        </div>
        {archivedRows.length > 0 ? (
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
            {archivedRows.map((item) => renderProfileCard(item, true))}
          </div>
        ) : (
          <Card className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">Keine archivierten Personen für diese Ansicht.</p>
          </Card>
        )}
      </div>

      <Dialog open={editingProfile !== null} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profil bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 pb-5 pt-4 sm:px-0 sm:pb-0">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">Vorname</Label>
                <Input
                  id="edit-first-name"
                  value={editForm.first_name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, first_name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Nachname</Label>
                <Input
                  id="edit-last-name"
                  value={editForm.last_name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, last_name: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-email">E-Mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Rolle</Label>
                <select
                  id="edit-role"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.role ?? "participant"}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value as Profile["role"] }))}
                >
                  <option value="participant">Teilnehmer</option>
                  <option value="gym_admin">Gym-Admin</option>
                  <option value="league_admin">Liga-Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-home-gym">Heimat-Halle</Label>
                <select
                  id="edit-home-gym"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.home_gym_id}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, home_gym_id: event.target.value }))}
                >
                  <option value="">Keine Halle</option>
                  {activeGyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-birth-date">Geburtsdatum</Label>
                <Input
                  id="edit-birth-date"
                  type="date"
                  value={editForm.birth_date}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, birth_date: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gender">Geschlecht</Label>
                <select
                  id="edit-gender"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.gender}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, gender: event.target.value }))}
                >
                  <option value="">Nicht angegeben</option>
                  <option value="m">Männlich</option>
                  <option value="w">Weiblich</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-league">Liga</Label>
                <select
                  id="edit-league"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.league}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, league: event.target.value }))}
                >
                  <option value="">Nicht angegeben</option>
                  <option value="toprope">Toprope</option>
                  <option value="lead">Vorstieg</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 px-5 pb-5 sm:flex-row sm:px-0 sm:pb-0">
            <Button variant="outline" onClick={() => setEditingProfile(null)} className="w-full sm:w-auto">
              Abbrechen
            </Button>
            <Button onClick={handleSaveEdit} className="w-full sm:w-auto">
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Profil archivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Profil von {archiveTarget?.first_name} {archiveTarget?.last_name} wird aus allen aktiven Ansichten entfernt.
              Ergebnisse bleiben erhalten und das Konto kann später wiederhergestellt werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700">
              Archivieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreTarget !== null} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Profil wiederherstellen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Profil von {restoreTarget?.first_name} {restoreTarget?.last_name} wird wieder in aktive Ansichten aufgenommen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="w-full sm:w-auto">
              Wiederherstellen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeagueParticipants;
