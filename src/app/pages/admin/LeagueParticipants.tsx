import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { listGyms, listProfiles, updateProfile } from "@/services/appApi";
import type { Gym, Profile } from "@/services/appTypes";
import { Users, Search, Edit2, Shield, Building2, User } from "lucide-react";

const LeagueParticipants = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "participants" | "gym_admins" | "league_admins">("all");
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
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
    listProfiles().then(({ data }) => setProfiles(data ?? []));
    listGyms().then(({ data }) => setGyms(data ?? []));
  }, []);

  // Gruppiere Profile nach Rollen
  const groupedProfiles = useMemo(() => {
    const participants = profiles.filter((p) => p.role === "participant");
    const gymAdmins = profiles.filter((p) => p.role === "gym_admin");
    const leagueAdmins = profiles.filter((p) => p.role === "league_admin");
    return { participants, gymAdmins, leagueAdmins };
  }, [profiles]);

  // Gefilterte Profile basierend auf Tab und Suche
  const filtered = useMemo(() => {
    let baseProfiles: Profile[] = [];
    switch (activeTab) {
      case "participants":
        baseProfiles = groupedProfiles.participants;
        break;
      case "gym_admins":
        baseProfiles = groupedProfiles.gymAdmins;
        break;
      case "league_admins":
        baseProfiles = groupedProfiles.leagueAdmins;
        break;
      default:
        baseProfiles = profiles;
    }

    const query = search.trim().toLowerCase();
    if (!query) return baseProfiles;
    return baseProfiles.filter((profile) => {
      const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.toLowerCase();
      const email = (profile.email ?? "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [profiles, groupedProfiles, activeTab, search]);

  const handleUpdate = async (profileId: string, patch: Partial<Profile>) => {
    const { data, error } = await updateProfile(profileId, patch);
    if (error) {
      toast({ title: "Fehler", description: error.message || "Fehler beim Aktualisieren des Profils" });
      return;
    }
    if (data) {
      setProfiles((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      toast({ title: "Gespeichert", description: "Profil wurde aktualisiert." });
    } else {
      toast({ title: "Fehler", description: "Profil konnte nicht aktualisiert werden." });
    }
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
    await handleUpdate(editingProfile.id, {
      first_name: editForm.first_name || null,
      last_name: editForm.last_name || null,
      email: editForm.email || null,
      role: editForm.role,
      home_gym_id: editForm.home_gym_id || null,
      birth_date: editForm.birth_date || null,
      gender: (editForm.gender as "m" | "w") || null,
      league: (editForm.league as "toprope" | "lead") || null,
    });
    setEditingProfile(null);
  };

  const getRoleBadge = (role: Profile["role"]) => {
    switch (role) {
      case "league_admin":
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 border-purple-500/20">Liga-Admin</Badge>;
      case "gym_admin":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-500/20">Hallen-Admin</Badge>;
      default:
        return <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">Teilnehmer</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/90 shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
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
                Teilnehmer suchen und bearbeiten · {profiles.length} {profiles.length === 1 ? 'Person' : 'Personen'} gesamt
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Suche */}
      <Card className="p-4 md:p-6 border-2 border-border/60 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary flex-shrink-0" />
          <Label htmlFor="search" className="text-sm md:text-base font-semibold">Suche</Label>
        </div>
        <Input
          id="search"
          placeholder="Name oder E-Mail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="touch-manipulation"
        />
      </Card>

      {/* Tabs für Rollen-Gruppierung */}
      <Card className="p-4 md:p-6 border-2 border-border/60">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 md:gap-0 h-auto p-1.5 md:p-1">
            <TabsTrigger value="all" className="flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm px-3 md:px-3 py-3 md:py-1.5 min-h-[48px] md:min-h-0 touch-manipulation">
              <Users className="h-4 w-4 md:h-4 md:w-4 flex-shrink-0" />
              <span>Alle</span>
              <span className="hidden md:inline"> ({profiles.length})</span>
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm px-3 md:px-3 py-3 md:py-1.5 min-h-[48px] md:min-h-0 touch-manipulation">
              <User className="h-4 w-4 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Teilnehmer</span>
              <span className="sm:hidden">TN</span>
              <span className="hidden md:inline"> ({groupedProfiles.participants.length})</span>
            </TabsTrigger>
            <TabsTrigger value="gym_admins" className="flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm px-3 md:px-3 py-3 md:py-1.5 min-h-[48px] md:min-h-0 touch-manipulation">
              <Building2 className="h-4 w-4 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Hallen-Admins</span>
              <span className="sm:hidden">Hallen</span>
              <span className="hidden md:inline"> ({groupedProfiles.gymAdmins.length})</span>
            </TabsTrigger>
            <TabsTrigger value="league_admins" className="flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm px-3 md:px-3 py-3 md:py-1.5 min-h-[48px] md:min-h-0 touch-manipulation">
              <Shield className="h-4 w-4 md:h-4 md:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Liga-Admins</span>
              <span className="sm:hidden">Liga</span>
              <span className="hidden md:inline"> ({groupedProfiles.leagueAdmins.length})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {/* Teilnehmer-Liste */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">
            {search 
              ? `Suchergebnisse (${filtered.length})`
              : activeTab === "all"
              ? `Alle Personen (${filtered.length})`
              : activeTab === "participants"
              ? `Teilnehmer (${filtered.length})`
              : activeTab === "gym_admins"
              ? `Hallen-Admins (${filtered.length})`
              : `Liga-Admins (${filtered.length})`}
          </h2>
        </div>
        <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
          {filtered.map((profile) => (
            <Card key={profile.id} className="p-4 md:p-5 border-2 border-border/60 hover:border-primary/50 transition-all hover:shadow-lg space-y-3 md:space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <div className="font-semibold text-primary text-base md:text-lg break-words">
                      {profile.first_name ?? "-"} {profile.last_name ?? "-"}
                    </div>
                    {getRoleBadge(profile.role ?? "participant")}
                  </div>
                  <div className="text-sm text-muted-foreground break-words">{profile.email ?? "-"}</div>
                  {profile.home_gym_id && (
                    <div className="text-xs text-muted-foreground mt-1 break-words">
                      Heimat-Halle: {gyms.find((g) => g.id === profile.home_gym_id)?.name ?? "Unbekannt"}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(profile)}
                  className="h-9 w-9 p-0 flex-shrink-0 touch-manipulation"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                {profile.birth_date && (
                  <div>
                    <span className="text-muted-foreground">Geburtsdatum:</span>{" "}
                    <span className="font-medium">{new Date(profile.birth_date).toLocaleDateString("de-DE")}</span>
                  </div>
                )}
                {profile.gender && (
                  <div>
                    <span className="text-muted-foreground">Geschlecht:</span>{" "}
                    <span className="font-medium">{profile.gender === "m" ? "Männlich" : "Weiblich"}</span>
                  </div>
                )}
                {profile.league && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Liga:</span>{" "}
                    <span className="font-medium">{profile.league === "toprope" ? "Toprope" : "Vorstieg"}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
        {filtered.length === 0 && (
          <Card className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">
              {search ? "Keine Ergebnisse gefunden." : "Keine Personen in dieser Kategorie."}
            </p>
          </Card>
        )}
      </div>

      {/* Bearbeiten-Dialog */}
      <Dialog open={editingProfile !== null} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profil bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">Vorname</Label>
                <Input
                  id="edit-first-name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Nachname</Label>
                <Input
                  id="edit-last-name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-email">E-Mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Rolle</Label>
                <select
                  id="edit-role"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Profile["role"] })}
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
                  onChange={(e) => setEditForm({ ...editForm, home_gym_id: e.target.value })}
                >
                  <option value="">Keine Halle</option>
                  {gyms.map((gym) => (
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
                  onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gender">Geschlecht</Label>
                <select
                  id="edit-gender"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
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
                  onChange={(e) => setEditForm({ ...editForm, league: e.target.value })}
                >
                  <option value="">Nicht angegeben</option>
                  <option value="toprope">Toprope</option>
                  <option value="lead">Vorstieg</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditingProfile(null)} className="w-full sm:w-auto touch-manipulation">
              Abbrechen
            </Button>
            <Button onClick={handleSaveEdit} className="w-full sm:w-auto touch-manipulation">
              <span className="skew-x-6">Speichern</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeagueParticipants;
